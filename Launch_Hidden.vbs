Set FSO = CreateObject("Scripting.FileSystemObject")
strPath = FSO.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strPath
WshShell.Run "cmd.exe /c silent_launch.bat", 0, false
Set WshShell = Nothing
