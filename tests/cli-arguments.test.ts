import { describe, expect, it } from "vitest";

import { buildCloudConversionCommand, buildCloudDeriveCommand, buildLocalConversionCommand } from "../src/cli-arguments";

describe("lokaler DocToMD-CLI-Aufruf", () => {
  it("übergibt ausschließlich den maschinenlesbaren lokalen Vertrag", () => {
    expect(
      buildLocalConversionCommand({
        pythonPath: "D:\\Python\\python.exe",
        doctomdEntrypoint: "C:\\Tools\\DocToMD\\main.py",
        pdfPath: "D:\\Eingang\\Bericht mit Leerzeichen.pdf",
        outputDirectory: "D:\\Vault\\_DocToMD\\Bericht mit Leerzeichen",
        conflictStrategy: "error"
      })
    ).toEqual({
      command: "D:\\Python\\python.exe",
      args: [
        "C:\\Tools\\DocToMD\\main.py",
        "convert",
        "D:\\Eingang\\Bericht mit Leerzeichen.pdf",
        "--output-dir",
        "D:\\Vault\\_DocToMD\\Bericht mit Leerzeichen",
        "--on-conflict",
        "error",
        "--json",
        "--progress",
        "jsonl"
      ]
    });
  });

  it("weist relative Programm- und Dokumentpfade zurück", () => {
    expect(() =>
      buildLocalConversionCommand({
        pythonPath: "python",
        doctomdEntrypoint: "C:\\Tools\\DocToMD\\main.py",
        pdfPath: "D:\\Eingang\\Bericht.pdf",
        outputDirectory: "D:\\Vault\\_DocToMD\\Bericht",
        conflictStrategy: "error"
      })
    ).toThrow("Python-Interpreter");
  });

  it("ergänzt den Cloud-Vertrag nur mit Modell und ausdrücklichem Modus", () => {
    const command = buildCloudConversionCommand({
      pythonPath: "D:\\Python\\python.exe",
      doctomdEntrypoint: "C:\\Tools\\DocToMD\\main.py",
      pdfPath: "D:\\Eingang\\Bericht.pdf",
      outputDirectory: "D:\\Vault\\_DocToMD\\Bericht",
      conflictStrategy: "overwrite",
      cloudDocumentModel: "gpt-5.6-terra"
    });

    expect(command.args).toEqual(expect.arrayContaining([
      "--cloud-document-mode", "openai", "--cloud-document-model", "gpt-5.6-terra"
    ]));
  });

  it("startet eine Wiederaufnahme direkt als cloud-derive ohne lokale Konvertierung", () => {
    expect(buildCloudDeriveCommand({
      pythonPath: "D:\\Python\\python.exe",
      doctomdEntrypoint: "C:\\Tools\\DocToMD\\main.py",
      pdfPath: "D:\\Eingang\\Bericht.pdf",
      outputDirectory: "D:\\Vault\\_DocToMD\\Bericht",
      conflictStrategy: "overwrite",
      cloudDocumentModel: "gpt-5.6-terra"
    }).args).toEqual([
      "C:\\Tools\\DocToMD\\main.py",
      "cloud-derive",
      "D:\\Eingang\\Bericht.pdf",
      "--output-dir",
      "D:\\Vault\\_DocToMD\\Bericht",
      "--on-conflict",
      "overwrite",
      "--cloud-document-model",
      "gpt-5.6-terra",
      "--json",
      "--progress",
      "jsonl"
    ]);
  });
});
