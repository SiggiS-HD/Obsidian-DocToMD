import { describe, expect, it } from "vitest";

import { resolveSelectedPdfPath } from "../src/pdf-selection";
import { knownSourceOutputFromManifest } from "../src/output-paths";

describe("PDF-Auswahl", () => {
  it("bevorzugt den direkten Electron-Dateipfad", () => {
    expect(resolveSelectedPdfPath({ name: "Bericht.pdf", path: "D:\\Eingang\\Bericht.pdf" }, () => undefined)).toBe("D:\\Eingang\\Bericht.pdf");
  });

  it("verwendet webUtils als Fallback für aktuelle Electron-Versionen", () => {
    expect(resolveSelectedPdfPath({ name: "Bericht.pdf" }, () => "D:\\Eingang\\Bericht.pdf")).toBe("D:\\Eingang\\Bericht.pdf");
  });

  it("weist Dateien ohne PDF-Endung zurück", () => {
    expect(resolveSelectedPdfPath({ name: "Bericht.docx" }, () => "D:\\Eingang\\Bericht.docx")).toBeNull();
  });
});

describe("bekannte Quellausgabe", () => {
  it("ordnet eine im Manifest belegte Quelle ihrem Ergebnisordner zu", () => {
    expect(
      knownSourceOutputFromManifest(
        "D:\\Vault\\_DocToMD\\Bericht-2",
        JSON.stringify({ source: { path: "D:\\Eingang\\Bericht.pdf" } })
      )
    ).toEqual({
      outputDirectory: "D:\\Vault\\_DocToMD\\Bericht-2",
      sourcePath: "D:\\Eingang\\Bericht.pdf"
    });
  });

  it("ignoriert unvollständige oder ungültige Manifeste", () => {
    expect(knownSourceOutputFromManifest("D:\\Vault\\_DocToMD\\Bericht", "{}")).toBeNull();
    expect(knownSourceOutputFromManifest("D:\\Vault\\_DocToMD\\Bericht", "kein JSON")).toBeNull();
  });
});
