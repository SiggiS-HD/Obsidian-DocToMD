import { CliResponse } from "./cli-protocol";

export interface CloudResumeDetails {
  batchLabel: string;
  details: string[];
}

const INCOMPLETE_BATCH = /Cloud-Batch batch-(\d+)-pages-(\d+)-(\d+)/;

/**
 * Übersetzt ausschließlich den dokumentierten, sicher wiederaufnehmbaren
 * Batch-Validierungsfehler in eine konkrete Bedienhandlung.
 */
export function getCloudResumeDetails(response: CliResponse, totalBatches?: number): CloudResumeDetails | null {
  if (response.error?.code !== "CLOUD_MARKDOWN_CONTENT_INCOMPLETE") {
    return null;
  }
  const match = INCOMPLETE_BATCH.exec(response.error.message ?? "");
  if (!match) {
    return null;
  }

  const batchNumber = Number(match[1]);
  const firstPage = Number(match[2]);
  const lastPage = Number(match[3]);
  const batchLabel = totalBatches ? `Batch ${batchNumber} von ${totalBatches}` : `Batch ${batchNumber}`;
  const pageLabel = firstPage === lastPage ? `Seite ${firstPage}` : `Seiten ${firstPage}–${lastPage}`;

  return {
    batchLabel,
    details: [
      `Die Cloud-Ableitung wurde bei ${batchLabel} (${pageLabel}) sicher angehalten, weil die Antwort unvollständig war.`,
      "Bereits erfolgreich geprüfte Batches und der Wiederaufnahmezustand bleiben erhalten.",
      "Wähle „Cloud-Lauf fortsetzen“. DocToMD fragt nur fehlende oder verworfene Batches erneut an."
    ]
  };
}
