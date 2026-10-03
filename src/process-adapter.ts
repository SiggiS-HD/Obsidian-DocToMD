import { ChildProcess, spawn } from "node:child_process";

import { LocalConversionCommand } from "./cli-arguments";
import { CliProgressEvent, ProcessOutcome, evaluateProcessOutcome, parseProgressLine } from "./cli-protocol";

export interface CompletedChildProcess {
  exitCode: number | null;
  stdout: string;
}

export interface ProcessObserver {
  onDiagnostic(line: string): void;
  onProgress(event: CliProgressEvent): void;
}

export interface ProcessAdapter {
  run(command: LocalConversionCommand, observer: ProcessObserver): Promise<CompletedChildProcess>;
}

export interface ConversionExecution {
  diagnostics: string[];
  outcome: ProcessOutcome;
  progress: CliProgressEvent[];
}

export async function executeConversion(
  adapter: ProcessAdapter,
  command: LocalConversionCommand,
  liveObserver?: Partial<ProcessObserver>
): Promise<ConversionExecution> {
  const diagnostics: string[] = [];
  const progress: CliProgressEvent[] = [];
  const completed = await adapter.run(command, {
    onDiagnostic: (line) => {
      diagnostics.push(line);
      liveObserver?.onDiagnostic?.(line);
    },
    onProgress: (event) => {
      progress.push(event);
      liveObserver?.onProgress?.(event);
    }
  });

  return {
    diagnostics,
    progress,
    outcome: evaluateProcessOutcome(completed.exitCode, completed.stdout)
  };
}

export class NodeProcessAdapter implements ProcessAdapter {
  async run(command: LocalConversionCommand, observer: ProcessObserver): Promise<CompletedChildProcess> {
    return new Promise((resolveProcess, rejectProcess) => {
      const child = spawn(command.command, command.args, {
        shell: false,
        windowsHide: true
      });
      let stdout = "";
      let stderrBuffer = "";

      child.stdout?.setEncoding("utf8");
      child.stdout?.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr?.setEncoding("utf8");
      child.stderr?.on("data", (chunk: string) => {
        stderrBuffer += chunk;
        stderrBuffer = emitCompleteLines(stderrBuffer, observer);
      });
      child.once("error", rejectProcess);
      child.once("close", (exitCode) => {
        if (stderrBuffer.trim()) {
          emitLine(stderrBuffer, observer);
        }
        resolveProcess({ exitCode, stdout });
      });
    });
  }
}

function emitCompleteLines(buffer: string, observer: ProcessObserver): string {
  const lines = buffer.split(/\r?\n/);
  const incompleteLine = lines.pop() ?? "";
  for (const line of lines) {
    emitLine(line, observer);
  }
  return incompleteLine;
}

function emitLine(line: string, observer: ProcessObserver): void {
  const progressEvent = parseProgressLine(line);
  if (progressEvent) {
    observer.onProgress(progressEvent);
  } else if (line.trim()) {
    observer.onDiagnostic(line);
  }
}
