export type ConversionStatus = "success" | "warning" | "error";

export interface CliProgressEvent {
  elapsed_ms: number;
  event: "progress";
  message: string;
  phase: "prepare" | "extract" | "ocr" | "assets" | "structure" | "cloud" | "write";
  schema_version: string;
  status: string;
}

export interface CliResponse {
  error: { code?: string; message?: string } | null;
  exit_code: 0 | 1 | 2;
  result: Record<string, unknown> | null;
  schema_version: string;
  status: ConversionStatus;
  warnings: unknown[];
}

export interface ProcessOutcome {
  response: CliResponse;
  technicalFailure: boolean;
}

const STATUS_BY_EXIT_CODE: Record<CliResponse["exit_code"], ConversionStatus> = {
  0: "success",
  1: "warning",
  2: "error"
};

export function parseFinalResponse(stdout: string): CliResponse {
  let value: unknown;
  try {
    value = JSON.parse(stdout);
  } catch {
    throw new Error("DocToMD hat keinen gültigen finalen JSON-Envelope auf stdout ausgegeben.");
  }

  if (!isRecord(value) || typeof value.schema_version !== "string" || !isConversionStatus(value.status)) {
    throw new Error("Der finale DocToMD-Envelope entspricht nicht dem erwarteten Grundvertrag.");
  }
  if (value.exit_code !== 0 && value.exit_code !== 1 && value.exit_code !== 2) {
    throw new Error("Der finale DocToMD-Envelope enthält keinen gültigen Exit-Code.");
  }
  if (value.status !== STATUS_BY_EXIT_CODE[value.exit_code]) {
    throw new Error("Status und Exit-Code des DocToMD-Envelopes widersprechen sich.");
  }
  if (!Array.isArray(value.warnings)) {
    throw new Error("Der finale DocToMD-Envelope enthält kein gültiges Warnungsfeld.");
  }
  if (value.result !== null && !isRecord(value.result)) {
    throw new Error("Der finale DocToMD-Envelope enthält kein gültiges Ergebnisfeld.");
  }
  if (value.error !== null && !isRecord(value.error)) {
    throw new Error("Der finale DocToMD-Envelope enthält kein gültiges Fehlerfeld.");
  }

  return value as unknown as CliResponse;
}

export function parseProgressLine(stderrLine: string): CliProgressEvent | null {
  const trimmedLine = stderrLine.trim();
  if (!trimmedLine) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(trimmedLine);
    if (
      isRecord(value) &&
      value.event === "progress" &&
      typeof value.schema_version === "string" &&
      typeof value.phase === "string" &&
      typeof value.status === "string" &&
      typeof value.message === "string" &&
      typeof value.elapsed_ms === "number"
    ) {
      return value as unknown as CliProgressEvent;
    }
  } catch {
    // Freitext auf stderr ist Diagnose, kein Ergebnisprotokoll.
  }
  return null;
}

export function evaluateProcessOutcome(exitCode: number | null, stdout: string): ProcessOutcome {
  if (exitCode === null) {
    throw new Error("Der DocToMD-Prozess wurde ohne Exit-Code beendet.");
  }
  if (exitCode !== 0 && exitCode !== 1 && exitCode !== 2) {
    throw new Error(`DocToMD wurde mit einem unerwarteten Exit-Code beendet: ${exitCode}.`);
  }

  const response = parseFinalResponse(stdout);
  if (response.exit_code !== exitCode) {
    throw new Error("Der Prozess-Exit-Code widerspricht dem finalen DocToMD-Envelope.");
  }

  return { response, technicalFailure: exitCode === 2 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConversionStatus(value: unknown): value is ConversionStatus {
  return value === "success" || value === "warning" || value === "error";
}
