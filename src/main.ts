import { Notice, Plugin, TFile, normalizePath } from "obsidian";
import { readFile } from "node:fs/promises";
import { relative, sep } from "node:path";

import { PLUGIN_ID } from "./plugin-info";
import { DEFAULT_SETTINGS, DocToMDSettings } from "./settings";
import { DocToMDSettingTab } from "./settings-tab";
import { buildCloudConversionCommand, buildCloudDeriveCommand, buildLocalConversionCommand } from "./cli-arguments";
import { CloudConfirmationDialog, ConversionDialog, ConversionDialogResult, ConversionProgressModal, ConversionResultModal, ResultAction, selectPdfPath } from "./conversion-dialog";
import { resolveManifestPath, validateResultPaths } from "./manifest-validation";
import { NodeProcessAdapter, executeConversion } from "./process-adapter";
import { requireAbsolutePath, resolveDocToMDEntrypoint } from "./settings";
import { buildResultDetails, requiresCloudFollowUp } from "./result-details";
import { CloudBatchProgressState, formatCloudBatchProgress, updateCloudBatchProgress } from "./cloud-batch-progress";
import { CloudResumeDetails, getCloudResumeDetails } from "./cloud-resume";

const CLOUD_DOCUMENT_MODEL = "gpt-5.6-terra";

