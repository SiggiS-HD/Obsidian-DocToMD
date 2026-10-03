import { App, ButtonComponent, DropdownComponent, Modal, Setting, TextComponent } from "obsidian";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname } from "node:path";

import { ConflictStrategy, getOutputRoot, KnownSourceOutput, knownSourceOutputFromManifest, planOutputDirectory, validateOutputDirectory } from "./output-paths";
import { resolveSelectedPdfPath } from "./pdf-selection";

export interface ConversionDialogResult {
  conflictStrategy: ConflictStrategy;
  outputDirectory: string;
  pdfPath: string;
}

export interface ResultAction {
  label: string;
  onClick: () => void;
}

export function selectPdfPath(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", () => {
      const selectedFile = input.files?.[0];
      const selectedPath = selectedFile ? resolveSelectedPdfPath(selectedFile, getElectronFilePath) : null;
      input.remove();
      resolve(selectedPath);
    }, { once: true });
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    }, { once: true });
    input.click();
  });
}

function getElectronFilePath(file: File): string | undefined {
  const requireFromWindow = (window as Window & { require?: (name: string) => unknown }).require;
  const electron = requireFromWindow?.("electron") as { webUtils?: { getPathForFile(file: File): string } } | undefined;
  return electron?.webUtils?.getPathForFile(file);
}

export class ConversionDialog extends Modal {
  private conflictStrategy: ConflictStrategy = "error";
  private outputDirectory = "";
  private readonly outputRoot: string;
  private validationMessage = "";

  constructor(
    app: App,
    private readonly pdfPath: string,
    private readonly vaultRoot: string,
    outputSubdirectory: string,
    private readonly onConfirm: (result: ConversionDialogResult) => Promise<void>
  ) {
    super(app);
    this.outputRoot = getOutputRoot(vaultRoot, outputSubdirectory);
    this.outputDirectory = planOutputDirectory(
      vaultRoot,
      outputSubdirectory,
      pdfPath,
      new Set(existingDirectories(this.outputRoot)),
      knownSourceOutputs(this.outputRoot)
    ).outputDirectory;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "PDF mit DocToMD konvertieren" });
    contentEl.createEl("p", { text: `PDF: ${this.pdfPath}` });

    new Setting(contentEl)
      .setName("Ausgabeordner")
      .setDesc("Der Ordner liegt im Vault und bleibt vor dem Start editierbar.")
      .addText((text) => this.configureOutputText(text));

    new Setting(contentEl)
      .setName("Bestehende Ergebnisse")
      .setDesc("error verändert nichts; update und overwrite benötigen eine ausdrückliche Wahl.")
      .addDropdown((dropdown) => this.configureConflictDropdown(dropdown));

    const validationEl = contentEl.createDiv({ cls: "doctomd-validation" });
    const actions = contentEl.createDiv({ cls: "modal-button-container" });
    new ButtonComponent(actions).setButtonText("Abbrechen").onClick(() => this.close());
    new ButtonComponent(actions)
      .setButtonText("Konvertierung vorbereiten")
      .setCta()
      .onClick(() => {
        try {
          this.validate();
          void this.onConfirm({ pdfPath: this.pdfPath, outputDirectory: this.outputDirectory, conflictStrategy: this.conflictStrategy });
          this.close();
        } catch (error) {
          this.validationMessage = error instanceof Error ? error.message : "Der Ausgabeordner ist ungültig.";
          validationEl.setText(this.validationMessage);
        }
      });
  }

  private configureOutputText(text: TextComponent): TextComponent {
    return text.setValue(this.outputDirectory).onChange((value) => {
      this.outputDirectory = value.trim();
    });
  }

  private configureConflictDropdown(dropdown: DropdownComponent): DropdownComponent {
    return dropdown
      .addOption("error", "error – vorhandene Ergebnisse nicht ändern")
      .addOption("update", "update – nur für dieselbe belegte Quelle")
      .addOption("overwrite", "overwrite – Ergebnisse ausdrücklich ersetzen")
      .setValue(this.conflictStrategy)
      .onChange((value) => { this.conflictStrategy = value as ConflictStrategy; });
  }

  private validate(): void {
    const kind = existsSync(this.outputDirectory)
      ? hasConversionManifest(this.outputDirectory) ? "known-result" : "other"
      : "missing";
    validateOutputDirectory({
      vaultRoot: this.vaultRoot,
      outputRoot: this.outputRoot,
      outputDirectory: this.outputDirectory,
      existingDirectoryKind: kind,
      conflictStrategy: this.conflictStrategy
    });
  }
}

