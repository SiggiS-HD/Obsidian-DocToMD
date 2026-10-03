/** Lesbare Darstellung des unveränderten Cloud-Batch-Fortschritts. */

import { CliProgressEvent } from "./cli-protocol";

export interface CloudBatchProgressState {
  totalBatches?: number;
}

const BATCH_TOTAL = /^(\d+) lokale Cloud-Batches werden verarbeitet\.$/;
const BATCH_ID = /Cloud-Batch batch-(\d+)-pages-(\d+)-(\d+)/;

export function updateCloudBatchProgress(state: CloudBatchProgressState, event: CliProgressEvent): CloudBatchProgressState {
  if (event.phase !== "cloud" || event.status !== "batching") {
    return state;
  }
  const match = BATCH_TOTAL.exec(event.message);
  return match ? { totalBatches: Number(match[1]) } : state;
}

export function formatCloudBatchProgress(event: CliProgressEvent, state: CloudBatchProgressState): string | null {
  if (event.phase !== "cloud") {
    return null;
  }
  const match = BATCH_ID.exec(event.message);
  if (!match) {
    return null;
  }
  const batchNumber = Number(match[1]);
  const batchLabel = state.totalBatches ? `${batchNumber} von ${state.totalBatches}` : String(batchNumber);
  return `Cloud-Verarbeitung: Batch ${batchLabel} · Seiten ${Number(match[2])}–${Number(match[3])} · ${batchStatus(event.status)}`;
}

function batchStatus(status: string): string {
  return {
    batch_starting: "wird gestartet …",
    batch_resuming: "wird ohne Neu-Upload fortgesetzt …",
    batch_reused: "wird lokal wiederverwendet.",
    queued: "wartet …",
    in_progress: "wird verarbeitet …",
    completed: "wird geprüft …"
  }[status] ?? "wird verarbeitet …";
}
