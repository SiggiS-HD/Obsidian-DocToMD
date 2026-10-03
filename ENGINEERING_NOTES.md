---
title: "Obsidian DocToMD – Engineering Notes"
type: engineering-notes
status: aktiv
created: 2026-09-22
updated: 2026-10-02
---

# Engineering Notes

Diese Note dokumentiert langlebige Architektur-, Schnittstellen- und Sicherheitsentscheidungen für das Obsidian-Plugin.

## 2026-09-22

### 01 – Öffentliche CLI als einzige Engine-Grenze

**Kontext:** DocToMD ist eine eigenständige Python-Engine; das Plugin soll sie bedienen, nicht ihre PDF- oder OCR-Logik duplizieren.

**Entscheidung:** Die Kopplung erfolgt ausschließlich über den öffentlichen CLI-Aufruf, `stdout`, `stderr` und das erzeugte Manifest. Das Plugin importiert keine internen Python-Module und DocToMD keine Plugin-Module.

**Auswirkung:** Der Prozessadapter behandelt `stdout` als einen finalen JSON-Envelope und `stderr` zeilenweise als JSONL-Fortschritt oder Diagnose. Manifest und Pfadgrenzen werden vor dem Öffnen eines Ergebnisses unabhängig validiert.

### 02 – Lokaler, getesteter Plugin-Kern

**Kontext:** Obsidian-UI und Kindprozesse sind schwer direkt zu testen, während die sicherheitskritische Integration determiniert prüfbar sein muss.

**Entscheidung:** TypeScript-Module für Pfadplanung, Argumentbildung, JSON-/JSONL-Parsing, Exit-Code-Auswertung und Manifestvalidierung bleiben frei von UI-Zustand. Ein schmaler Prozessadapter wird über eine Schnittstelle injizierbar.

**Auswirkung:** Erfolg, Warnung, Fehler, ungültiges JSON, fehlendes Manifest und ein Pfad außerhalb des Ausgabeordners werden ohne echten Prozess regressionsgesichert.

### 03 – Sicherheitsmodell für Ausgaben und Netzgrenzen

**Kontext:** Abgeleitete Artefakte dürfen Vault- und Primärdaten nicht gefährden; Cloud- und Vision-Modi übertragen potenziell vertrauliche Dokumentdaten.

**Entscheidung:** Der Dialog schlägt je Quelle einen eigenen neuen Ausgabeordner unter dem konfigurierten Vault-Unterordner vor und weist Vault-Stamm, `.obsidian` und allgemeine vorhandene Ordner zurück. Lokale CLI-Optionen sind der einzige MVP-Pfad. Cloud-/Vision-Optionen werden erst in einem gesonderten, je Lauf bestätigten Dialog ergänzt; API-Schlüssel werden nie erfasst, gespeichert oder geloggt.

**Auswirkung:** Das Plugin startet weder Cloud, Vision, OCR oder Indexierung selbsttätig als Reaktion auf Qualitätsbefunde.

### 04 – Reproduzierbares TypeScript-Grundgerüst

**Kontext:** Die sicherheitskritischen Integrationsfunktionen benötigen vor der Obsidian-UI eine kleine, lokal ausführbare Build- und Testbasis.

**Entscheidung:** Das Projekt bündelt `src/main.ts` mit esbuild als CommonJS-`main.js` und behandelt `obsidian`, `electron` sowie CodeMirror als externe Laufzeitmodule. TypeScript prüft im strikten Modus; Vitest führt isolierte Unit-Tests aus. Das Pluginmanifest ist als Desktop-only deklariert.

**Auswirkung:** `npm run check`, `npm test` und `npm run build` prüfen die Basis reproduzierbar. Das erste Bundle enthält absichtlich nur den Ladepfad; Einstellungen und Konvertierungslogik folgen in den nächsten Aufgaben.

### 05 – Geheimnisfreies Einstellungsmodell

**Kontext:** Das Plugin benötigt konfigurierbare, überprüfbare lokale Programmpfade, ohne Zugangsdaten oder implizite Arbeitsordner zu übernehmen.

