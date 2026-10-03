import { describe, expect, it } from "vitest";

import { buildResultDetails, CLOUD_FOLLOW_UP_HINT, requiresCloudFollowUp } from "../src/result-details";

describe("Abschlussdetails", () => {
  it("zeigt bei einem RAG-bereiten Ergebnis keinen Cloud-Hinweis", () => {
    const details = buildResultDetails(JSON.stringify({
      quality: { warnings: [] },
      rag_readiness: { status: "ready" }
    }), "success");

    expect(details).toEqual(["Keine CLI-Qualitätswarnung gemeldet."]);
    expect(requiresCloudFollowUp(JSON.stringify({ rag_readiness: { status: "ready", recommended_next_step: { kind: "none" } } }))).toBe(false);
  });

  it("fasst Warnungen nach Code vor dem RAG- und Cloud-Hinweis zusammen", () => {
    const details = buildResultDetails(JSON.stringify({
      quality: { warnings: [
        { code: "FORMULA_NOT_RECONSTRUCTED", page: { page_number: 3 } },
        { code: "FORMULA_NOT_RECONSTRUCTED", page: { page_number: 4 } },
        { code: "UNREADABLE_PDF_GLYPHS", page: { page_number: 4 } }
      ] },
      rag_readiness: {
        status: "local_not_suitable",
        recommended_next_step: { kind: "cloud_document", message: "Cloud-Lauf bewusst wählen." }
      }
    }), "warning");

    expect(details).toEqual([
      "3 Qualitätswarnung(en) prüfen.",
      "2 × FORMULA_NOT_RECONSTRUCTED",
      "1 × UNREADABLE_PDF_GLYPHS",
      "RAG-Eignung: local_not_suitable. Cloud-Lauf bewusst wählen.",
      CLOUD_FOLLOW_UP_HINT
    ]);
    expect(requiresCloudFollowUp(JSON.stringify({ rag_readiness: { suggested_next_steps: [{ kind: "cloud_document" }] } }))).toBe(true);
  });
});
