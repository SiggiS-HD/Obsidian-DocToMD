import { App, PluginSettingTab, Setting } from "obsidian";

import DocToMDPlugin from "./main";

export class DocToMDSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: DocToMDPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "DocToMD" });
    containerEl.createEl("p", {
      text: "Die Standardkonvertierung bleibt lokal. Zugangsdaten werden nicht gespeichert."
    });

    new Setting(containerEl)
      .setName("Python-Interpreter")
      .setDesc("Absoluter Pfad zu python.exe, mit dem DocToMD gestartet wird.")
      .addText((text) =>
        text
          .setPlaceholder("D:\\Python\\python.exe")
          .setValue(this.plugin.settings.pythonPath)
          .onChange(async (value) => this.plugin.updateSettings({ pythonPath: value.trim() }))
      );

    new Setting(containerEl)
      .setName("DocToMD-Projekt oder Einstieg")
      .setDesc("Absoluter Pfad zum DocToMD-Projektordner oder zu dessen main.py.")
      .addText((text) =>
        text
          .setPlaceholder("C:\\Tools\\DocToMD")
          .setValue(this.plugin.settings.doctomdPath)
          .onChange(async (value) => this.plugin.updateSettings({ doctomdPath: value.trim() }))
      );

    new Setting(containerEl)
      .setName("Vault-Ausgabeunterordner")
      .setDesc("Für jede PDF wird darin ein eigener DocToMD-Ausgabeordner angelegt.")
      .addText((text) =>
        text
          .setPlaceholder("_DocToMD")
          .setValue(this.plugin.settings.outputSubdirectory)
          .onChange(async (value) => this.plugin.updateSettings({ outputSubdirectory: value.trim() }))
      );
  }
}