export class ConversionProgressModal extends Modal {
  private messageEl: HTMLElement | null = null;

  onOpen(): void {
    this.contentEl.createEl("h2", { text: "DocToMD konvertiert" });
    this.messageEl = this.contentEl.createEl("p", { text: "Bereite lokalen Lauf vor …" });
  }

  setMessage(message: string): void {
    this.messageEl?.setText(message);
  }
}

export class CloudConfirmationDialog extends Modal {
  constructor(
    app: App,
    private readonly request: ConversionDialogResult,
    private readonly modelId: string,
    private readonly onConfirm: (result: ConversionDialogResult) => Promise<void>,
    private readonly resume = false
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl("h2", { text: this.resume ? "Cloud-Lauf bewusst fortsetzen" : "Cloud-Konvertierung bewusst starten" });
    this.contentEl.createEl("p", { text: `PDF: ${this.request.pdfPath}` });
    this.contentEl.createEl("p", { text: `Modell: ${this.modelId}` });
    this.contentEl.createEl("p", {
      text: "DocToMD überträgt zur Rekonstruktion je nach Dokumentlänge eine oder mehrere kurzlebige Teil-PDFs an OpenAI. Der API-Schlüssel wird nur aus der lokalen Umgebung gelesen und weder vom Plugin abgefragt noch gespeichert."
    });
    this.contentEl.createEl("p", {
      text: "Im bestehenden Ausgabeordner werden abgeleitete Artefakte aktualisiert; die Original-PDF bleibt unverändert. Das Cloud-Derivat wird getrennt als .cloud.md angelegt."
    });
    if (this.resume) {
      this.contentEl.createEl("p", {
        text: "Bereits lokal validierte Cloud-Batches werden wiederverwendet. DocToMD fragt nur fehlende oder zuvor verworfene Batches erneut an."
      });
    }
    const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
    new ButtonComponent(actions).setButtonText("Abbrechen").onClick(() => this.close());
    new ButtonComponent(actions)
      .setButtonText(this.resume ? "Cloud-Lauf fortsetzen" : "Cloud-Lauf starten")
      .setWarning()
      .onClick(() => {
        void this.onConfirm(this.request);
        this.close();
      });
  }
}

export class ConversionResultModal extends Modal {
  private acknowledged = false;

  constructor(
    app: App,
    private readonly title: string,
    private readonly details: string[],
    private readonly closeButtonLabel = "Schließen",
    private readonly requiresAcknowledgement = false,
    private readonly action?: ResultAction
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl("h2", { text: this.title });
    for (const detail of this.details) {
      this.contentEl.createEl("p", { text: detail });
    }
    if (this.action) {
      new ButtonComponent(this.contentEl).setButtonText(this.action.label).onClick(this.action.onClick);
    }
    new ButtonComponent(this.contentEl).setButtonText(this.closeButtonLabel).setCta().onClick(() => {
      this.acknowledged = true;
      super.close();
    });
  }

  close(): void {
    if (!this.requiresAcknowledgement || this.acknowledged) {
      super.close();
    }
  }

  acknowledgeAndClose(): void {
    this.acknowledged = true;
    super.close();
  }
}

function existingDirectories(outputRoot: string): string[] {
  if (!existsSync(outputRoot)) {
    return [];
  }
  return readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${outputRoot}\\${entry.name}`);
}

function hasConversionManifest(directory: string): boolean {
  return existsSync(directory) && readdirSync(directory).some((name) => name.endsWith(".conversion.json"));
}

function knownSourceOutputs(outputRoot: string): KnownSourceOutput[] {
  return existingDirectories(outputRoot).flatMap((directory) => {
    const manifestName = readdirSync(directory).find((name) => name.endsWith(".conversion.json"));
    if (!manifestName) {
      return [];
    }
    try {
      const knownOutput = knownSourceOutputFromManifest(directory, readFileSync(`${directory}\\${manifestName}`, "utf8"));
      return knownOutput ? [knownOutput] : [];
    } catch {
      return [];
    }
  });
}
