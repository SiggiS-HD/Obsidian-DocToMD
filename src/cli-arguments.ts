import { isAbsolute } from "node:path";

import { ConflictStrategy } from "./output-paths";

export interface LocalConversionCommand {
  args: string[];
  command: string;
}

export interface LocalConversionInput {
  conflictStrategy: ConflictStrategy;
  doctomdEntrypoint: string;
  outputDirectory: string;
  pdfPath: string;
  pythonPath: string;
}

export interface CloudConversionInput extends LocalConversionInput {
  cloudDocumentModel: string;
}

export function buildLocalConversionCommand(input: LocalConversionInput): LocalConversionCommand {
  const pythonPath = requireAbsolute(input.pythonPath, "Der Python-Interpreter");
  const doctomdEntrypoint = requireAbsolute(input.doctomdEntrypoint, "Der DocToMD-Einstieg");
  const pdfPath = requireAbsolute(input.pdfPath, "Der PDF-Pfad");
  const outputDirectory = requireAbsolute(input.outputDirectory, "Der Ausgabeordner");

  return {
    command: pythonPath,
    args: [
      doctomdEntrypoint,
      "convert",
      pdfPath,
      "--output-dir",
      outputDirectory,
      "--on-conflict",
      input.conflictStrategy,
      "--json",
      "--progress",
      "jsonl"
    ]
  };
}

export function buildCloudConversionCommand(input: CloudConversionInput): LocalConversionCommand {
  const cloudDocumentModel = input.cloudDocumentModel.trim();
  if (!cloudDocumentModel) {
    throw new Error("Das Cloud-Dokumentmodell darf nicht leer sein.");
  }
  const localCommand = buildLocalConversionCommand(input);
  return {
    command: localCommand.command,
    args: [
      ...localCommand.args.slice(0, -3),
      "--cloud-document-mode",
      "openai",
      "--cloud-document-model",
      cloudDocumentModel,
      ...localCommand.args.slice(-3),
    ],
  };
}

/** Erstellt eine Cloud-Ableitung aus einer bereits lokal geprüften Basis. */
export function buildCloudDeriveCommand(input: CloudConversionInput): LocalConversionCommand {
  const pythonPath = requireAbsolute(input.pythonPath, "Der Python-Interpreter");
  const doctomdEntrypoint = requireAbsolute(input.doctomdEntrypoint, "Der DocToMD-Einstieg");
  const pdfPath = requireAbsolute(input.pdfPath, "Der PDF-Pfad");
  const outputDirectory = requireAbsolute(input.outputDirectory, "Der Ausgabeordner");
  const cloudDocumentModel = input.cloudDocumentModel.trim();
  if (!cloudDocumentModel) {
    throw new Error("Das Cloud-Dokumentmodell darf nicht leer sein.");
  }
  if (input.conflictStrategy !== "error" && input.conflictStrategy !== "overwrite") {
    throw new Error("cloud-derive unterstützt nur error oder overwrite als Konfliktstrategie.");
  }

  return {
    command: pythonPath,
    args: [
      doctomdEntrypoint,
      "cloud-derive",
      pdfPath,
      "--output-dir",
      outputDirectory,
      "--on-conflict",
      input.conflictStrategy,
      "--cloud-document-model",
      cloudDocumentModel,
      "--json",
      "--progress",
      "jsonl"
    ]
  };
}

function requireAbsolute(value: string, label: string): string {
  const trimmedValue = value.trim();
  if (!isAbsolute(trimmedValue)) {
    throw new Error(`${label} muss absolut sein.`);
  }
  return trimmedValue;
}