**Entscheidung:** `DocToMDSettings` speichert nur Python-Pfad, DocToMD-Projekt- oder Einstiegspfad und Vault-Ausgabeunterordner. Leere oder relative Programmpfade werden abgewiesen; bei einem Projektpfad leitet das Modell deterministisch `main.py` ab.

**Auswirkung:** Der spätere Einstellungs-Tab kann dieselben Regeln anwenden. API-Schlüssel oder Cloud-Konfigurationswerte sind weder im Modell noch in den gespeicherten Standardwerten vorhanden.

### 06 – Konservative Vault-Ausgabeplanung

**Kontext:** Gleichnamige PDFs und frei editierbare Zielpfade dürfen weder vorhandene Notes noch Vault-Konfiguration gefährden.

**Entscheidung:** Neue Konvertierungen werden als direkte Unterordner des konfigurierten Ausgabeunterordners geplant. Bei Namenskollisionen folgt ein numerischer Suffix; eine bereits bekannte identische Quelle behält ihren bisherigen Ausgabeordner. Vault-Stamm, `.obsidian`, Pfadausbrüche und allgemeine vorhandene Ordner werden zurückgewiesen. Bestehende bekannte Ergebnisordner verlangen für `update` oder `overwrite` eine explizite Konfliktwahl.

**Auswirkung:** Der spätere Dialog kann den vorgeschlagenen Ordner zwar sichtbar machen, akzeptiert aber nur den abgesicherten Ausgabebereich. Die tatsächliche Manifestprüfung für die Gleichheit der Quelle folgt mit der Ergebnisverarbeitung.

### 07 – Maschineller CLI- und Prozessvertrag

**Kontext:** Windows-Pfade, Fortschrittsdiagnosen und Qualitätswarnungen müssen ohne Freitext-Scraping sicher zwischen Obsidian und DocToMD vermittelt werden.

**Entscheidung:** Der Plugin-Aufruf verwendet `spawn`-taugliche Argumentarrays mit absoluten Pfaden sowie verbindlich `--json --progress jsonl`. Die finale Antwort wird als ein JSON-Envelope validiert, `stderr` nur zeilenweise als JSONL-Fortschritt erkannt und übriger Text als Diagnose behandelt. Prozess-Exit-Code und Envelope müssen übereinstimmen.

**Auswirkung:** Exit-Code `1` erreicht die UI als fertiges Warn-Ergebnis und nicht als technischer Fehler. Ungültiges JSON, fehlende Exit-Codes und Vertragswidersprüche bleiben vor einer Manifestverarbeitung sichtbar abgewiesen.

### 08 – Manifestgesteuertes Öffnen

**Kontext:** Ein erfolgreicher Prozess darf nicht genügen, um eine anhand eines Dateinamens erratene Note im Vault zu öffnen.

**Entscheidung:** Für Ergebnisse mit Exit-Code `0` oder `1` wird der in der CLI-Antwort genannte relative Manifestpfad gegen den Ausgabeordner aufgelöst. Aus dem Manifest wird ausschließlich `rag_indexing.recommended_markdown_path` akzeptiert, wenn es ein geführtes lokales, Cloud- oder Vision-Markdownartefakt und ebenfalls innerhalb des Ausgabeordners ist.

**Auswirkung:** Pfadausbrüche, absolute Manifestpfade, fehlende RAG-Empfehlungen und nicht aufgeführte Derivate werden vor jeder UI-Öffnung gestoppt. Lokales und Cloud-Derivat können dadurch nicht versehentlich zugleich automatisch geöffnet werden.

### 09 – Injektierbarer Kindprozessadapter

**Kontext:** Der Prozessstart muss unter Windows sicher sein, aber Ergebnis- und Fehlerfälle dürfen nicht von einer installierten Python-Umgebung oder einer echten PDF abhängig sein.

**Entscheidung:** `NodeProcessAdapter` startet den konfigurierten Interpreter ohne Shell und mit verborgenem Fenster. Seine Schnittstelle ist austauschbar; die Ausführung sammelt `stdout`, verarbeitet `stderr` zeilenweise und liefert Fortschritt, Diagnosen und den validierten Ergebniszustand getrennt.

