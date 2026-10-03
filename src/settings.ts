import { basename, isAbsolute, join } from "node:path";

export interface DocToMDSettings {
  pythonPath: string;
  doctomdPath: string;
  outputSubdirectory: string;
}

export const DEFAULT_SETTINGS: DocToMDSettings = {
  pythonPath: "",
  doctomdPath: "",
  outputSubdirectory: "_DocToMD"
};

export function resolveDocToMDEntrypoint(configuredPath: string): string {
  const trimmedPath = configuredPath.trim();

  if (!isAbsolute(trimmedPath)) {
    throw new Error("Der DocToMD-Pfad muss absolut sein.");
  }

  return basename(trimmedPath).toLowerCase() === "main.py"
    ? trimmedPath
    : join(trimmedPath, "main.py");
}

export function requireAbsolutePath(value: string, label: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${label} darf nicht leer sein.`);
  }

  if (!isAbsolute(trimmedValue)) {
    throw new Error(`${label} muss absolut sein.`);
  }

  return trimmedValue;
}
