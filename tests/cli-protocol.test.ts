import { describe, expect, it } from "vitest";

import { evaluateProcessOutcome, parseFinalResponse, parseProgressLine } from "../src/cli-protocol";

const successResponse = JSON.stringify({
  schema_version: "1.1",
  status: "success",
  exit_code: 0,
  result: { manifest_path: "Bericht.conversion.json" },
  warnings: [],
  error: null
});

describe("DocToMD-JSON-Vertrag", () => {
  it("akzeptiert genau einen gültigen finalen JSON-Envelope", () => {
    expect(parseFinalResponse(successResponse).status).toBe("success");
  });

  it("weist ungültiges JSON und widersprüchliche Statuswerte zurück", () => {
    expect(() => parseFinalResponse("nicht json")).toThrow("gültigen finalen JSON-Envelope");
    expect(() => parseFinalResponse(successResponse.replace('"exit_code":0', '"exit_code":1'))).toThrow("widersprechen");
  });

  it("liest JSONL-Fortschritt und ignoriert Diagnosetext", () => {
    expect(
      parseProgressLine('{"schema_version":"1.0","event":"progress","phase":"extract","status":"started","message":"Extrahiere","elapsed_ms":12}')
    ).toMatchObject({ phase: "extract", elapsed_ms: 12 });
    expect(parseProgressLine("warnung aus der Python-Laufzeit")).toBeNull();
  });
});

describe("DocToMD-Exit-Codes", () => {
  it("behandelt Exit-Code 1 als fertiges Ergebnis mit Warnung", () => {
    const warningResponse = successResponse
      .replace('"status":"success"', '"status":"warning"')
      .replace('"exit_code":0', '"exit_code":1');
    expect(evaluateProcessOutcome(1, warningResponse)).toMatchObject({ technicalFailure: false, response: { status: "warning" } });
  });

  it("behandelt Exit-Code 2 als technischen Fehler", () => {
    const errorResponse = successResponse
      .replace('"status":"success"', '"status":"error"')
      .replace('"exit_code":0', '"exit_code":2')
      .replace('"result":{"manifest_path":"Bericht.conversion.json"}', '"result":null')
      .replace('"error":null', '"error":{"code":"INPUT_ERROR","message":"Quelle fehlt"}');
    expect(evaluateProcessOutcome(2, errorResponse)).toMatchObject({ technicalFailure: true, response: { status: "error" } });
  });

  it("weist abweichende Prozess- und Envelope-Exit-Codes zurück", () => {
    expect(() => evaluateProcessOutcome(1, successResponse)).toThrow("widerspricht");
  });
});