**Auswirkung:** Tests simulieren Erfolg, Warnung und technischen Fehler mit einem Fake-Adapter. Der spätere Obsidian-Befehl kann denselben Adapter verwenden, ohne Prozesslogik in die UI zu kopieren.

### 10 – Lokaler Obsidian-Einstiegspunkt

**Kontext:** Anwender benötigen einen sichtbaren Ort für die lokalen Programmpfade und einen eindeutigen Befehl, bevor ein Konvertierungsdialog hinzugefügt wird.

**Entscheidung:** Der Einstellungen-Tab speichert nur Python-Pfad, DocToMD-Projekt beziehungsweise `main.py` und Ausgabeunterordner über Obsidian-Daten. Der Befehl trägt die verbindliche Bezeichnung „PDF mit DocToMD konvertieren“; bis zur nächsten Aufgabe erklärt er transparent, dass die Dateiauswahl noch fehlt.

**Auswirkung:** Das Plugin bietet keine Cloud-Einstellung und keine Zugangsdatenfelder. Die kommende Dialogaufgabe ersetzt den vorläufigen Hinweis durch den tatsächlich abgesicherten lokalen Ablauf.

### 11 – Dialog vor dem lokalen Konvertierungslauf

**Kontext:** Der Ausgabeordner muss vor jedem Start sichtbar und änderbar sein, ohne die Vault-Schutzgrenzen zu lockern.

**Entscheidung:** Der Desktop-Dateidialog lässt nur PDFs wählen. Danach zeigt ein Obsidian-Modal die Quelle, den vorausgeplanten Ausgabeordner und die Konfliktwahl `error`, `update` oder `overwrite`. Der Zielpfad bleibt editierbar, muss jedoch weiterhin ein direkter Unterordner des konfigurierten Ausgabeordners sein. Der Vault-Pfad wird nur bei einem Desktop-Dateiadapter verwendet.

**Auswirkung:** Vault-Stamm, `.obsidian`, Pfadausbrüche und vorhandene allgemeine Ordner werden vor dem Prozessstart abgewiesen. Für gefundene DocToMD-Manifestordner bleibt `error` sicherer Standard; `update` und `overwrite` sind sichtbar gewählte Optionen.

### 12 – Lokaler Ablauf, Fortschritt und Ergebnisöffnung

**Kontext:** Ein Dialog allein genügt nicht; Anwender müssen den Kindprozess nachvollziehen und erhaltene Derivate sicher im Vault öffnen können.

**Entscheidung:** Der bestätigte Dialog erzeugt nur den lokalen CLI-Aufruf. Ein Fortschrittsmodal aktualisiert sich aus JSONL-Ereignissen und Diagnosen. Nach Exit-Code `0` oder `1` validiert das Plugin den Manifestpfad vor dem Lesen, zeigt Qualitätswarnungen einschließlich Seitenbezug sowie `rag_readiness` an und öffnet nur die manifestierte RAG-Empfehlung als Vault-Datei.

**Auswirkung:** Qualitätsbefunde können lediglich eine bewusste Folgeentscheidung nahelegen. Das Plugin startet weder Cloud/Vision noch OCR oder Indexierung als Reaktion auf einen Warnstatus; technische Fehler öffnen keine Note.

### 13 – Renderer-kompatible PDF-Auswahl und Vault-Ausgabeweg

**Kontext:** Der erste installierte Lauf öffnete keinen Dateidialog. Die Obsidian-Rendererumgebung stellt `@electron/remote` nicht zuverlässig bereit. Außerdem war ein vom Benutzer gewählter absoluter Ausgabeunterordner innerhalb des Vaults zu streng abgewiesen worden.

**Entscheidung:** Die PDF-Auswahl verwendet nun einen nativen HTML-Dateieingabedialog, dessen Electron-Dateiobjekt den lokalen Pfad bereitstellt. Ausgabeunterordner dürfen relativ zum Vault oder absolut angegeben werden; absolute Werte werden ausschließlich akzeptiert, wenn sie innerhalb desselben Vaults liegen. Fehler beim Öffnen des Dialogs werden als Obsidian-Notice sichtbar.

