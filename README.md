1# put the files inside xampp/php server, on the pc u are hosting.

2# put ur ipv4 address in /src/launcher.py & /src/script.js

3# open the folder containing the src file, right click, select open in terminal option,
    type *pip install pyinstaller*
    after installation, on the same terminal,
    type *PyInstaller --onefile --noconsole launcher.py *

4# this creates a /src/dist folder inside /src, 
    a launcher.exe file is created in it. 

5# run the launcher.exe file

6# (optional:) put the launcher.exe file iside /laucher folder outside the /src folder.
