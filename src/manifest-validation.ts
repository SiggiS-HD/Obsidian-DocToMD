import { isAbsolute, relative, resolve, sep } from "node:path";

import { CliResponse } from "./cli-protocol";

export interface ValidatedResultPaths {
  manifestPath: string;
  markdownPath: string;
}

export function validateResultPaths(
  response: CliResponse,
  outputDirectory: string,
  manifestContent: string
): ValidatedResultPaths {
  if (response.status === "error" || !response.result) {
    throw new Error("Ein technischer DocToMD-Fehler besitzt kein öffnungsfähiges Ergebnis.");
  }

  const manifestPath = resolveManifestPath(response, outputDirectory);

  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestContent);
  } catch {
    throw new Error("Das DocToMD-Manifest enthält kein gültiges JSON.");
  }
  if (!isRecord(manifest) || !isRecord(manifest.artifacts) || !isRecord(manifest.rag_indexing)) {
    throw new Error("Das DocToMD-Manifest entspricht nicht dem erwarteten Grundvertrag.");
  }

  const recommendedPath = manifest.rag_indexing.recommended_markdown_path;
  if (typeof recommendedPath !== "string") {
    throw new Error("Das DocToMD-Manifest enthält keine RAG-Indexempfehlung.");
  }
  const artifactPaths = collectMarkdownArtifacts(manifest.artifacts);
  if (!artifactPaths.includes(recommendedPath)) {
    throw new Error("Das empfohlene Markdown ist nicht als Manifestartefakt geführt.");
  }

  return {
    manifestPath,
    markdownPath: resolveInsideOutput(outputDirectory, recommendedPath, "Empfohlenes Markdown")
  };
}

export function resolveManifestPath(response: CliResponse, outputDirectory: string): string {
  if (response.status === "error" || !response.result) {
    throw new Error("Ein technischer DocToMD-Fehler besitzt kein öffnungsfähiges Ergebnis.");
  }
  const manifestRelativePath = response.result.manifest_path;
  if (typeof manifestRelativePath !== "string") {
    throw new Error("Die DocToMD-Antwort nennt keinen Manifestpfad.");
  }
  return resolveInsideOutput(outputDirectory, manifestRelativePath, "Manifestpfad");
}

function collectMarkdownArtifacts(artifacts: Record<string, unknown>): string[] {
  return [
    artifacts.markdown_path,
    artifacts.cloud_markdown_path,
    artifacts.vision_markdown_path
  ].filter((value): value is string => typeof value === "string");
}

function resolveInsideOutput(outputDirectory: string, relativePath: string, label: string): string {
  if (isAbsolute(relativePath)) {
    throw new Error(`${label} muss relativ zum Ausgabeordner sein.`);
  }
  const outputRoot = resolve(outputDirectory);
  const resolvedPath = resolve(outputRoot, relativePath);
  const relativePathToOutput = relative(outputRoot, resolvedPath);
  if (!relativePathToOutput || relativePathToOutput === ".." || relativePathToOutput.startsWith(`..${sep}`) || isAbsolute(relativePathToOutput)) {
    throw new Error(`${label} führt aus dem Ausgabeordner heraus.`);
  }
  return resolvedPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
