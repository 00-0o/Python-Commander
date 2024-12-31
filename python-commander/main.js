const { Plugin, PluginSettingTab, Setting, Modal, Notice } = require('obsidian');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// --- Parameter Input Modal ---
class ParameterInputModal extends Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Enter Python Script Parameters' });
    this.inputEl = contentEl.createEl('input', {
      type: 'text',
      placeholder: 'e.g., arg1 arg2 --flag'
    });

    const submitBtn = contentEl.createEl('button', { text: 'Run Script' });
    submitBtn.onclick = () => {
      const params = this.inputEl.value.trim();
      this.close();
      this.onSubmit(params);
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

//-----------------------------------------------

// --- Output Display Modal ---
class OutputModal extends Modal {
  constructor(app, output) {
    super(app);
    this.output = output;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Python Script Output' });
    contentEl.createEl('pre', { text: this.output });
  }

  onClose() {
    this.contentEl.empty();
  }
}

//-----------------------------------------------

// --- Command Name Input Modal ---
class CommandNameInputModal extends Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Enter Command Name' });
    this.inputEl = contentEl.createEl('input', {
      type: 'text',
      placeholder: 'Enter a unique command name'
    });

    const submitBtn = contentEl.createEl('button', { text: 'Save Command' });
    submitBtn.onclick = () => {
      const commandName = this.inputEl.value.trim();
      this.close();
      this.onSubmit(commandName);
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

//-----------------------------------------------

// --- Plugin Class ---
class PythonCommander extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'python-commander',
      name: 'Make Python Command',
      editorCallback: (editor) => {
        this.saveTextAsPythonCommand(editor);
      }
    });

    this.loadFunctions();
    this.addSettingTab(new PythonCommanderSettingTab(this.app, this));

    // NEW Command: Run Selected Python Text
    this.addCommand({
      id: 'run-selected-python-text',
      name: 'Run Selected Text',
      editorCallback: (editor) => {
        this.runSelectedText(editor);
      }
    });

    this.loadFunctions();
    this.addSettingTab(new PythonCommanderSettingTab(this.app, this));
  }

  //-----------------------------------------------

  // --- SaveTextAsPythonCommand ---
  saveTextAsPythonCommand(editor) {
    const selectedText = editor.getSelection();
    if (!selectedText.trim()) {
      new Notice('No text selected');
      return;
    }

    // Open the command name input modal
    new CommandNameInputModal(this.app, (commandName) => {
      if (!commandName) {
        new Notice('Command name is required');
        return;
      }

      // Use the folder path from settings
      const scriptsDir = this.settings.pythonScriptFolder
      const functionFolder = path.join(scriptsDir, `.${commandName}`);
      const scriptFile = path.join(functionFolder, `${commandName}.py`);

      fs.mkdirSync(functionFolder, { recursive: true });
      fs.writeFileSync(scriptFile, selectedText);

      const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'python-commander','functions.json');
      let functionsDict = {};

      if (fs.existsSync(jsonFile)) {
        const rawData = fs.readFileSync(jsonFile);
        functionsDict = JSON.parse(rawData);
      }

      if (functionsDict[commandName]) {
        new Notice(`Command '${commandName}' already exists. Choose a unique name.`);
        return;
      }

      functionsDict[commandName] = scriptFile;
      fs.writeFileSync(jsonFile, JSON.stringify(functionsDict, null, 2));

      this.addCommand({
        id: `run-${commandName}`,
        name: `Run ${commandName}`,
        callback: () => {
          this.promptForParameters(scriptFile);
        }
      });

      new Notice(`Python script '${commandName}.py' saved and added to the functions dictionary.`);
    }).open();
  }


  //-----------------------------------------------

  // --- Modified promptForParameters ---
  promptForParameters(scriptFile) {
    const selectedText = this.app.workspace.activeLeaf.view.sourceMode
      ? this.app.workspace.activeLeaf.view.editor.getSelection()
      : '';

    if (!this.settings.showModal && !this.settings.passSelectedText) {
      // Case 1: Modal is disabled and passSelectedText is false, run without arguments
      this.runPythonScript(scriptFile);
    } else if (!this.settings.showModal && this.settings.passSelectedText && selectedText.trim()) {
      // Case 2: Modal is disabled but passSelectedText is true, pass selected text as argument
      this.runPythonScript(scriptFile, [selectedText]);
    } else if (this.settings.showModal && !this.settings.passSelectedText) {
      // Case 3: Modal is enabled but passSelectedText is false, get arguments from the modal
      new ParameterInputModal(this.app, (params) => {
        const splitParams = this.checkAndSplitParams(params);
        this.runPythonScript(scriptFile, splitParams);
      }).open();
    } else if (this.settings.showModal && this.settings.passSelectedText && selectedText.trim()) {
      // Case 4: Modal is enabled and passSelectedText is true, pass selected text first then other arguments
      new ParameterInputModal(this.app, (params) => {
        const splitParams = this.checkAndSplitParams(params);
        this.runPythonScript(scriptFile, [selectedText, ...splitParams]);
      }).open();
    }
  }

  //-----------------------------------------------

  // --- Function to check if the parameter is surrounded by quotes, and split if not ---
  checkAndSplitParams(params) {
    params = params.trim();
    if ((params.startsWith('"') && params.endsWith('"')) || (params.startsWith("'") && params.endsWith("'"))) {
      return [params];
    } else {
      return this.splitParams(params);
    }
  }

  //-----------------------------------------------

  // --- Function to split parameters by commas (excluding quoted parameters) ---
  splitParams(params) {
    const regex = /"([^"]*)"|'([^']*)'|[^,]+/g;
    const matches = [];
    let match;
    while ((match = regex.exec(params)) !== null) {
      matches.push(match[1] || match[2] || match[0].trim());
    }
    return matches;
  }

  //-----------------------------------------------

  // --- Modified runPythonScript function with extended output handling ---
  runPythonScript(scriptFile, params = []) {
    const pythonExecutable = this.settings.pythonExecutable;
    if (!fs.existsSync(pythonExecutable)) {
      new Notice('Invalid Python executable path in settings.');
      return;
    }

    const command = [pythonExecutable, scriptFile, ...params];
    console.log(`Executing command: ${command.join(' ')}`);

    exec(command.join(' '), (error, stdout, stderr) => {
      let output = '';
      if (error) {
        output += `Error: ${error.message}\n`;
      }
      if (stderr) {
        output += `stderr: ${stderr}\n`;
      }
      if (stdout) {
        output += `${stdout}\n`;
      }

      // Log to console if command_log is true
      if (this.settings.console_log) {
        console.log(output); // Log the output to the console
      }

      // Handle different output modes based on settings
      if (this.settings.modal_out) {
        new OutputModal(this.app, output).open(); // Show in OutputModal
      }

      if (this.settings.cursor_out) {
        this.writeOutputToActiveNote(output); // Write to active note at cursor position
      }

      if (this.settings.note_out) {
        this.writeOutputToSpecifiedNote(output); // Write to a user-specified note
      }
    });
  }

  //-----------------------------------------------

  runSelectedText(editor) {
    const selectedText = editor.getSelection();
    if (!selectedText.trim()) {
      new Notice('No text selected');
      return;
    }

    const pythonExecutable = this.settings.pythonExecutable;
    if (!fs.existsSync(pythonExecutable)) {
      new Notice('Invalid Python executable path in settings.');
      return;
    }

    // Escape double quotes for safe command execution
    const escapedText = selectedText.replace(/"/g, '\\"');

    // Log the final command being executed
    console.log(`Executing command: ${pythonExecutable} -c "${escapedText}"`);

    // Execute Python code directly
    exec(`${pythonExecutable} -c "${escapedText}"`, (error, stdout, stderr) => {
      let output = '';

      if (error) {
        output += `Error: ${error.message}\n`;
      }
      if (stderr) {
        output += `stderr: ${stderr}\n`;
      }
      if (stdout) {
        output += `${stdout}\n`;
      }

      // Log the output to the console (regardless of command_log setting)
      console.log(output);

      // Only log to console if command_log is enabled (if you want additional logging control)
      if (this.settings.command_log) {
        console.log('Command log enabled, output logged to console');
      }

      // Handle output modes
      if (this.settings.modal_out) {
        new OutputModal(this.app, output).open();
      }

      if (this.settings.cursor_out) {
        this.writeOutputToActiveNote(output);
      }

      if (this.settings.note_out) {
        this.writeOutputToSpecifiedNote(output);
      }

      // Show notice for quick feedback
      new Notice('Python script executed. Check output in selected mode.');
    });
  }

  //-----------------------------------------------

  // --- Function to write output to the active note ---
  writeOutputToActiveNote(output) {
    const activeLeaf = this.app.workspace.activeLeaf;
    const editor = activeLeaf.view.sourceMode ? activeLeaf.view.editor : null;

    if (editor) {
      const currentContent = editor.getValue();
      const updatedContent = currentContent + output;
      editor.setValue(updatedContent);
      new Notice('Python script output has been written to the active note.');
    } else {
      new Notice('No active note found to write the output.');
    }
  }

  //-----------------------------------------------

  writeOutputToSpecifiedNote(output) {
    const noteName = this.settings.outputNoteName;
    const filePath = path.join(this.app.vault.adapter.basePath, noteName); // Resolves the full path using basePath

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const updatedContent = fileContent + output;
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      new Notice(`Python script output has been written to '${noteName}'.`);
    } else {
      new Notice(`Note '${noteName}' does not exist.`);
    }
  }

  //-----------------------------------------------

  loadFunctions() {

  const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'python-commander','functions.json');
  if (fs.existsSync(jsonFile)) {
    const rawData = fs.readFileSync(jsonFile);
    const functionsDict = JSON.parse(rawData);

    Object.keys(functionsDict).forEach((functionName) => {
      this.addCommand({
        id: `run-${functionName}`,
        name: `Run ${functionName}`,
        callback: () => {
          this.promptForParameters(functionsDict[functionName]);
        }
      });
    });
  }
}


  //-----------------------------------------------

    async loadSettings() {
    const vaultPath = this.app.vault.adapter.basePath; // Get the current vault path
    const defaultSettings = {
      pythonExecutable: 'python',
      useModal: false,
      showModal: false,
      passSelectedText: false,
      modal_out: true,
      cursor_out: true,
      outputNoteName: `${vaultPath}/Python Console.md`,
      note_out: false,
      console_log: true,
      pythonScriptFolder: `${vaultPath}/scripts/python` // Default scripts folder
    };

    try {
      const data = await this.loadData();

      if (!data || Object.keys(data).length === 0) {
        console.warn('Settings file is missing or empty. Creating a new one with default values.');
        this.settings = defaultSettings;
        await this.saveData(this.settings); // Create the file with default values
      } else {
        // Merge default settings with existing ones (to handle future additions)
        this.settings = { ...defaultSettings, ...data };
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      this.settings = defaultSettings; // Fallback to defaults on error
      await this.saveData(this.settings); // Ensure file is created
    }
  }


  //-----------------------------------------------

  saveSettings() {
    this.saveData(this.settings);
  }

  //-----------------------------------------------

  onunload() {
    console.log('Unloading Python Commander plugin');
  }

}

