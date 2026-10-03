import { describe, expect, it } from "vitest";

import {
  getOutputRoot,
  planOutputDirectory,
  validateOutputDirectory
} from "../src/output-paths";

const VAULT = "D:\\Vault";
const OUTPUT_ROOT = "D:\\Vault\\_DocToMD";

describe("Ausgabeordnerplanung", () => {
  it("plant einen neuen Ordner unter dem konfigurierten Vault-Unterordner", () => {
    expect(planOutputDirectory(VAULT, "_DocToMD", "D:\\Eingang\\Bericht.pdf", new Set())).toEqual({
      outputDirectory: "D:\\Vault\\_DocToMD\\Bericht",
      reusedSourceDirectory: false
    });
  });

  it("vermeidet Kollisionen bei gleichem PDF-Basisnamen", () => {
    const existing = new Set(["D:\\Vault\\_DocToMD\\Bericht"]);
    expect(planOutputDirectory(VAULT, "_DocToMD", "D:\\Andere\\Bericht.pdf", existing)).toEqual({
      outputDirectory: "D:\\Vault\\_DocToMD\\Bericht-2",
      reusedSourceDirectory: false
    });
  });

  it("verwendet den bekannten Ordner derselben Quelle erneut", () => {
    const knownOutput = { sourcePath: "D:\\Eingang\\Bericht.pdf", outputDirectory: "D:\\Vault\\_DocToMD\\Bericht" };
    expect(
      planOutputDirectory(VAULT, "_DocToMD", knownOutput.sourcePath, new Set([knownOutput.outputDirectory]), [knownOutput])
    ).toEqual({ outputDirectory: knownOutput.outputDirectory, reusedSourceDirectory: true });
  });
});

describe("Ausgabeschutz", () => {
  it("weist Vault-Stamm, .obsidian und Pfadausbrüche zurück", () => {
    expect(() => getOutputRoot(VAULT, ".")).toThrow("innerhalb des Vaults");
    expect(() => getOutputRoot(VAULT, ".obsidian\\plugins")).toThrow(".obsidian");
    expect(() => getOutputRoot(VAULT, "..\\Ausgabe")).toThrow("innerhalb des Vaults");
  });

  it("akzeptiert einen absoluten Ausgabeunterordner nur innerhalb des Vaults", () => {
    expect(getOutputRoot(VAULT, "D:\\Vault\\Atlas\\_DocToMD")).toBe("D:\\Vault\\Atlas\\_DocToMD");
    expect(() => getOutputRoot(VAULT, "D:\\Andere\\_DocToMD")).toThrow("innerhalb des Vaults");
  });

  it("weist bestehende allgemeine Ordner zurück", () => {
    expect(() =>
      validateOutputDirectory({
        vaultRoot: VAULT,
        outputRoot: OUTPUT_ROOT,
        outputDirectory: "D:\\Vault\\_DocToMD\\ManuelleNotizen",
        existingDirectoryKind: "other",
        conflictStrategy: "error"
      })
    ).toThrow("allgemeiner Ordner");
  });

  it("verlangt bei einem bestehenden Ergebnis eine explizite Ersetzungsentscheidung", () => {
    const baseInput = {
      vaultRoot: VAULT,
      outputRoot: OUTPUT_ROOT,
      outputDirectory: "D:\\Vault\\_DocToMD\\Bericht",
      existingDirectoryKind: "known-result" as const
    };
    expect(() => validateOutputDirectory({ ...baseInput, conflictStrategy: "error" })).toThrow("Konfliktentscheidung");
    expect(() => validateOutputDirectory({ ...baseInput, conflictStrategy: "update" })).not.toThrow();
    expect(() => validateOutputDirectory({ ...baseInput, conflictStrategy: "overwrite" })).not.toThrow();
  });
});