export default class DocToMDPlugin extends Plugin {
  settings: DocToMDSettings = { ...DEFAULT_SETTINGS };
  private statusBarItem: HTMLElement | null = null;
  private activeConversionId = 0;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.statusBarItem = this.addStatusBarItem();
    this.clearStatus();
    this.addSettingTab(new DocToMDSettingTab(this.app, this));
    this.addCommand({
      id: "convert-pdf-with-doctomd",
      name: "PDF mit DocToMD konvertieren",
      callback: async () => {
        new Notice("DocToMD: PDF-Auswahl wird geöffnet …");
        console.info("doctomd: conversion command invoked");
        await this.openConversionDialog();
      }
    });
    console.debug(`${PLUGIN_ID}: Plugin-Grundgerüst geladen.`);
  }

  async updateSettings(settings: Partial<DocToMDSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.saveData(this.settings);
  }

  private async loadSettings(): Promise<void> {
    const savedSettings = await this.loadData() as Partial<DocToMDSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
  }

  private async openConversionDialog(): Promise<void> {
    try {
      const pdfPath = await selectPdfPath();
      if (!pdfPath) {
        new Notice("DocToMD: Keine verwendbare PDF ausgewählt.");
        console.warn("doctomd: no local PDF path returned by the file chooser");
        return;
      }
      console.info("doctomd: PDF selected", pdfPath);
      new ConversionDialog(this.app, pdfPath, getDesktopVaultPath(this.app.vault.adapter), this.settings.outputSubdirectory, (request) => this.runConversion(request)).open();
    } catch (error) {
      new Notice(error instanceof Error ? `DocToMD: ${error.message}` : "DocToMD: Der Konvertierungsdialog konnte nicht geöffnet werden.");
    }
  }

  private async runConversion(request: ConversionDialogResult, cloudDocumentModel?: string, resumeCloud = false): Promise<void> {
    const conversionId = ++this.activeConversionId;
    this.setStatus(resumeCloud ? "Cloud-Lauf wird fortgesetzt …" : cloudDocumentModel ? "Cloud-Konvertierung wird vorbereitet …" : "Lokale Konvertierung wird vorbereitet …");
    const progressModal = new ConversionProgressModal(this.app);
    progressModal.open();
    let cloudBatchProgress: CloudBatchProgressState = {};
    try {
      const commandInput = {
        pythonPath: requireAbsolutePath(this.settings.pythonPath, "Python-Interpreter"),
        doctomdEntrypoint: resolveDocToMDEntrypoint(this.settings.doctomdPath),
        pdfPath: request.pdfPath,
        outputDirectory: request.outputDirectory,
        conflictStrategy: cloudDocumentModel ? "overwrite" : request.conflictStrategy
      };
      const command = resumeCloud && cloudDocumentModel
        ? buildCloudDeriveCommand({ ...commandInput, cloudDocumentModel })
        : cloudDocumentModel
        ? buildCloudConversionCommand({ ...commandInput, cloudDocumentModel })
        : buildLocalConversionCommand(commandInput);
      const execution = await executeConversion(new NodeProcessAdapter(), command, {
        onProgress: (event) => {
          cloudBatchProgress = updateCloudBatchProgress(cloudBatchProgress, event);
          const message = formatCloudBatchProgress(event, cloudBatchProgress) ?? `${event.phase}: ${event.message}`;
          progressModal.setMessage(message);
          this.setStatus(message, conversionId);
        },
        onDiagnostic: (line) => {
          progressModal.setMessage(line);
          this.setStatus(line, conversionId);
        }
      });
      progressModal.close();

      if (execution.outcome.technicalFailure) {
        this.clearStatus(conversionId);
        const resumeDetails = cloudDocumentModel
          ? getCloudResumeDetails(execution.outcome.response, cloudBatchProgress.totalBatches)
          : null;
        if (resumeDetails) {
          this.showResumableCloudFailure(resumeDetails, request);
          return;
        }
        this.showResult("DocToMD-Fehler", [execution.outcome.response.error?.message ?? "Die Konvertierung ist fehlgeschlagen."]);
        return;
      }

      const manifestPath = resolveManifestPath(execution.outcome.response, request.outputDirectory);
      const manifestContent = await readFile(manifestPath, "utf8");
      const resultPaths = validateResultPaths(execution.outcome.response, request.outputDirectory, manifestContent);
      await this.openVaultMarkdown(resultPaths.markdownPath, getDesktopVaultPath(this.app.vault.adapter));
      const cloudFollowUp = !cloudDocumentModel && requiresCloudFollowUp(manifestContent);
      this.showConversionResult(
        execution.outcome.response.status === "warning" ? "DocToMD-Ergebnis mit Warnungen" : "DocToMD-Konvertierung abgeschlossen",
        buildResultDetails(manifestContent, execution.outcome.response.status),
        cloudFollowUp ? "Hinweis gelesen" : "Schließen",
        cloudFollowUp,
        request
      );
      this.clearStatus(conversionId);
    } catch (error) {
      progressModal.close();
      this.clearStatus(conversionId);
      this.showResult("DocToMD konnte nicht gestartet werden", [error instanceof Error ? error.message : "Unbekannter Fehler."]);
    }
  }

  private setStatus(message: string, conversionId?: number): void {
    if (conversionId !== undefined && conversionId !== this.activeConversionId) {
      return;
    }
    if (this.statusBarItem) {
      this.statusBarItem.textContent = `DocToMD: ${message}`;
    }
  }

  private clearStatus(conversionId?: number): void {
    if (conversionId !== undefined && conversionId !== this.activeConversionId) {
      return;
    }
    if (this.statusBarItem) {
      this.statusBarItem.textContent = "";
    }
  }

  private async openVaultMarkdown(absolutePath: string, vaultRoot: string): Promise<void> {
    const vaultRelativePath = relative(vaultRoot, absolutePath);
    if (!vaultRelativePath || vaultRelativePath === ".." || vaultRelativePath.startsWith(`..${sep}`)) {
      throw new Error("Das empfohlene Markdown liegt nicht im Vault.");
    }
    const file = this.app.vault.getAbstractFileByPath(normalizePath(vaultRelativePath));
    if (!(file instanceof TFile)) {
      throw new Error("Das empfohlene Markdown wurde nicht als Vault-Datei gefunden.");
    }
    await this.app.workspace.getLeaf(true).openFile(file);
  }

  private showResult(
    title: string,
    details: string[],
    closeButtonLabel = "Schließen",
    requiresAcknowledgement = false
  ): void {
    new ConversionResultModal(this.app, title, details, closeButtonLabel, requiresAcknowledgement).open();
  }

  private showConversionResult(
    title: string,
    details: string[],
    closeButtonLabel: string,
    requiresAcknowledgement: boolean,
    request: ConversionDialogResult
  ): void {
    let modal: ConversionResultModal;
    const action: ResultAction | undefined = requiresAcknowledgement ? {
      label: "Cloud-Konvertierung prüfen",
      onClick: () => {
        modal.acknowledgeAndClose();
        new CloudConfirmationDialog(
          this.app,
          request,
          CLOUD_DOCUMENT_MODEL,
          (confirmedRequest) => this.runConversion(confirmedRequest, CLOUD_DOCUMENT_MODEL)
        ).open();
      }
    } : undefined;
    modal = new ConversionResultModal(this.app, title, details, closeButtonLabel, requiresAcknowledgement, action);
    modal.open();
  }

  private showResumableCloudFailure(details: CloudResumeDetails, request: ConversionDialogResult): void {
    let modal: ConversionResultModal;
    modal = new ConversionResultModal(
      this.app,
      "Cloud-Ableitung angehalten",
      details.details,
      "Schließen",
      false,
      {
        label: "Cloud-Lauf fortsetzen",
        onClick: () => {
          modal.acknowledgeAndClose();
          new CloudConfirmationDialog(
            this.app,
            request,
            CLOUD_DOCUMENT_MODEL,
            (confirmedRequest) => this.runConversion(confirmedRequest, CLOUD_DOCUMENT_MODEL, true),
            true
          ).open();
        }
      }
    );
    modal.open();
  }
}

function getDesktopVaultPath(adapter: unknown): string {
  const basePath = (adapter as { basePath?: unknown }).basePath;
  if (typeof basePath !== "string") {
    throw new Error("DocToMD benötigt einen lokalen Desktop-Vault.");
  }
  return basePath;
}
