import { describe, expect, it } from "vitest";

import { CliResponse } from "../src/cli-protocol";
import { getCloudResumeDetails } from "../src/cloud-resume";

function response(code: string, message: string): CliResponse {
  return {
    schema_version: "1.1",
    status: "error",
    exit_code: 2,
    result: null,
    warnings: [],
    error: { code, message }
  };
}

describe("wiederaufnehmbarer Cloud-Lauf", () => {
  it("macht einen verworfenen unvollständigen Batch mit Handlung sichtbar", () => {
    expect(getCloudResumeDetails(
      response(
        "CLOUD_MARKDOWN_CONTENT_INCOMPLETE",
        "Cloud-Batch batch-039-pages-078-080 ist im Vergleich zur lokalen Basis zu dünn: Seite 80: zu wenig Fließ- oder Listeninhalt"
      ),
      72
    )).toEqual({
      batchLabel: "Batch 39 von 72",
      details: [
        "Die Cloud-Ableitung wurde bei Batch 39 von 72 (Seiten 78–80) sicher angehalten, weil die Antwort unvollständig war.",
        "Bereits erfolgreich geprüfte Batches und der Wiederaufnahmezustand bleiben erhalten.",
        "Wähle „Cloud-Lauf fortsetzen“. DocToMD fragt nur fehlende oder verworfene Batches erneut an."
      ]
    });
  });

  it("bietet für andere Cloud-Fehler keine irreführende Fortsetzung an", () => {
    expect(getCloudResumeDetails(response("CLOUD_NATIVE_LINK_COVERAGE", "Links fehlen."), 72)).toBeNull();
  });
});
