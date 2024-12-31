// --- Settings Tab ---
class PythonCommanderSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    let { containerEl } = this;
    containerEl.empty();

    // Python Executable setting
    new Setting(containerEl)
      .setName('Python Executable')
      .setDesc('Specify the path to your Python executable')
      .addText((text) =>
        text
          .setPlaceholder('python or full path to python executable')
          .setValue(this.plugin.settings.pythonExecutable)
          .onChange((value) => {
            this.plugin.settings.pythonExecutable = value;
            this.plugin.saveSettings();
          })
      );

    // Show/Hide Parameter Input Modal toggle
    new Setting(containerEl)
      .setName('Show Parameter Input Modal')
      .setDesc('Enable or disable the parameter input modal before running a script')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showModal)
          .onChange((value) => {
            this.plugin.settings.showModal = value;
            this.plugin.saveSettings();
          })
      );

    // Pass selected text as first argument toggle
    new Setting(containerEl)
      .setName('Pass Selected Text as First Argument')
      .setDesc('Enable or disable passing the selected text as the first argument to the Python script')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.passSelectedText)
          .onChange((value) => {
            this.plugin.settings.passSelectedText = value;
            this.plugin.saveSettings();
          })
      );
    // --- Settings Tab ---
    new Setting(containerEl)
      .setName('Show Output in Modal')
      .setDesc('Enable or disable showing the script output in a modal/pop up dialog')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.modal_out)
          .onChange((value) => {
            this.plugin.settings.modal_out = value;
            this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Write Output to Active Note')
      .setDesc('Enable or disable writing the script output to the active note at the cursor position')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.cursor_out)
          .onChange((value) => {
            this.plugin.settings.cursor_out = value;
            this.plugin.saveSettings();
          })
      );

    // Command Log toggle (new setting)
    new Setting(containerEl)
      .setName('Enable Console Log')
      .setDesc('Enable or disable logging of commands to the console')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.console_log)
          .onChange((value) => {
            this.plugin.settings.console_log = value;
            this.plugin.saveSettings();
          })
      );

    // Specify the note to write the output to
    new Setting(containerEl)
      .setName('Write Output to Specified Note')
      .setDesc('Enable or disable writing the script output to a specific note')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.note_out)
          .onChange((value) => {
            this.plugin.settings.note_out = value;
            this.plugin.saveSettings();
          })
      );
    // Specify the note to write the output to
    new Setting(containerEl)
      .setName('Output Note Name')
      .setDesc('Name of the note where the output will be written (if enabled)')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.outputNoteName)
          .onChange((value) => {
            this.plugin.settings.outputNoteName = value;
            this.plugin.saveSettings();
          })
      );


    // Manage Functions section (Removed the Refresh button)
    new Setting(containerEl)
      .setName('Manage Functions')
      .setDesc('Manage your saved Python functions');

    // Display current functions
    this.loadFunctionsAndDisplay(containerEl);
  }

  async loadFunctionsAndDisplay(containerEl) {
    const jsonFile = path.join(this.plugin.app.vault.adapter.basePath, '.obsidian/plugins/python-commander/functions.json');
    let functionsDict = {};

    if (fs.existsSync(jsonFile)) {
      const rawData = fs.readFileSync(jsonFile);
      functionsDict = JSON.parse(rawData);
    }

    // If there are no functions saved, show a message
    if (Object.keys(functionsDict).length === 0) {
      new Setting(containerEl).setName('No functions saved');
      return;
    }

    // List each function with a button to remove it
    Object.keys(functionsDict).forEach((functionName) => {
      new Setting(containerEl)
        .setName(functionName)
        .setDesc('Click to remove this function')
        .addButton((btn) => {
          btn.setButtonText('Remove').onClick(() => {
            this.removeFunction(functionName, functionsDict[functionName], containerEl);
          });
        });
    });
  }

  // Function to remove a function from the JSON and delete the script file
  removeFunction(functionName, scriptFilePath, containerEl) {
    const jsonFile = path.join(this.plugin.app.vault.adapter.basePath, '.obsidian/plugins/python-commander/functions.json');
    let functionsDict = {};

    if (fs.existsSync(jsonFile)) {
      const rawData = fs.readFileSync(jsonFile);
      functionsDict = JSON.parse(rawData);
    }

    // Remove the function from the functions.json dictionary
    delete functionsDict[functionName];

    // Delete the script file from the file system
    const functionFolder = path.dirname(scriptFilePath);
    if (fs.existsSync(scriptFilePath)) {
      fs.unlinkSync(scriptFilePath);
    }
    if (fs.existsSync(functionFolder) && fs.readdirSync(functionFolder).length === 0) {
      fs.rmdirSync(functionFolder);
    }

    // Unregister the command for the function (use `this.plugin.removeCommand`)
    this.plugin.removeCommand(`run-${functionName}`);

    // Update functions.json
    fs.writeFileSync(jsonFile, JSON.stringify(functionsDict, null, 2));

    // Refresh the display
    containerEl.empty();
    this.display();
    new Notice(`Function '${functionName}' has been removed.`);
  }
}
