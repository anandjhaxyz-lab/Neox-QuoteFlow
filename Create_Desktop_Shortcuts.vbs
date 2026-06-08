Set WshShell = WScript.CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set FSO = CreateObject("Scripting.FileSystemObject")
strCurrentDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' CHECK: If running from Temp/ZIP, stop and alert user
If InStr(LCase(strCurrentDir), "appdata\local\temp") > 0 Or InStr(LCase(strCurrentDir), ".zip") > 0 Then
    WScript.Echo "========================================" & vbCrLf & _
                 "   STOP: PLEASE EXTRACT THE ZIP FIRST!   " & vbCrLf & _
                 "========================================" & vbCrLf & vbCrLf & _
                 "Aapne ZIP file ko extract nahi kiya hai." & vbCrLf & _
                 "1. ZIP file par Right-Click karein." & vbCrLf & _
                 "2. 'Extract All' (Sabhi nikaalein) par click karein." & vbCrLf & _
                 "3. Phir naye folder se is file ko chalayein."
    WScript.Quit
End If

' Shortcut: QuoteFlow Pro (Uses invisible launcher)
Set oLink1 = WshShell.CreateShortcut(strDesktop & "\QuoteFlow.lnk")
oLink1.TargetPath = "wscript.exe"
oLink1.Arguments = """" & strCurrentDir & "\Launch_Invisible_Pro.vbs"" """ & strCurrentDir & "\Launch_Pro_App.bat"""
oLink1.WorkingDirectory = strCurrentDir
oLink1.WindowStyle = 1
oLink1.Description = "Launch QuoteFlow Standalone Desktop App"
' Professional App Icon
oLink1.IconLocation = "shell32.dll, 14" 
oLink1.Save

WScript.Echo "========================================" & vbCrLf & _
             "   SUCCESS: DESKTOP APP READY!   " & vbCrLf & _
             "========================================" & vbCrLf & vbCrLf & _
             "A 'QuoteFlow' icon has been created on your Desktop." & vbCrLf & _
             "Click it to open the real standalone application."
