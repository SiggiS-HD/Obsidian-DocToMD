import { describe, expect, it } from "vitest";

import { formatCloudBatchProgress, updateCloudBatchProgress } from "../src/cloud-batch-progress";
import { CliProgressEvent } from "../src/cli-protocol";

function event(status: string, message: string): CliProgressEvent {
  return { schema_version: "1.0", event: "progress", phase: "cloud", status, message, elapsed_ms: 0 };
}

describe("Cloud-Batch-Fortschritt", () => {
  it("zeigt Batchnummer, Gesamtzahl, Seitenbereich und Status verständlich an", () => {
    const state = updateCloudBatchProgress({}, event("batching", "72 lokale Cloud-Batches werden verarbeitet."));

    expect(formatCloudBatchProgress(
      event("in_progress", "Cloud-Batch batch-003-pages-003-004: in_progress."), state
    )).toBe("Cloud-Verarbeitung: Batch 3 von 72 · Seiten 3–4 · wird verarbeitet …");
  });

  it("verwendet ohne vorherigen Plan nur die bekannte Batchnummer", () => {
    expect(formatCloudBatchProgress(
      event("batch_reused", "Cloud-Batch batch-011-pages-021-022 wird lokal wiederverwendet."), {}
    )).toBe("Cloud-Verarbeitung: Batch 11 · Seiten 21–22 · wird lokal wiederverwendet.");
  });
});
