import { basename, isAbsolute, join, parse, relative, resolve, sep } from "node:path";

export type ConflictStrategy = "error" | "update" | "overwrite";

export interface KnownSourceOutput {
  outputDirectory: string;
  sourcePath: string;
}

export interface OutputDirectoryPlan {
  outputDirectory: string;
  reusedSourceDirectory: boolean;
}

export interface OutputDirectoryValidation {
  conflictStrategy: ConflictStrategy;
  existingDirectoryKind: "missing" | "known-result" | "other";
  outputDirectory: string;
  outputRoot: string;
  vaultRoot: string;
}

export function knownSourceOutputFromManifest(
  outputDirectory: string,
  manifestContent: string
): KnownSourceOutput | null {
  try {
    const manifest = JSON.parse(manifestContent) as { source?: { path?: unknown } };
    return typeof manifest.source?.path === "string"
      ? { outputDirectory, sourcePath: manifest.source.path }
      : null;
  } catch {
    return null;
  }
}

export function planOutputDirectory(
  vaultRoot: string,
  outputSubdirectory: string,
  sourcePdfPath: string,
  existingDirectories: ReadonlySet<string>,
  knownSourceOutputs: readonly KnownSourceOutput[] = []
): OutputDirectoryPlan {
  const normalizedVaultRoot = requireAbsolute(vaultRoot, "Der Vault-Stamm");
  const sourcePath = requireAbsolute(sourcePdfPath, "Der PDF-Pfad");
  const outputRoot = getOutputRoot(normalizedVaultRoot, outputSubdirectory);

  const existingSourceOutput = knownSourceOutputs.find(
    (entry) => samePath(entry.sourcePath, sourcePath)
  );
  if (existingSourceOutput) {
    assertImmediateOutputChild(outputRoot, existingSourceOutput.outputDirectory);
    return { outputDirectory: existingSourceOutput.outputDirectory, reusedSourceDirectory: true };
  }

  const sourceBaseName = parse(basename(sourcePath)).name;
  if (!sourceBaseName) {
    throw new Error("Der PDF-Dateiname enthält keinen verwendbaren Basisnamen.");
  }

  let ordinal = 1;
  while (true) {
    const directoryName = ordinal === 1 ? sourceBaseName : `${sourceBaseName}-${ordinal}`;
    const candidate = join(outputRoot, directoryName);
    if (![...existingDirectories].some((directory) => samePath(directory, candidate))) {
      return { outputDirectory: candidate, reusedSourceDirectory: false };
    }
    ordinal += 1;
  }
}

export function validateOutputDirectory(input: OutputDirectoryValidation): void {
  const vaultRoot = requireAbsolute(input.vaultRoot, "Der Vault-Stamm");
  const outputRoot = requireAbsolute(input.outputRoot, "Der Ausgabeunterordner");
  const outputDirectory = requireAbsolute(input.outputDirectory, "Der Ausgabeordner");

  if (!isPathWithin(vaultRoot, outputRoot) || samePath(vaultRoot, outputRoot)) {
    throw new Error("Der Ausgabeunterordner muss innerhalb des Vaults liegen.");
  }
  if (containsObsidianDirectory(outputDirectory, vaultRoot)) {
    throw new Error("Der Ausgabeordner darf nicht in .obsidian liegen.");
  }
  assertImmediateOutputChild(outputRoot, outputDirectory);

  if (input.existingDirectoryKind === "other") {
    throw new Error("Ein vorhandener allgemeiner Ordner ist kein zulässiges Ausgabeziel.");
  }
  if (input.existingDirectoryKind === "known-result" && input.conflictStrategy === "error") {
    throw new Error("Für vorhandene DocToMD-Ergebnisse ist eine explizite Konfliktentscheidung erforderlich.");
  }
}

export function getOutputRoot(vaultRoot: string, outputSubdirectory: string): string {
  const normalizedVaultRoot = requireAbsolute(vaultRoot, "Der Vault-Stamm");
  const trimmedSubdirectory = outputSubdirectory.trim();
  if (!trimmedSubdirectory) {
    throw new Error("Der Ausgabeunterordner darf nicht leer sein.");
  }

  const outputRoot = isAbsolute(trimmedSubdirectory)
    ? resolve(trimmedSubdirectory)
    : resolve(normalizedVaultRoot, trimmedSubdirectory);
  if (!isPathWithin(normalizedVaultRoot, outputRoot) || samePath(normalizedVaultRoot, outputRoot)) {
    throw new Error("Der Ausgabeunterordner muss innerhalb des Vaults liegen.");
  }
  if (containsObsidianDirectory(outputRoot, normalizedVaultRoot)) {
    throw new Error(".obsidian darf nicht als Ausgabeunterordner verwendet werden.");
  }
  return outputRoot;
}

function assertImmediateOutputChild(outputRoot: string, candidate: string): void {
  const relativePath = relative(resolve(outputRoot), resolve(candidate));
  if (!relativePath || relativePath.includes(sep) || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new Error("Der Ausgabeordner muss ein direkter Unterordner des konfigurierten Ausgabeunterordners sein.");
  }
}

function containsObsidianDirectory(path: string, vaultRoot: string): boolean {
  const relativePath = relative(resolve(vaultRoot), resolve(path));
  return relativePath.split(sep).some((segment) => segment.toLowerCase() === ".obsidian");
}

function isPathWithin(parent: string, candidate: string): boolean {
  const relativePath = relative(resolve(parent), resolve(candidate));
  return Boolean(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}

function requireAbsolute(path: string, label: string): string {
  const trimmedPath = path.trim();
  if (!isAbsolute(trimmedPath)) {
    throw new Error(`${label} muss absolut sein.`);
  }
  return resolve(trimmedPath);
}

function samePath(left: string, right: string): boolean {
  return resolve(left).toLocaleLowerCase() === resolve(right).toLocaleLowerCase();
}
