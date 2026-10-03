# Arbeitsregeln für obsidian-doctomd

## Auftrag und Grenze

Dieses Repository enthält ein eigenständiges Desktop-only-Obsidian-Plugin. Es bedient DocToMD ausschließlich über dessen öffentliche CLI, `stdout`, `stderr` und die erzeugten Dateien beziehungsweise das Manifest. Interne Imports aus dem DocToMD-Quellbaum sind verboten.

Die PDF-Primärquelle wird nie überschrieben, gelöscht oder stillschweigend verschoben. Standardläufe sind lokal und netzwerkfrei. Cloud- oder Vision-Optionen benötigen bei jedem Lauf eine sichtbare ausdrückliche Einwilligung; das Plugin speichert oder protokolliert niemals `OPENAI_API_KEY`.

## Arbeitsweise

- Immer nur die erste offene Aufgabe in `TASKS.md` bearbeiten.
- Vor jeder Implementierung Plan, betroffene Dateien und erwartetes Ergebnis nennen.
- Änderungen klein halten und nur die für die Aufgabe erforderlichen Dateien anfassen.
- Eine Aufgabe erst nach angemessener automatischer Prüfung oder nachvollziehbarer manueller Kontrolle als erledigt markieren.
- Architektur- oder Schnittstellenentscheidungen mit Kontext, Entscheidung und Auswirkung in `ENGINEERING_NOTES.md` festhalten.

## Öffentlicher DocToMD-Vertrag

- Starte den konfigurierten Python-Interpreter mit absoluten Pfaden und `main.py convert INPUT --output-dir OUTPUT --on-conflict ... --json --progress jsonl`.
- Sammle `stdout` vollständig als genau einen finalen JSON-Envelope; behandle `stderr` zeilenweise als JSONL-Fortschritt oder Diagnose. Ergebnisdaten werden nie aus Freitext gewonnen.
- Exit-Code `0` bedeutet Erfolg, `1` Erfolg mit prüfpflichtigen Qualitätswarnungen und `2` Fehler.
- Bei `0` oder `1` darf nur die in `result.manifest_path` benannte Manifestdatei verwendet werden. Ihr aufgelöster Pfad und das empfohlene Markdown müssen innerhalb des gewählten Ausgabeordners liegen.
- Öffne ausschließlich `rag_indexing.recommended_markdown_path`, sofern es im Manifest als Artefakt geführt wird. Lokales und Cloud-Derivat derselben Quelle nie gleichzeitig automatisch öffnen oder indexieren.

## Vault- und Sicherheitsregeln

- Standardziel ist `<Vault>/_DocToMD/<PDF-Basisname>/`; der vollständige Zielpfad bleibt vor dem Start sichtbar und editierbar.
- Vault-Stamm, `.obsidian` und vorhandene allgemeine Ordner sind keine zulässigen Ausgabeziele.
- Für unterschiedliche Quellen mit gleichem PDF-Basisnamen werden unterschiedliche Zielordner geplant. Bestehende Ergebnisse werden nur nach der expliziten Wahl `error`, `update` oder `overwrite` behandelt.
- Das Plugin erstellt keinen RAG-Index, startet keine CodexCLI-Übergabe und löst weder OCR, Vision noch Cloud als Folge eines Qualitätsbefunds aus.
