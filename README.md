# DocToMD für Obsidian

Desktop-only-Plugin für Obsidian. Es startet die eigenständige DocToMD-CLI mit einem lokalen PDF, zeigt deren Fortschritt und Qualitätsstatus an und öffnet ausschließlich das im erzeugten Manifest empfohlene Markdown-Derivat.

## Sicherheitsmodell

- Das Plugin importiert keine internen Module von DocToMD. Die Integration erfolgt ausschließlich über dessen öffentliche CLI, JSON auf `stdout`, JSONL-Fortschritt oder Diagnosen auf `stderr` und das Manifest.
- Lokale Läufe verwenden absolute Pfade und starten ohne Shell. Die Original-PDF wird nicht verändert, gelöscht oder verschoben.
- Ausgabeordner liegen innerhalb des Vaults unter einem konfigurierten Unterordner, standardmäßig `_DocToMD`. Vault-Stamm, `.obsidian` und allgemeine bestehende Ordner sind keine zulässigen Ziele.
- Das Plugin speichert und protokolliert keinen API-Schlüssel. Cloud-Verarbeitung wird nur nach einem sichtbaren Opt-in pro Lauf gestartet.

## Installation

1. Erstelle im Vault den Ordner `.obsidian/plugins/doctomd/`.
2. Kopiere aus einer geprüften Veröffentlichung mindestens `manifest.json` und `main.js` in diesen Ordner. Eine `styles.css` ist derzeit nicht erforderlich.
3. Aktiviere **DocToMD** in Obsidian unter *Community Plugins*.
4. Öffne die Plugin-Einstellungen und hinterlege absolute Pfade zum Python-Interpreter sowie zum DocToMD-Projektordner oder dessen `main.py`.

DocToMD selbst wird nicht mitgeliefert. Seine CLI muss lokal installiert und mit dem eingetragenen Python-Interpreter ausführbar sein.

## Bedienung

Wähle den Befehl **PDF mit DocToMD konvertieren**. Nach der PDF-Auswahl zeigt das Plugin den geplanten Ausgabeordner an. Für vorhandene Ergebnisse ist eine bewusste Konfliktwahl nötig:

- `error` verändert nichts und ist die sichere Standardwahl.
- `update` ist nur für dieselbe nachweisbare Quelle vorgesehen.
- `overwrite` ersetzt abgeleitete Ergebnisse ausdrücklich; die Primär-PDF bleibt unverändert.

Bei Exit-Code `0` oder `1` liest das Plugin nur das von der CLI benannte Manifest. Es öffnet ausschließlich dessen als Artefakt geführtes `rag_indexing.recommended_markdown_path`. Exit-Code `1` ist ein fertiges Ergebnis mit Qualitätswarnungen; Exit-Code `2` ist ein Fehler.

## Cloud-Opt-in

Ein lokaler Lauf ist netzwerkfrei. Falls das Manifest eine Cloud-Ableitung empfiehlt, kann der Benutzer zuerst einen Hinweis prüfen und anschließend in einem zweiten Dialog zustimmen. Vor jedem Cloud-Lauf zeigt das Plugin Quelle, Modell, Übertragungsumfang in kurzlebigen Teil-PDFs und das getrennte Cloud-Derivat. Ohne diese Zustimmung werden keine Cloud-CLI-Optionen übergeben.

## Entwicklung und Release

Voraussetzung ist eine unterstützte Node.js-Version mit `npm`.

```powershell
npm ci
npm run check
npm test
npm run build
```

`npm run build` erzeugt das auslieferbare, minimierte `main.js`. Vor einem Release müssen die Prüfungen erfolgreich sein und `main.js` zusammen mit `manifest.json` aktualisiert werden. Details stehen in [RELEASE.md](RELEASE.md).

## Lizenz

Für dieses Repository ist noch keine Lizenz festgelegt. Vor einer öffentlichen Veröffentlichung muss der Rechteinhaber eine Lizenz auswählen und eine passende Lizenzdatei ergänzen.
