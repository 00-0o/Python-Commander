const { Plugin, PluginSettingTab, Setting, Modal, Notice } = require('obsidian');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { dialog } = require('electron').remote; // Require Electron's dialog module

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
      placeholder: 'Enter a unique name without spaces'
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
      name: 'New Python Command',
      editorCallback: (editor) => {
        this.saveTextAsPythonCommand(editor);
      }
    });

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
        const scriptsDir = this.settings.pythonScriptFolder;
        const moduleFolder = path.join(scriptsDir, commandName); // The folder name will be the commandName
        const mainFile = path.join(moduleFolder, '__main__.py'); // Main file inside the folder
        const commandFile = path.join(moduleFolder, `${commandName}.py`); // User's script

        // Create the folder and file structure
        fs.mkdirSync(moduleFolder, { recursive: true });

        // Write the selected text to the ${commandName}.py file
        fs.writeFileSync(commandFile, selectedText);

        // Generate the __main__.py file to simulate sys.argv and execute the user's script
const mainScriptContent = `
import sys
import os
import base64
import json
import ast
sys.path.append('${scriptsDir}')
# Decode base64 string to the original string
def decode_args(encoded_args):
    decoded_str = base64.b64decode(encoded_args).decode('utf-8')

    # If it's a JSON-like string, we can use json.loads() to parse it into a Python object
    try:
        decoded_obj = json.loads(decoded_str)  # Try to parse as JSON
        return decoded_obj
    except json.JSONDecodeError:
        # If it's not a JSON string, we safely try to evaluate it using ast.literal_eval
        try:
            decoded_obj = ast.literal_eval(decoded_str)  # Safely evaluate literals like tuples, lists, etc.
            return decoded_obj
        except Exception as e:
            try:
                decoded_str = f"{str(decoded_str)}"
                decoded_obj = ast.literal_eval(decoded_str)
            except Exception as e:
                if decoded_str.startswith("'") and decoded_str.endswith("'"):
                    decoded_str = decoded_str[1:-1]
                    return str(decoded_str)
                elif decoded_str.startswith('"') and decoded_str.endswith('"'):
                    decoded_str = decoded_str[1:-1]
                    return str(decoded_str)
                else:
                    print(f"Error evaluating string {decoded_str}: {e}")
                    return str(decoded_str)  # Fallback to returning the string if all else fails

# Get the script path dynamically
script_path = os.path.join(os.path.dirname(__file__), '${commandName}.py')

with open(script_path) as file:
    code = file.read()

# Decode the arguments passed through sys.argv (if any)
if len(sys.argv) > 1:
    encoded_args = sys.argv[1]  # Take the first argument passed to the Python script
    decoded_params = decode_args(encoded_args)  # Decode the argument
    print("Decoded arguments:", decoded_params)  # Print decoded arguments
    typed_params = []  # List to store type-checked parameters

    if hasattr(decoded_params, '__iter__') and not isinstance(decoded_params, (str, bytes)):
        # If decoded_params is iterable (like list, tuple, etc.) but not a string/bytes
        for param in decoded_params:
            """
            if isinstance(param, int):
                print(f"Integer detected: {param}")
            elif isinstance(param, float):
                print(f"Float detected: {param}")
            elif isinstance(param, bool):
                print(f"Boolean detected: {param}")
            else:
                print(f"Other type detected: {type(param)} - {param}")
            """
            typed_params.append(param)  # Append the original param without conversion

        sys.argv = [sys.argv[0], *typed_params]  # Rebuild sys.argv with processed params
        sys.argv = ['${commandName}.py', *sys.argv[1:]]
    else:
        """
        # If it's a single value (not iterable or a string-like iterable)
        if isinstance(decoded_params, int):
            print(f"Single Integer detected: {decoded_params}")
        elif isinstance(decoded_params, float):
            print(f"Single Float detected: {decoded_params}")
        elif isinstance(decoded_params, bool):
            print(f"Single Boolean detected: {decoded_params}")
        else:
            print(f"Single Other type detected: {type(decoded_params)} - {decoded_params}")
        """
        sys.argv = [sys.argv[0], decoded_params]
        sys.argv = ['${commandName}.py', *sys.argv[1:]]
else:
    sys.argv = ['${commandName}.py']
    print("No arguments provided.")

exec(code)

`;


        // Write the generated __main__.py file
        fs.writeFileSync(mainFile, mainScriptContent);

        // Read the functions dictionary file
        const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'python-commander', 'functions.json');
        let functionsDict = {};

        if (fs.existsSync(jsonFile)) {
            const rawData = fs.readFileSync(jsonFile);
            functionsDict = JSON.parse(rawData);
        }

        // Check if the commandName already exists in the dictionary
        if (functionsDict[commandName]) {
            new Notice(`Command '${commandName}' already exists. Choose a unique name.`);
            return;
        }

        // Add the new module to the functions dictionary
        functionsDict[commandName] = moduleFolder; // Save the folder instead of the file path
        fs.writeFileSync(jsonFile, JSON.stringify(functionsDict, null, 2));

        // Add the new command to the plugin
        this.addCommand({
          id: `run-${commandName}`,
          name: `Run ${commandName}`,
          callback: () => {

              const mainScriptFile = path.join(moduleFolder, '__main__.py');
              console.log(`Command '${commandName}' triggered with path:`, mainScriptFile);
              this.promptForParameters(mainScriptFile);
          }
      });


        new Notice(`Python module '${commandName}' saved in '${moduleFolder}' was added to the command palette.`);
    }).open();
  }

  //-----------------------------------------------

  promptForParameters(scriptFile) {
    const selectedText = this.app.workspace.activeLeaf.view.sourceMode
        ? this.app.workspace.activeLeaf.view.editor.getSelection()
        : '';

    // Helper function to encode the parameters string directly from modal input
    const encodeArgs = (args) => {
        return Buffer.from(args).toString('base64'); // Directly encode the string from modal input
    };

    if (!this.settings.showModal && !this.settings.passSelectedText) {
        // Case 1: No modal, no selected text → Run without arguments
        this.runPythonScript(scriptFile);
        console.log("this is the script", scriptFile);
    }
    else if (!this.settings.showModal && this.settings.passSelectedText && selectedText.trim()) {
        // Case 2: No modal, pass selected text
        const encodedArgs = encodeArgs(`${selectedText}`); // Encode the selected text separately
        this.runPythonScript(scriptFile, [encodedArgs]);  // Pass selected text only
        console.log("this is the script", scriptFile);
    }
    else if (this.settings.showModal && !this.settings.passSelectedText) {
        // Case 3: Modal enabled, no selected text
        new ParameterInputModal(this.app, (params) => {
            const encodedArgs = encodeArgs(params); // Encode the modal string directly
            this.runPythonScript(scriptFile, [encodedArgs]);  // Pass only modal input
            console.log("this is the script", scriptFile);
        }).open();
    }
    else if (this.settings.showModal && this.settings.passSelectedText && selectedText.trim()) {
        // Case 4: Modal enabled, pass selected text + modal input
        new ParameterInputModal(this.app, (params) => {
            // Combine selected text and modal input into a single string
            const combinedParams = `${selectedText}, ${params}`;  // Adjust separator as needed (space here)
            const encodedArgs = encodeArgs(combinedParams); // Encode the combined string

            this.runPythonScript(scriptFile, [encodedArgs]);  // Pass as a single combined argument
            console.log("this is the script", scriptFile);
        }).open();
    }
  }


  //-----------------------------------------------


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
        console.log(`Executing command: ${pythonExecutable} -c ${scriptFile}/__main__.py \n ${output}`); // Log the output to the console
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

      // Only log to console if command_log is enabled (if you want additional logging control)
      if (this.settings.command_log) {
        console.log('Command log enabled, output logged to console');
        // Log the output to the console (regardless of command_log setting)
        console.log(output);
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
      new Notice('Python script executed. Check output selected mode.');
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
      new Notice(`Python command output has been written to '${noteName}'.`);
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
      pythonExecutable: 'python3',
      useModal: false,
      showModal: false,
      passSelectedText: false,
      modal_out: true,
      cursor_out: false,
      outputNoteName: `${vaultPath}/Python Console.md`,
      note_out: false,
      console_log: true,
      pythonScriptFolder: `${vaultPath}/PyCommands` // Default scripts folder
    };

    try {
      const data = await this.loadData();

      if (!data || Object.keys(data).length === 0) {
        console.warn('Settings file is missing or empty. \n Creating a new one with default values \n Please see the settings.');
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
    new Setting(containerEl)
      .setName('Python Executable Path')
      .setDesc('Specify the path to your Python executable')
      .addText((text) =>
        text
          .setPlaceholder('python3 or full path to python executable')
          .setValue(this.plugin.settings.pythonExecutable || "python3")
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
      .setDesc('Choose a folder to store your Python modules')
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
      .setName('Show Parameter Input Pop Up')
      .setDesc('Enable or disable the parameter input pop up when running a command')
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
      .setDesc('Enable or disable passing the selected text as the first argument to the Python command')
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
      .setName('Show Output in a Pop Up')
      .setDesc('Enable or disable showing the command output in a pop up dialog')
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
      .setDesc('Enable or disable writing the script output to the end of the active note')
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
      .setDesc('Enable or disable writing the command output to a specific note')
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
      .setDesc('Choose the Note where the command output will be written ex: My_Console.md')
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
      .setDesc('Manage your saved Python Commands. Any command deleted will be removed from the command palette and the module erased from the the scripts folder');

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
      const jsonFile = path.join(this.app.vault.adapter.basePath, '.obsidian', 'plugins', 'python-commander', 'functions.json');
      let functionsDict = {};

      if (fs.existsSync(jsonFile)) {
          const rawData = fs.readFileSync(jsonFile);
          functionsDict = JSON.parse(rawData);
      }

      // Remove the function entry from the dictionary
      if (functionsDict[functionName]) {
          // Get the folder path for this function
          const functionFolder = functionsDict[functionName];

          // Remove the function folder (if it exists)
          if (fs.existsSync(functionFolder)) {
              fs.rmSync(functionFolder, { recursive: true, force: true });
              console.log(`Function folder '${functionFolder}' and its contents have been removed.`);
          }

          // Remove the function from the dictionary
          delete functionsDict[functionName];

          // Update the functions.json file
          fs.writeFileSync(jsonFile, JSON.stringify(functionsDict, null, 2));
      }

      // Remove the command from the plugin
      this.plugin.removeCommand(`run-${functionName}`);

      // Refresh the UI
      containerEl.empty();
      this.display();

      new Notice(`Function '${functionName}' has been removed.`);
  }

}


module.exports = PythonCommander;


