# Aufgabenliste: Obsidian-Plugin für DocToMD

## Regeln

- Nur die erste offene Aufgabe bearbeiten.
- Vor jeder Implementierung Plan, betroffene Dateien und erwartetes Ergebnis nennen.
- Nach der Prüfung die Aufgabe markieren und relevante dauerhafte Entscheidungen dokumentieren.

## Phase 1 – Projektgrundlage

- [x] Obsidian-TypeScript-Projektgrundgerüst, Build- und Testwerkzeuge einrichten
- [x] Plugin-Metadaten und minimalen Ladepfad erstellen

**Akzeptanz:** Das Plugin baut reproduzierbar; ein minimaler Testlauf ist möglich.

## Phase 2 – Sichere Integrationsdomäne

- [x] Einstellungsmodell für Python-Pfad, DocToMD-Einstieg und Vault-Ausgabeunterordner implementieren
- [x] Pfadplanung und Ausgabeschutz für Vault, `.obsidian`, allgemeine Ordner und gleichnamige PDFs implementieren
- [x] CLI-Argumentbildung für lokale Läufe mit absoluten Pfaden, `--json` und `--progress jsonl` implementieren
- [x] JSON-/JSONL-Parser sowie Exit-Code-Behandlung implementieren
- [x] Manifest- und empfohlenen-Derivat-Validierung innerhalb des Ausgabeordners implementieren

**Akzeptanz:** Alle reinen Funktionen sind mit Unit-Tests gegen gültige und unsichere Pfade, Antworten und Manifeste abgedeckt.

## Phase 3 – Prozess und Obsidian-UI

- [x] Injektierbaren Kindprozessadapter implementieren
- [x] Einstellungen-Tab und Befehl „PDF mit DocToMD konvertieren“ erstellen
- [x] PDF-Auswahl, editierbaren Ausgabedialog und explizite Konfliktentscheidung erstellen
- [x] Fortschritt, Qualitätsstatus und seitenbezogene Befunde anzeigen; empfohlenes Markdown sicher im Vault öffnen

**Akzeptanz:** Ein lokaler Lauf zeigt den tatsächlichen Prozessfortschritt und öffnet nur das manifestierte, empfohlene Derivat.

## Phase 4 – Abnahme und Opt-in-Planung

- [x] Unit-Tests für Prozessadapter, ungültiges JSON, fehlendes Manifest und Pfadausbruch ergänzen
- [x] Manuellen End-to-End-Test mit einer unkritischen lokalen DocToMD-Test-PDF in neuem Testausgabeordner durchführen
- [x] Erfolg, Warnung, Konflikt ohne Überschreiben, fehlendes Tesseract und abgelehnten Cloud-Lauf prüfen
- [x] Separaten Cloud-/Vision-Opt-in-Dialog als Folgephase spezifizieren

**Akzeptanz:** Die MVP-Abnahme ist nachvollziehbar dokumentiert; Cloud und Vision bleiben bis zur bewussten Folgefreigabe deaktiviert.

## Nachtrag nach Phase 4 – Reaktive Bedienungsstabilisierung

- [x] Gleichartige PDF-Quellen bei erneuter Auswahl deterministisch dem vorhandenen Ergebnisordner zuordnen
- [x] Abschlussmeldung mit persistentem Hinweis auf den getrennten Cloud-Opt-in ergänzen
- [x] Bewusst bestätigten Cloud-Dokumentlauf aus dem manifestierten Cloud-Hinweis starten
- [x] UTF-8-kodierte Fortschrittsmeldungen des CLI unter Windows fehlerfrei anzeigen
- [x] Nicht-blockierenden Konvertierungsfortschritt in der Obsidian-Statusleiste anzeigen
- [x] Statusleisten-Fortschritt nach Abschluss eines Laufs wieder ausblenden
- [x] Cloud-Datenschutzhinweis auf kurzlebige Teil-PDF-Batches präzisieren und Qualitätswarnungen im Ergebnisdialog nach Warncode zusammenfassen
- [x] Cloud-Batch-Fortschritt mit Batchnummer, Gesamtzahl, Originalseitenbereich und Status lesbar darstellen

## Nachtrag nach Phase 4 – Wiederaufnahme eines sicher angehaltenen Cloud-Laufs

- [x] Bei einer verworfenen, inhaltlich unvollständigen Cloud-Batch-Antwort die Fortsetzung mit präziser Benutzeranweisung und erneutem Opt-in anbieten
