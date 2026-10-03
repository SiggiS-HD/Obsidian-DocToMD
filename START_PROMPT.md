# Start-Prompt: Obsidian-Plugin für DocToMD

Du implementierst ein separates Desktop-only-Obsidian-Plugin. Das Plugin bedient die bereits implementierte, lokale PDF-zu-Markdown-Engine DocToMD für Endanwender.

## Arbeitsauftrag

Erstelle ein wartbares Obsidian-Plugin in TypeScript, das eine PDF auswählt, DocToMD sicher als Kindprozess startet, Fortschritt und Qualitätsstatus anzeigt und anschließend das vom Manifest empfohlene Markdown-Derivat im Vault öffnet. Das Plugin soll die Engine bedienen, aber keine PDF-Extraktion, OCR, Markdown-Rekonstruktion, Bildanalyse oder RAG-Indexierung selbst implementieren.

Arbeite in kleinen, testbaren Phasen. Lege im Plugin-Projekt zuerst `AGENTS.md`, `PROJECT.md`, `TASKS.md` und eine technische Begleitnote an. Bearbeite immer nur die erste offene Aufgabe. Vor einer Implementierung nenne Plan, betroffene Dateien und erwartetes Ergebnis; sichere jede abgeschlossene Aufgabe mit angemessenen Tests oder einer nachvollziehbaren manuellen Prüfung ab.

## Verbindliche Projektgrenzen

- DocToMD und das Plugin kommunizieren ausschließlich über die öffentliche CLI, `stdout`, `stderr` und erzeugte Dateien beziehungsweise das Manifest. Keine gegenseitigen internen Python- oder TypeScript-Imports.
- Die PDF-Primärquelle wird nie überschrieben, gelöscht oder stillschweigend verschoben.
- Standardläufe bleiben lokal und netzwerkfrei. Cloud- oder Vision-Modi erfordern je Lauf eine sichtbare, ausdrückliche Einwilligung.
- Das Plugin speichert und protokolliert niemals `OPENAI_API_KEY`.
- Ein erfolgreicher Prozess mit Exit-Code `1` ist kein technischer Fehlschlag, sondern ein Ergebnis mit prüfpflichtigen Qualitätswarnungen.
- DocToMD erzeugt keinen RAG-Index. Eine mögliche CodexCLI-Übergabe bleibt getrennt und darf nicht automatisch ausgelöst werden.

## Zuerst lesen

Lies diese Dateien vollständig und behandle sie als Vertragsgrundlage:

1. [[PROJECT|Projektgrenzen und Verantwortlichkeiten]]
2. [[ENGINEERING_NOTES|Entwicklungsentscheidungen und Schnittstellenhistorie]]
3. [[TASKS|Aktueller Projektstatus]]
4. [[README|CLI-Übersicht, Fortschritt, OCR und Cloud-Modus]]
5. [[CLI_MANIFEST_EXAMPLE|Ausführbarer CLI- und Manifestvertrag]]
6. [[OBSIDIAN_VAULT_OUTPUT_CONVENTIONS|Vault-Ausgabeordner, Namen und Konflikte]]
7. [[INSTALLATION_AND_TROUBLESHOOTING|Installation und Fehlerdiagnosen]]
8. [[PRIVACY_LICENSE_DEPENDENCY_AUDIT|Datenschutz, Abhängigkeiten und Freigabegrenzen]]
9. [[PAGE_REFERENCE_CONTRACT|Seitenreferenzen, Tabellen und Bildassets]]
10. [[IMAGE_DESCRIPTION_WORKFLOW|Editierbare Bildbeschreibungen]]
11. [[RAG_READINESS|RAG-Eignung und Auswahl genau eines Derivats]] und [[RAG_INDEXING_RECOMMENDATION|Indexempfehlung]]
12. [[CODEXCLI_HANDOFF|Optionale, getrennte Übergabe an CodexCLI]]
13. [[STRUCTURE_QUALITY_RULES|Strukturgrenzen der erzeugten Notes]] und [[FORMULA_STRATEGY|Formelstrategie]]
14. [[VISION_PROPOSAL_SCHEMA|Providerneutrale Vision-Vorschläge]], falls die Plugin-Oberfläche Vision-Risiken oder Review-Artefakte anzeigen soll

