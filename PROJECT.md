# Obsidian-Plugin: DocToMD

## Ziel

Das Desktop-only-Plugin macht die lokale DocToMD-PDF-zu-Markdown-Engine für Obsidian-Anwender bedienbar. Es lässt eine PDF auswählen, plant einen sicheren Vault-Ausgabeordner, startet die öffentliche CLI, zeigt Fortschritt und Qualitätsstatus an und öffnet anschließend genau das im Manifest empfohlene Markdown-Derivat.

## Architekturentscheidung

Das Plugin wird als TypeScript-Obsidian-Plugin mit dem offiziellen `obsidian`-API-Typvertrag und einem schlanken Node-basierten Prozessadapter umgesetzt. Der Plugin-Kern koordiniert Dialoge und Obsidian-Ansichten; reine Funktionen kapseln Pfadplanung, CLI-Argumente, JSON-/JSONL-Auswertung, Exit-Code-Behandlung und Manifestvalidierung. Der Prozessadapter erhält eine kleine Schnittstelle, damit alle Ergebnisfälle ohne echten Kindprozess getestet werden können.

Einstellungen speichern ausschließlich absolute Pfade zum Python-Interpreter und zu DocToMD (`main.py` oder Projektpfad, aus dem `main.py` eindeutig abgeleitet wird) sowie den Vault-Unterordner für Ausgaben. Zugangsdaten werden weder modelliert noch gespeichert. Node `child_process.spawn` startet die CLI mit einem Argumentarray statt einer Shell, damit Windows-Pfade und Sonderzeichen sicher behandelt werden.

Der Standarddialog startet ausschließlich einen lokalen Lauf. Ein späterer, separater Cloud-/Vision-Opt-in wird die dokumentierten CLI-Optionen erst nach einer je Lauf bestätigten Datenschutzhinweis weiterreichen; er gehört nicht zum lokalen MVP.

## Verantwortlichkeiten

| Komponente | Verantwortung |
| --- | --- |
| DocToMD | Extraktion, OCR, Vision/Cloud, Markdown, Assets, Manifest und Qualitätsbefunde |
| Dieses Plugin | Auswahl, Einstellungen, sichere Pfadplanung, Prozessstart, Fortschritt, Ergebnisanzeige und Öffnen des empfohlenen Derivats |
| RAG-/CodexCLI-Workflow | bewusste Indexierung des ausgewählten Derivats |

## Qualitäts- und Sicherheitsgrenzen

- Die Primär-PDF bleibt unverändert.
- Standardläufe sind lokal und netzwerkfrei.
- Exit-Code `1` ist ein fertiges Ergebnis mit Warnungen, kein Prozessfehler.
- `rag_readiness` wird angezeigt und kann nur eine Benutzerentscheidung vorschlagen.
- Das Manifest bleibt die maßgebliche Quelle für Artefakte und Qualitätsdetails; Dateinamenheuristiken sind kein Ersatz.

## Teststrategie

Unit-Tests prüfen die reinen Integrationsfunktionen und den Prozessadapter mit kontrollierten Ausgaben. Ein manueller End-to-End-Test verwendet die bereitgestellte, unkritische `simple-digital.pdf` in einem neuen temporären Ordner. Die Abnahme umfasst Erfolg, Warnung, Konfliktschutz, fehlendes Tesseract für Scan-OCR und die Verweigerung eines nicht bestätigten Cloud-Laufs.