**Auswirkung:** Die aktivierte Installation kann PDFs ohne Renderer-Remote-Abhängigkeit auswählen. Ein Pfad außerhalb des Vaults, `.obsidian` oder der Vault-Stamm bleibt weiterhin ausgeschlossen.

### 14 – Abnahme der Prozess- und Manifestregressionen

**Kontext:** Die erste offene Abnahmeaufgabe verlangte Tests für Prozessadapter, ungültiges JSON, fehlende Manifeste und Pfadausbrüche.

**Entscheidung:** Die vorhandenen Unit-Tests decken genau diese Fälle ab: erfolgreiche und warnende Prozesse, technische Fehler, ungültige oder widersprüchliche JSON-Envelopes, fehlende Manifestreferenzen sowie Pfade außerhalb des Ausgabeordners.

**Auswirkung:** `npm test` bestätigt 29 Tests in acht Testdateien, `npm run check` ist fehlerfrei. Die Aufgabe ist damit nachvollziehbar abgeschlossen.

### 15 – Manueller CLI-End-to-End-Lauf

**Kontext:** Der Plugin-Vertrag muss mit einer realen PDF und einem neuen Ausgabeordner geprüft werden, unabhängig von den Unit-Tests.

**Entscheidung:** Die lokale DocToMD-CLI wurde mit `simple-digital.pdf`, absolutem Interpreter- und Einstiegspfad, `--json` und `--progress jsonl` in einem neuen Testausgabeordner gestartet.

**Auswirkung:** Der Lauf endete mit Exit-Code 0, genau einem finalen JSON-Envelope sowie einem lokalen Markdown und Manifest im Zielordner. Das Markdown enthält die erwarteten Seitenmarker und eine strukturierte Überschrift; die Primärquelle blieb unangetastet.

### 16 – Fehlerfall-Abnahme ohne Nebenwirkungen

**Kontext:** Neben dem Erfolgsweg müssen Konflikte, fehlende OCR-Systemvoraussetzungen und ein nicht vollständig konfigurierter Cloud-Lauf klar abgegrenzt bleiben.

**Entscheidung:** Ein erneuter Lauf mit `--on-conflict error` wurde am bestehenden Testderivat abgewiesen, ohne Artefakte zu überschreiben. Ein Cloud-Aufruf ohne Modell-ID wurde vor jeder Übertragung als JSON-Fehler abgewiesen. Die OCR-Regressionssuite prüft zudem den verständlichen Befund bei fehlendem Tesseract.

**Auswirkung:** Konflikt und abgelehnter Cloud-Lauf liefern jeweils Exit-Code 2 und ein maschinenlesbares Fehler-Envelope; `tests.test_ocr_extract` besteht mit neun Tests. Der lokale Erfolgsweg, die separate Warnbehandlung und die Sicherheit der Primärquelle bleiben davon unberührt.

### 17 – Spezifikation eines getrennten Cloud-Opt-ins

**Kontext:** Lokale Qualitätsgrenzen dürfen einen Cloud- oder Vision-Lauf weder implizit starten noch den Benutzer durch eine beiläufige Meldung zu einer Datenübertragung verleiten.

**Entscheidung:** Die lokale Abschlussmeldung darf auf einen möglichen Cloud-Mehrwert hinweisen, enthält aber keine Startaktion. Ein künftiger Cloud- oder Vision-Dialog zeigt vor jedem Lauf Quelle, Übertragungsumfang, Modell, Ziel eines getrennten Derivats und eine explizite Zustimmung. Ohne diese Zustimmung bleiben CLI-Argumente und Netzwerkzugriff vollständig lokal.

**Auswirkung:** Der Hinweis kann nach der Bestätigung eines lokalen Ergebnisses dauerhaft sichtbar bleiben, bis der Benutzer ihn bewusst schließt. Er speichert keine Zugangsdaten und verändert weder Quelle noch Derivate.

### 18 – Wiederverwendbarer Ergebnisordner pro PDF-Quelle