## Technischer Mindestumfang des ersten MVP

1. Plugin-Einstellungen für absoluten Python-Interpreterpfad, absoluten DocToMD-Projekt- oder Einstiegspfad und einen konfigurierbaren Vault-Unterordner für Ausgaben; keine Zugangsdaten speichern.
2. Einen Obsidian-Befehl „PDF mit DocToMD konvertieren“ bereitstellen.
3. Einen Datei-Auswahldialog für eine PDF öffnen und vor dem Start den vorgeschlagenen Ausgabeordner `<Vault>/_DocToMD/<PDF-Basisname>/` sichtbar machen und editierbar halten.
4. Vault-Stamm, `.obsidian` und allgemeine bestehende Ordner als Ausgabeziel ablehnen. Bei gleichem PDF-Basisnamen unterschiedliche Zielordner wählen; vorhandene Ergebnisse nur über eine explizite Konfliktentscheidung `error`, `update` oder `overwrite` behandeln.
5. DocToMD mit absoluten Pfaden, `--json` und `--progress jsonl` als Kindprozess starten. `stdout` vollständig für genau einen finalen JSON-Envelope sammeln; `stderr` zeilenweise als JSONL-Fortschritt oder als Diagnose lesen. Kein Freitext-Scraping für Ergebnisdaten.
6. Exit-Code und JSON konsistent auswerten: `0` Erfolg, `1` Erfolg mit Qualitätswarnungen, `2` Fehler. Bei `0` und `1` die durch `result.manifest_path` bezeichnete Datei gegen den Ausgabeordner auflösen, innerhalb dieses Ordners halten und anschließend validieren.
7. Manifest lesen und nur `rag_indexing.recommended_markdown_path` öffnen, sofern der relative Pfad im Ausgabeordner liegt und als Artefakt geführt wird. Lokales und Cloud-Derivat derselben Quelle niemals gleichzeitig automatisch öffnen oder indexieren.
8. Qualitätsstatus, Warnungsanzahl und seitenbezogene Befunde sichtbar machen. Bei `rag_readiness.status` ungleich `ready` die empfohlene Folgeaktion ausschließlich als Benutzerentscheidung anbieten, niemals OCR, Vision, Cloud oder Indexierung selbsttätig starten.
9. Nach dem lokalen MVP einen separaten, klar beschrifteten Opt-in-Dialog für Cloud- oder Vision-Konfiguration planen. Der Dialog erklärt die Datenübertragung und reicht nur die dokumentierten CLI-Optionen weiter.

## Tests und Abnahme

- Unit-Tests für Pfadplanung, Ausgabeschutz, Argumentbildung, JSON-/JSONL-Parsing, Exit-Code-Behandlung und Manifestpfadvalidierung ergänzen.
- Einen Prozessadapter so kapseln, dass Erfolg, Warnung, Fehler, ungültiges JSON, fehlendes Manifest und ein aus dem Ausgabeordner führender Pfad ohne echten Prozess testbar sind.
- Einen manuellen End-to-End-Test gegen eine unkritische, nicht versionierte Test-PDF der lokalen DocToMD-Installation durchführen. Verwende dafür einen neuen, eindeutig temporären Ausgabeordner im Test-Vault oder außerhalb produktiver Vault-Daten.
- Prüfe mindestens: lokaler Erfolg, Ergebnis mit Warnung, Konflikt ohne Überschreiben, fehlendes Tesseract bei Scan-OCR sowie die Abweisung eines Cloud-Laufs ohne ausdrückliche Einwilligung.

## Nicht-Ziele des ersten MVP

- Kein RAG-Index, keine CodexCLI-Automatisierung und keine Suche.
- Kein eigener PDF- oder OCR-Parser.
- Kein stillschweiser Cloud-Upload, kein API-Key-Management und keine eigene Modelllogik.
- Kein Versuch, Manifestwarnungen als sachlich korrekte Rekonstruktion umzudeuten.

Beginne nach dem Lesen der Vertragsdokumente mit einer knappen Architekturentscheidung für TypeScript, Obsidian-Plugin-API, Prozessadapter, Einstellungsmodell und Teststrategie. Lege danach die priorisierte Aufgabenliste an und warte auf Freigabe, bevor du die erste Implementierungsaufgabe ausführst.
