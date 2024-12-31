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

  // --- Modified saveTextAsPythonCommand ---
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

      // Validate uniqueness of command name
      const scriptsDir = path.join(this.app.vault.adapter.basePath, '/scripts/python');
      const functionFolder = path.join(scriptsDir, `.${commandName}`);
      const scriptFile = path.join(functionFolder, `${commandName}.py`);

      fs.mkdirSync(functionFolder, { recursive: true });
      fs.writeFileSync(scriptFile, selectedText);

      const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian/plugins/python-commander/functions.json');
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
        output += `stdout: ${stdout}\n`;
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
        output += `stdout: ${stdout}\n`;
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
      const updatedContent = currentContent + '\n\n' + '### Python Script Output\n' + output;
      editor.setValue(updatedContent);
      new Notice('Python script output has been written to the active note.');
    } else {
      new Notice('No active note found to write the output.');
    }
  }

  //-----------------------------------------------

  // --- Function to write output to a specified note ---
  writeOutputToSpecifiedNote(output) {
    const noteName = this.settings.outputNoteName;
    const filePath = path.join(this.app.vault.adapter.basePath, noteName + '.md');

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const updatedContent = fileContent + '\n\n' + '### Python Script Output\n' + output;
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      new Notice(`Python script output has been written to '${noteName}.md'.`);
    } else {
      new Notice(`Note '${noteName}.md' does not exist.`);
    }
  }

  //-----------------------------------------------

  loadFunctions() {
    const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian/plugins/python-commander/functions.json');
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
    const data = await this.loadData();
    this.settings = data?.pythonExecutable ? data : { pythonExecutable: 'python3', showModal: true };
  }

  //-----------------------------------------------

  saveSettings() {
    this.saveData(this.settings);
  }

  //-----------------------------------------------

  onunload() {
    console.log('Unloading Python Commander plugin');
  }

  //-----------------------------------------------

}