**Kontext:** Der Dialog sah nur den Dateibasisnamen und belegte bei jeder erneuten Auswahl derselben PDF einen neuen Ordner mit numerischem Suffix.

**Entscheidung:** Der Dialog liest ausschließlich vorhandene `*.conversion.json`-Manifeste direkter Ergebnisordner und gleicht deren `source.path` mit der ausgewählten absoluten PDF-Quelle ab. Bei Übereinstimmung wird dieser bestehende Ordner erneut vorgeschlagen. Ohne Treffer bleibt die bisherige kollisionssichere Suffixplanung erhalten.

**Auswirkung:** Wiederholte Läufe derselben Quelle erzeugen keinen neuen Unterordner mehr. Der Ordner enthält bereits ein Ergebnis und verlangt deshalb weiterhin die sichtbare Wahl `update` oder `overwrite`; eine vorhandene allgemeine Ordnerstruktur bleibt unzulässig. UI-freie Tests sichern die Manifestauswertung, insgesamt bestehen 31 Plugin-Tests.

### 19 – Persistenter Cloud-Folgehinweis ohne Netzwerkauslösung

**Kontext:** Nach einem lokalen Erfolg soll der Benutzer auf die mögliche Cloud-Rekonstruktion für komplexe Inhalte hingewiesen werden, ohne dass der Hinweis verschwindet oder selbst eine Datenübertragung startet.

**Entscheidung:** Die Ergebnisdetails erhalten nur dann als letzten Absatz einen Hinweis auf einen getrennt zu bestätigenden Cloud-Lauf, wenn das Manifest `cloud_document` als empfohlenen oder vorgeschlagenen Folgeschritt nennt. Dann bleibt das Abschlussmodal geöffnet, bis der Benutzer die CTA-Schaltfläche `Hinweis gelesen` wählt; Escape und ein Klick außerhalb schließen diese Abschlussmeldung nicht. Warnungen und RAG-Befunde erscheinen davor; die Meldung enthält keine Cloud-CLI-Option und keine Zugangsdaten.

**Auswirkung:** Der lokale Ablauf bleibt lokal. Der sichtbare Hinweis führt weder Cloud noch Vision aus und verändert keine Artefakte. Reine Detailtests sichern die Reihenfolge, einschließlich Warn- und RAG-Fällen; `npm test`, `npm run check` und `npm run build` bestehen mit 33 Tests.

### 20 – Zweistufiger Cloud-Dokumentlauf

**Kontext:** Ein lokaler Qualitätsbefund soll eine Cloud-Rekonstruktion ermöglichen, ohne die sichtbare Empfehlung selbst in eine Datenübertragung umzuwandeln.

**Entscheidung:** Nur bei einem im Manifest genannten Schritt `cloud_document` erhält das Ergebnisdialogfeld die Schaltfläche `Cloud-Konvertierung prüfen`. Sie öffnet einen zweiten Dialog mit PDF-Pfad, Modell `gpt-5.6-terra`, Upload-Hinweis, getrenntem `.cloud.md`-Derivat und dem Hinweis auf die Aktualisierung abgeleiteter Artefakte. Erst `Cloud-Lauf starten` erzeugt den öffentlichen CLI-Aufruf mit `--cloud-document-mode openai` und `--cloud-document-model gpt-5.6-terra`. Der Cloud-Lauf verwendet sichtbar `overwrite`, weil ein `update` bei unveränderter Quelle das bestehende lokale Ergebnis lediglich wiederverwenden würde.

**Auswirkung:** Weder die Abschlussmeldung noch der erste Prüf-Knopf übertragen Daten. Der API-Schlüssel bleibt ausschließlich Prozessumgebung von DocToMD und wird weder gelesen, gespeichert noch protokolliert. Nach Erfolg öffnet das Plugin ausschließlich das aus dem neuen Manifest empfohlene Derivat, typischerweise das Cloud-Markdown. Unit-Tests sichern den expliziten CLI-Vertrag; `npm test` (34 Tests), `npm run check` und `npm run build` bestehen. Das installierte Bundle stimmt mit dem Build-Artefakt überein.

