# Build- und Release-Hinweis

## Voraussetzungen

- Node.js und `npm` in einer mit den gesperrten Abhängigkeiten kompatiblen Version.
- Eine Arbeitskopie ohne lokale Konvertierungsartefakte, Zugangsdaten oder PDFs.

## Prüfschritte

```powershell
npm ci
npm run check
npm test
npm run build
```

`npm ci` verwendet die versionierte `package-lock.json`. Der Produktionsbuild bündelt `src/main.ts` als minimierte CommonJS-Datei `main.js`; `obsidian`, `electron` und CodeMirror bleiben externe Obsidian-Laufzeitmodule.

## Auslieferungsinhalt

Eine installierbare Veröffentlichung enthält:

- `manifest.json`
- `main.js`
- `styles.css`, falls eine spätere Version sie ergänzt

Vor dem Taggen einer Version müssen Versionsnummern in `manifest.json`, `package.json` und `CHANGELOG.md` konsistent aktualisiert werden. Das eingecheckte `main.js` muss aus dem geprüften Quellstand erzeugt sein.

## Freigabegrenzen

Keine Original-PDFs, DocToMD-Ausgabeordner, `tmp/`, Caches, Benutzerpfade, API-Schlüssel oder andere Zugangsdaten veröffentlichen. Vor einer öffentlichen Veröffentlichung muss außerdem eine Lizenz ausgewählt und als Lizenzdatei ergänzt werden.
