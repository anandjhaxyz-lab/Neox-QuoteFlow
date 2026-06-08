' ---------------------------------------------------------
' SILENT PRO LAUNCHER
' Launches the Pro App without showing any CMD window
' ---------------------------------------------------------
Set WshShell = CreateObject("WScript.Shell")
strPath = WScript.Arguments(0)
' 0 = Hide window, True = Wait for completion (but the bat exits fast anyway)
WshShell.Run """" & strPath & """", 0, False