### 21 – UTF-8-Fortschritt aus dem Windows-CLI-Prozess

**Kontext:** Im Fortschrittsdialog erschien das `ü` aus `OCR-Prüfung` als Ersatzzeichen. Der Plugin-Prozessadapter setzt seine beiden Datenströme bereits ausdrücklich auf UTF-8; die Ursache lag daher vor der Plugin-Grenze bei der Kodierung des gestarteten Pythonprozesses.

**Entscheidung:** DocToMD konfiguriert am CLI-Einstieg `stdout` und `stderr` auf UTF-8. Das Plugin behält seine bestehende UTF-8-Dekodierung unverändert bei und nimmt keine fehleranfällige Zeichenersetzung vor.

**Auswirkung:** JSONL-Fortschritt und der finale JSON-Envelope behalten deutsche Sonderzeichen bei. Ein realer Pipe-Test und `npm test` (34 Tests), Typprüfung sowie Build bestehen. Es werden weder Inhalte noch Zugangsdaten transformiert.

### 22 – Nicht-blockierender Konvertierungsstatus in der Obsidian-Statusleiste

**Kontext:** Das Fortschrittsmodal kann bei einem Wechsel zu einer anderen Obsidian-Ansicht in den Hintergrund geraten. Besonders ein längerer Cloud-Lauf wirkte dadurch bis zum Ergebnis dialoglos, obwohl die CLI weiterhin JSONL-Fortschritt meldete.

**Entscheidung:** Beim Laden legt das Plugin ein dauerhaftes Element in der Obsidian-Statusleiste an. Es zeigt zunächst `DocToMD: bereit`, dann vor und während eines Laufs die tatsächliche Phasen- oder Diagnosemeldung der CLI und schließlich einen eindeutigen Erfolgs- oder Fehlerstatus. Eine laufende Konvertierungs-ID verhindert, dass ein älterer, parallel endender Prozess den Status eines neueren Laufs überschreibt.

**Auswirkung:** Der Fortschritt bleibt ohne Modal und ohne Hintergrundprozess sichtbar. Die Statusleiste startet keine Aktion, verarbeitet keine Dokumentdaten selbst und verändert weder den CLI- noch den Manifestvertrag. `npm test` (34 Tests), `npm run check` und der Produktionsbuild bestehen.

### 23 – Statusleiste nur für aktive Konvertierungen belegen

**Kontext:** Die erste Statusleistenfassung ließ die Erfolgsmeldung nach dem Prozessende stehen. Neben der bereits vorhandenen Ergebnisrückmeldung wirkte das wie ein nicht abgeschlossener Hintergrundvorgang und belegte dauerhaft Platz in der Obsidian-Statusleiste.

**Entscheidung:** Das Statusleisten-Element ist im Ruhezustand leer. Es wird zu Beginn eines lokalen oder Cloud-Laufs gesetzt und beim erfolgreichen Ende, bei einem Warn-Ergebnis sowie bei einem technischen Fehler unmittelbar geleert. Die Konvertierungs-ID bleibt auch beim Leeren wirksam, damit ein älterer Lauf keinen neueren Status entfernt.

**Auswirkung:** Die Statusleiste zeigt ausschließlich laufenden Fortschritt. Den Abschluss vermittelt weiterhin der Ergebnisdialog. `npm test` (34 Tests), Typprüfung und Produktionsbuild bestehen.

### 24 – Batchgenauer Cloud-Hinweis und verdichtete Qualitätswarnungen

**Kontext:** Der bisherige Cloud-Bestätigungsdialog sprach von der vollständigen PDF. Für lange mathematische Dokumente plant DocToMD jedoch mehrere kurzlebige Teil-PDFs. Zudem erzeugte der Ergebnisdialog pro Qualitätswarnung eine eigene Zeile und wurde bei komplexen Dokumenten mit vielen gleichartigen Befunden unübersichtlich.

