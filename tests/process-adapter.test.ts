import { describe, expect, it } from "vitest";

import { LocalConversionCommand } from "../src/cli-arguments";
import { ProcessAdapter, executeConversion } from "../src/process-adapter";

const command: LocalConversionCommand = { command: "D:\\Python\\python.exe", args: ["main.py", "convert"] };
const successJson = JSON.stringify({ schema_version: "1.1", status: "success", exit_code: 0, result: { manifest_path: "Quelle.conversion.json" }, warnings: [], error: null });

class FakeProcessAdapter implements ProcessAdapter {
  constructor(private readonly exitCode: number, private readonly stdout: string) {}

  async run(_command: LocalConversionCommand, observer: Parameters<ProcessAdapter["run"]>[1]) {
    observer.onProgress({ schema_version: "1.0", event: "progress", phase: "extract", status: "started", message: "Extrahiere", elapsed_ms: 1 });
    observer.onDiagnostic("lokale Diagnose");
    return { exitCode: this.exitCode, stdout: this.stdout };
  }
}

describe("Prozessadapter", () => {
  it("wertet einen erfolgreichen, fortschrittsmeldenden Lauf ohne echten Prozess aus", async () => {
    const result = await executeConversion(new FakeProcessAdapter(0, successJson), command);
    expect(result.outcome.technicalFailure).toBe(false);
    expect(result.progress).toHaveLength(1);
    expect(result.diagnostics).toEqual(["lokale Diagnose"]);
  });

  it("erhält einen Warnlauf als fertiges Ergebnis", async () => {
    const warningJson = successJson.replace('"status":"success"', '"status":"warning"').replace('"exit_code":0', '"exit_code":1');
    const result = await executeConversion(new FakeProcessAdapter(1, warningJson), command);
    expect(result.outcome.response.status).toBe("warning");
    expect(result.outcome.technicalFailure).toBe(false);
  });

  it("macht einen technischen Fehlerprozess sichtbar", async () => {
    const errorJson = successJson.replace('"status":"success"', '"status":"error"').replace('"exit_code":0', '"exit_code":2').replace('"result":{"manifest_path":"Quelle.conversion.json"}', '"result":null');
    const result = await executeConversion(new FakeProcessAdapter(2, errorJson), command);
    expect(result.outcome.technicalFailure).toBe(true);
  });
});
