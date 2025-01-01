### <font color="#00b050">Immediate mode (IM) Python "Run Selected Text"</font>
##### <font color="#7f7f7f">Minimal example (IM)</font>
```python
print('Hello world!')
```

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

	print('Python Commander')
	
my_first_command()            #    REMEMBER to CALL your function!!
```

##### <font color="#e36c09">2 º Select the text for of script (only the python code, # comments are ok) </font>
##### <span style="background:#9254de">def my_first_command():</span>

##### <span style="background:#9254de">		print("Python Commander")</span>

##### <span style="background:#9254de">my_first_command() #    REMEMBER to CALL your function!! </span>

##### <font color="#e36c09">3 º Open command palette (ctrl + p),  search Python Commander: Make Python Command</font>
- You will be prompted to write a name for your palette command. 
- Your Command / Script will be added to the command palette and your functions library
- A python file with the command name will be created in your scripts folder  

##### <font color="#e36c09">4 º Run your command: </font>
- To run your Command press (ctrl + p) to open the command palette, search for Python Commander Run: {your command name}

<font color="#00b050"><center><font size="8">  ¡¡Congratulations!! </font></center></font>
<font color="#00b050"><center><font size="5">you already know how to use Python Commander to run your scripts from Obsidian</font></center></font>
