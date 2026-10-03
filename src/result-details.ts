export const CLOUD_FOLLOW_UP_HINT = "Optional: Für komplexe Formeln, Diagramme und Layouts kann anschließend ein getrennt bestätigter Cloud-Konvertierungslauf verwendet werden. Dieser lokale Lauf bleibt unverändert.";

export function buildResultDetails(manifestContent: string, status: string): string[] {
  const manifest = JSON.parse(manifestContent) as ResultManifest;
  const warnings = manifest.quality?.warnings ?? [];
  const details = [status === "warning" ? `${warnings.length} Qualitätswarnung(en) prüfen.` : "Keine CLI-Qualitätswarnung gemeldet."];
  const warningCounts = new Map<string, number>();
  for (const warning of warnings) {
    if (warning.code) {
      warningCounts.set(warning.code, (warningCounts.get(warning.code) ?? 0) + 1);
    }
  }
  for (const [code, count] of [...warningCounts.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    details.push(`${count} × ${code}`);
  }
  if (manifest.rag_readiness?.status && manifest.rag_readiness.status !== "ready") {
    details.push(`RAG-Eignung: ${manifest.rag_readiness.status}. ${manifest.rag_readiness.recommended_next_step?.message ?? "Weitere Schritte nur bewusst auswählen."}`);
  }
  if (hasCloudFollowUpInManifest(manifest)) {
    details.push(CLOUD_FOLLOW_UP_HINT);
  }
  return details;
}

interface ResultManifest extends CloudFollowUpManifest {
  quality?: { warnings?: Array<{ code?: string; page?: { page_number?: number } }> };
  rag_readiness?: {
    status?: string;
    recommended_next_step?: { kind?: unknown; message?: string };
    suggested_next_steps?: Array<{ kind?: unknown }>;
  };
}

export function requiresCloudFollowUp(manifestContent: string): boolean {
  try {
    return hasCloudFollowUpInManifest(JSON.parse(manifestContent) as CloudFollowUpManifest);
  } catch {
    return false;
  }
}

interface CloudFollowUpManifest {
  rag_readiness?: {
    recommended_next_step?: { kind?: unknown };
    suggested_next_steps?: Array<{ kind?: unknown }>;
  };
}

function hasCloudFollowUpInManifest(manifest: CloudFollowUpManifest): boolean {
  return manifest.rag_readiness?.recommended_next_step?.kind === "cloud_document"
    || manifest.rag_readiness?.suggested_next_steps?.some((step) => step.kind === "cloud_document") === true;
}
