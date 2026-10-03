import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  requireAbsolutePath,
  resolveDocToMDEntrypoint
} from "../src/settings";

describe("DocToMD-Einstellungen", () => {
  it("verwenden einen getrennten Vault-Unterordner als Standard", () => {
    expect(DEFAULT_SETTINGS.outputSubdirectory).toBe("_DocToMD");
    expect(DEFAULT_SETTINGS.pythonPath).toBe("");
    expect(DEFAULT_SETTINGS.doctomdPath).toBe("");
  });

  it("leitet den CLI-Einstieg aus einem absoluten Projektpfad ab", () => {
    expect(resolveDocToMDEntrypoint("C:\\Tools\\DocToMD")).toBe(
      "C:\\Tools\\DocToMD\\main.py"
    );
  });

  it("akzeptiert einen absoluten Einstiegspfad unverändert", () => {
    expect(resolveDocToMDEntrypoint("C:\\Tools\\DocToMD\\main.py")).toBe(
      "C:\\Tools\\DocToMD\\main.py"
    );
  });

  it("weist leere und relative absolute Einstellungen zurück", () => {
    expect(() => requireAbsolutePath("", "Python-Interpreter")).toThrow("darf nicht leer sein");
    expect(() => requireAbsolutePath("python", "Python-Interpreter")).toThrow("muss absolut sein");
    expect(() => resolveDocToMDEntrypoint("DocToMD")).toThrow("muss absolut sein");
  });
});