**Entscheidung:** Der Cloud-Hinweis beschreibt nun eine oder mehrere kurzlebige Teil-PDFs, ohne den expliziten Opt-in oder den Umgang mit dem API-Schlüssel zu ändern. Die Ergebnisdetails nennen weiterhin die Gesamtzahl der Warnungen, fassen danach aber gleiche Warncodes in deterministischer alphabetischer Reihenfolge als `Anzahl × WARNCODE` zusammen. Einzelne Seitenbezüge verbleiben im Manifest und in der von DocToMD automatisch erzeugten Konvertierungsbewertung.

**Auswirkung:** Der Nutzer erhält vor der Übertragung eine zutreffende Beschreibung des Batchpfads und nach Abschluss eine kompakte, handhabbare Qualitätsübersicht. Es werden weder zusätzliche Daten übertragen noch neue Folgeaktionen gestartet. TypeScript-Prüfung, 34 Vitest-Tests und der Produktionsbuild bestehen.

### 25 – Lesbarer Fortschritt für Cloud-Batches

**Kontext:** Die unveränderten JSONL-Fortschrittsmeldungen von DocToMD enthalten die technische Batch-ID wie `batch-003-pages-003-004`. Im Dialog ist daraus weder die Gesamtzahl noch der Seitenbereich unmittelbar lesbar.

**Entscheidung:** Das Plugin merkt sich aus dem Ereignis `cloud/batching` die Batchgesamtzahl und formatiert anschließende Cloud-Batchmeldungen ausschließlich in der Anzeige. Beispiel: `Cloud-Verarbeitung: Batch 3 von 72 · Seiten 3–4 · wird verarbeitet …`. Die Übersetzung erkennt auch Warteschlange, Wiederaufnahme und lokale Wiederverwendung; bei fehlender Gesamtzahl bleibt der technisch belegte Batchindex sichtbar. Der JSONL-Vertrag und die Prozesssteuerung bleiben unverändert.

**Auswirkung:** Lange Cloud-Läufe sind im Modal und in der Statusleiste nachvollziehbar, ohne den Fortschritts- oder Cloudvertrag zu verändern. Reine Unit-Tests sichern Gesamtzahl, Seitenbereich ohne führende Nullen und Statusdarstellung. TypeScript-Prüfung, 36 Vitest-Tests und Produktionsbuild bestehen.

## 2026-10-02

### 01 – Sichere Wiederaufnahme nach einem verworfenen Cloud-Batch

**Kontext:** Beim realen Lauf von `Mathe1.pdf` wurde Batch 039 für die Seiten 78–80 wegen `CLOUD_MARKDOWN_CONTENT_INCOMPLETE` verworfen. DocToMD bewahrt dafür validierte Batches, den Wiederaufnahmezustand und ein Diagnoseartefakt. Das Plugin zeigte den Fehler jedoch nur als endgültigen Abbruch und bot keine nächste Handlung an.

**Entscheidung:** Das Plugin erkennt ausschließlich den dokumentierten Fehlercode `CLOUD_MARKDOWN_CONTENT_INCOMPLETE` mit einer belegbaren Batch-ID. Es zeigt Batchnummer, bekannten Gesamtumfang und Seitenbereich, erklärt die erhaltenen validierten Batches und bietet `Cloud-Lauf fortsetzen` an. Diese Aktion öffnet erneut den Cloud-Bestätigungsdialog; erst dessen ausdrückliche Zustimmung startet den Lauf mit dem vorhandenen Wiederaufnahmezustand. Andere Cloud-Fehler erhalten keine Fortsetzungsaktion.

**Auswirkung:** Ein vorübergehend oder inhaltlich unvollständig beantworteter Batch zwingt den Benutzer nicht mehr zur Fehlersuche in technischen Artefakten. Die Quelle bleibt unverändert, bereits validierte Antworten werden nicht erneut übertragen und jede erneute Cloud-Anfrage bleibt sichtbar zustimmungspflichtig. Die Fortsetzung ruft direkt `cloud-derive` auf und überspringt dadurch garantiert die erneute lokale PDF-Analyse. Unit-Tests decken den passenden und einen abweichenden Fehlercode sowie den direkten Wiederaufnahmeaufruf ab; TypeScript-Prüfung, Vitest und Produktionsbuild bestehen.
