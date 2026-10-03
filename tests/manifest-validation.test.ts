import { describe, expect, it } from "vitest";

import { CliResponse } from "../src/cli-protocol";
import { resolveManifestPath, validateResultPaths } from "../src/manifest-validation";

const OUTPUT = "D:\\Vault\\_DocToMD\\Bericht";
const response: CliResponse = {
  schema_version: "1.1", status: "success", exit_code: 0, warnings: [], error: null,
  result: { manifest_path: "Bericht.conversion.json" }
};
const manifest = JSON.stringify({
  artifacts: { markdown_path: "Bericht.md", cloud_markdown_path: "Bericht.cloud.md" },
  rag_indexing: { recommended_markdown_path: "Bericht.cloud.md" }
});

describe("Manifestvalidierung", () => {
  it("löst ausschließlich manifestierte relative Ergebnisdateien im Ausgabeordner auf", () => {
    expect(validateResultPaths(response, OUTPUT, manifest)).toEqual({
      manifestPath: "D:\\Vault\\_DocToMD\\Bericht\\Bericht.conversion.json",
      markdownPath: "D:\\Vault\\_DocToMD\\Bericht\\Bericht.cloud.md"
    });
  });

  it("weist fehlende Manifeste, unbekannte Derivate und Pfadausbrüche zurück", () => {
    expect(() => validateResultPaths({ ...response, result: {} }, OUTPUT, manifest)).toThrow("keinen Manifestpfad");
    expect(() => validateResultPaths(response, OUTPUT, JSON.stringify({ artifacts: { markdown_path: "Bericht.md" }, rag_indexing: { recommended_markdown_path: "Andere.md" } }))).toThrow("nicht als Manifestartefakt");
    expect(() => validateResultPaths(response, OUTPUT, JSON.stringify({ artifacts: { markdown_path: "..\\Andere.md" }, rag_indexing: { recommended_markdown_path: "..\\Andere.md" } }))).toThrow("führt aus dem Ausgabeordner heraus");
  });

  it("weist einen aus dem Ausgabeordner führenden Manifestpfad vor dem Lesen zurück", () => {
    expect(() => resolveManifestPath({ ...response, result: { manifest_path: "..\\fremd.conversion.json" } }, OUTPUT)).toThrow("führt aus dem Ausgabeordner heraus");
  });
});