//-----------------------------------------------
const { dialog } = require('electron').remote; // Require Electron's dialog module

// --- Settings Tab ---
class PythonCommanderSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    let { containerEl } = this;
    containerEl.empty();

    // Python Executable setting with Browse button
    // Python Executable setting with Browse button
    new Setting(containerEl)
      .setName('Python Executable')
      .setDesc('Specify the path to your Python executable')
      .addText((text) =>
        text
          .setPlaceholder('python or full path to python executable')
          .setValue(this.plugin.settings.pythonExecutable || "python")
          .onChange((value) => {
            this.plugin.settings.pythonExecutable = value;
            this.plugin.saveSettings();
          })
      )
      .addButton((button) => {
        button.setButtonText('Browse').onClick(() => {
          // Open the file picker dialog to select the Python executable
          this.openFilePickerForPythonExecutable(containerEl);
        });
      });

    // Select the Python script folder (with browse button)
    new Setting(containerEl)
      .setName('Select Script Folder')
      .setDesc('Choose the folder where Python scripts are stored')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.pythonScriptFolder || '')  // Show current folder path
          .onChange((value) => {
            this.plugin.settings.pythonScriptFolder = value;  // Save updated folder path
            this.plugin.saveSettings();
          })
      )
      .addButton((button) => {
        button.setButtonText('Browse').onClick(() => {
          // Open the folder picker dialog to select the script folder
          this.openFolderPickerForScript();
        });
      });

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

    // Show Output in Modal toggle
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

    // Write Output to Active Note toggle
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

    new Setting(containerEl)
      .setName('Select Output Note')
      .setDesc('Choose the markdown file where the output will be written')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.outputNoteName)  // Este valor debe estar actualizado
          .onChange((value) => {
            this.plugin.settings.outputNoteName = value;
            this.plugin.saveSettings();
          })
      )
      .addButton((button) => {
        button.setButtonText('Browse').onClick(() => {
          // Pasar containerEl a la función para actualizar el campo
          this.openFilePickerForOutputNote(containerEl);
        });
      });

    // Manage Functions section
    new Setting(containerEl)
      .setName('Manage Functions')
      .setDesc('Manage your saved Python functions');

    // Display current functions
    this.loadFunctionsAndDisplay(containerEl);
  }
    // Open file dialog to select a Python executable
    async openFilePickerForPythonExecutable(containerEl) {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          this.plugin.settings.pythonExecutable = filePath;
          await this.plugin.saveSettings();
          new Notice(`Python executable set to: ${filePath}`);

          // Update the text field after saving the setting
          const textInput = containerEl.querySelector('input[type="text"]');
          if (textInput) {
            textInput.value = filePath; // Update the text field directly
          }
        }
      } catch (err) {
        console.error('Error opening file picker:', err);
        new Notice('Error opening file picker: ' + err.message);
      }
    }

    // Open folder dialog to select the Python script folder
    async openFolderPickerForScript() {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],  // Open directory dialog
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const folderPath = result.filePaths[0];
          this.plugin.settings.pythonScriptFolder = folderPath;
          await this.plugin.saveSettings();

          new Notice(`Python script folder set to: ${folderPath}`);

          // After saving, we refresh the settings UI to show the new path
          this.display(); // Ensure the settings UI is updated with the new folder path
        }
      } catch (err) {
        console.error('Error opening folder picker:', err);
        new Notice('Error opening folder picker: ' + err.message);
      }
    }
    // Open file dialog to select the output Note.md
    async openFilePickerForOutputNote(containerEl) {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [{ name: 'Markdown Files', extensions: ['md'] }]
        });

        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const fileName = path.basename(filePath);
          console.log('Selected file:', fileName);

          // Guardar el nuevo nombre del archivo en las configuraciones
          this.plugin.settings.outputNoteName = fileName;
          await this.plugin.saveSettings(); // Save settings immediately

          new Notice(`Output note set to: ${fileName}`);

          // Re-render the settings to reflect the updated file name in the UI
          this.display();
        }
      } catch (err) {
        console.error('Error opening file picker:', err);
      }
    }

    async loadFunctionsAndDisplay(containerEl) {
      const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'python-commander','functions.json');
      let functionsDict = {};

      if (fs.existsSync(jsonFile)) {
        const rawData = fs.readFileSync(jsonFile);
        functionsDict = JSON.parse(rawData);
      }

      if (Object.keys(functionsDict).length === 0) {
        new Setting(containerEl).setName('No functions saved');
        return;
      }

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

    removeFunction(functionName, scriptFilePath, containerEl) {
      const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'python-commander','functions.json');
      let functionsDict = {};

      if (fs.existsSync(jsonFile)) {
        const rawData = fs.readFileSync(jsonFile);
        functionsDict = JSON.parse(rawData);
      }

      delete functionsDict[functionName];
      const functionFolder = path.dirname(scriptFilePath);
      if (fs.existsSync(scriptFilePath)) {
        fs.unlinkSync(scriptFilePath);
      }
      if (fs.existsSync(functionFolder) && fs.readdirSync(functionFolder).length === 0) {
        fs.rmdirSync(functionFolder);
      }

      this.plugin.removeCommand(`run-${functionName}`);

      fs.writeFileSync(jsonFile, JSON.stringify(functionsDict, null, 2));

      containerEl.empty();
      this.display();
      new Notice(`Function '${functionName}' has been removed.`);
    }
}


module.exports = PythonCommander;

 
