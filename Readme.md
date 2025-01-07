 # <center><font color="#00b050" size="6">Python Comander Introduction.</font></center>

Python Commander has two main execution modes.
Immediate Mode and Command mode (CM).

The immediate mode is straight forward, just select any text that is valid python code and run it. 
It will execute and return whatever your code returns to the output options you have selected in the settings.

The command mode, allow you in the same way to select any valid code just like the immediate mode, but instead of run the code directly, it saves the code as a python module to the scripts folder you selected in the settings, and create a command in the command palette from where you can launch it afterwards. 

The command mode is more flexible, allowing you to pass the selected text as argument to the script  (can't be done in immediate mode), and to pass more arguments to your script from the modal / pop up (if set true in the settings). 
This way you can run your scripts almost anywhere within obsidian by having all your scripts available in the command palette.

Recent changes in the design of python commander allow user to import already created commands to new ones (commands are python modules after all). 
The way you do it is just like you would do with any python module: import {your command name}. 
It is better to do: "from {your command name} import {your command name}" 
Then call it like: {your <u>command</u> name}.{your <u>function</u> name}() see the examples down bellow.

There is a few other ways to import your own libraries to use in your commands. 
One is to install your modules in your environment using pip, but this way require packaging your scripts as a pip installable module using setuptools, not too complicated but not that straight forward.
The other way is to copy the modules you want to import to the same folder where your command/module was created. 
Then just do from .{your other script} import your_import    
##### from .your_other_script import your_import 

Python Commander features already various output modes that can be combined in the settings to visualize your data at your convenience, as well as some input modes.
The output modes are:
- <font color="#4bacc6">Note output mode:</font> outputs to the note you choose in the settings
- <font color="#4bacc6">Console output mode:</font> outputs to the console log with some extra data, like the paths and arguments executed, useful for debugging 
- <font color="#4bacc6">Current note output mode:</font> outputs to the last line of the active note
- <font color="#4bacc6">Modal output mode:</font> outputs to a modal / pop up dialog in the screen

The input modes are:
- <font color="#4bacc6">Text input mode:</font> it passes the selected text as a system argument (sys.argv) to the script execution.
- <font color="#4bacc6">Modal input mode:</font> it offers a modal / pop up text field where you can type extra arguments to pass as system arguments (sys.argv) to the execution. ( note that if text input mode is true the first argument (sys.argv[1]) is the selected text ) 
- <font color="#4bacc6">None input mode:</font> if both modes are set to false, no extra arguments are passed to the execution other than the ones that might be hard coded in the script

Remember always to call your functions!
if you defined a function call it, otherwise Python Commander will run your scripts but you will see no output, and likely no errors either.
If you think your script is not running and don't know why, check that you have actually called something. 
def your_func():  and call your_func() 

The last feature remaining to discus is command managing.
Once you register a command name you can't register other command with the same name, unless you remove that entry from the command library. This was thought to prevent accidental overriding of commands. (might have a setting option in the future)
If you make a mistake with the naming or the code, you can remove the commands from the palette in the settings. There you'll find an entry for each command present in your command library, with a button to remove it, ( removing a command will delete the files from the scripts folder ), alternatively  to edit your scripts, navigate to your scripts folder and edit them in any text editor, but don't rename the files or Python Commander will not be able to find them.  
The command folders are hidden folders inside your scripts folder, one for each command you have registered, this is to not overpopulate the vault with unnecessary folders. (this might change in the future as i consider other approaches, but for now this is the way, if there's changes they will be notified in this readme)  


<center><font color="#00b050" size="6">How to use Python Commander</font></center>
First you have to set the path to your python executable in the settings.
Click the Browse button, navigate to your python executable, and select it.
You need to set the path where you want your scripts to be stored, by default it is set to vault/scripts/python but you can set this whatever you want even outside of your vault, hidden folders are valid too.
Click the Browse button, navigate to that path, and select it.
The rest of the settings are optional and to your convenience, try out what suits your needs better.
The only setting needed to set (if you are planing to use it), is the Output Note. 
If you want to output to a specific note, like ex: "Console.md", you have to create it first and then select it from the menu. 
Click the Browse button, navigate to your Note, and select it.
With that you are ready to go!

### <font color="#00b050">Immediate mode (IM) Python "Run Selected Text"</font>

- To run python code you wrote:
	- Select with the mouse the code you want to run.
	- Open the command palette (ctrl + p) or click >_ on the side panel. 
	- Search for Python Commander: Run Selected Text.
	
-  ### Tip: Python Commander synergize well with "Commander Plugin", if you have it installed, you can right click, Add command, and select the command you want to add to the contextual menu. 
- This way you can select some text, right click and run it.
##### <font color="#7f7f7f">Minimal example (IM)</font>
```python
print('Hello world!')
```

<span style="background:#9254de"><font color="#ffff00">print('Hello world!')</font></span> # select the text text

Open your command palette (ctrl + p)
Find: Python Commander: Run Selected Text.
Done!

___
##### <font color="#7f7f7f">Simple function example (IM)</font>
```python
def func():               # define your function 
	print('it works!')     # body of your function
func() #     <---         # remember to call the function
```

___
##### <font color="#7f7f7f">Simple class example (IM)</font>
```python
class My_Class:
	def __init__(self, name):
		print(f'my name is: {name}!!')

a = My_Class('Python Commander')
```

______________________________________________________________
##### <font color="#7f7f7f">Simple function with arg (IM)</font>
```python
def func_with_args(arg):

	print(arg)
	
func_with_args('Hello there!') #<---# remember to call the function
```

_____________________________________________________________
##### <font color="#7f7f7f">Function with multiple args (IM)</font>
```python
def func(*args):

	[print(f'arg {n} = {x} {type(x)}') for n, x in enumerate(args)]
	
func('text', 1, .0, [], (), {})	
```

___

### <font color="#00b050">Making Commands: </font>

##### <font color="#e36c09">1 º Write your script</font>
```python
def my_first_command():

	print('Python Commander!')
	
my_first_command()            #    REMEMBER to CALL your function!!
```


##### <font color="#e36c09">2 º Select the text for of script (only the python code, not the back ticks ```  # comments are ok) </font>
##### def my_first_command():

##### ·  ·  ·  ·print("Python Commander")

##### my_first_command() #    REMEMBER to CALL your function!!


##### <font color="#e36c09">3 º Open command palette (ctrl + p),  search Python Commander: New Python Command</font>
- You will be prompted to write a name for your palette command. (no spaces)
- Your Command / Script will be added to the command palette and your functions library.
- A python module with a file with the command name will be created in your scripts folder.  


##### <font color="#e36c09">4 º Run your command: </font>
- To run your Command press (ctrl + p) to open the command palette, search for Python Commander Run: {your command name}

<font color="#00b050"><center><font size="8">  ¡¡Congratulations!! </font></center></font>
<font color="#00b050"><center><font size="5">you already know how to use Python Commander to run your scripts from Obsidian</font></center></font>


##### <font color="#00b050">Making and importing your commands</font>

##### <font color="#e36c09">1 º Create a script function, a class, or the python code you want</font>
```python

def imported_function(arg):
	print(arg)

# if you just want to import this function, you don't need to call it.
# but if you want to be able to call and/or import it, use this python convention:
"""
if __name__=='__main__':
	imported_function(sys.argv)  # this will call your function only if the file executed is "this file"
"""
```

- Once your script is done, open your command palette (ctrl + p) and find <font color="#c0504d">Python Commander: New Python Command </font>
- Keep in mind that your Command name have to follow the module naming rules it means: not empty spaces or special characters except for underscores
- For this example i will Name my command to **"my_import"**, (the name of the command is arbitrary)

##### <font color="#e36c09">2 º Create the Script that will import the previous one</font>

```python
from my_import import my_import

my_import.imported_function("Hello from my imported module!")

```

- Once your other script is done, open your command palette (ctrl + p) and find <font color="#c0504d">Python Commander: New Python Command </font>
- This command i called **"my_import_er"**  (the name of the command is arbitrary)
- Then open your command palette (ctrl + p) and find <font color="#c0504d">Python Commander Run:  my_import_er</font>
It should output: "Hello from my imported module!"

