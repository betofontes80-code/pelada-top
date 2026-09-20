$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "Pelada Top (Servidor em Rede).lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "E:\PeladaTop\iniciar-app.bat"
$Shortcut.WorkingDirectory = "E:\PeladaTop"
$Shortcut.IconLocation = "E:\PeladaTop\app-icon.ico"
$Shortcut.Description = "Inicia o Servidor Local da Pelada Top em Rede Wi-Fi"
$Shortcut.Save()
Write-Output "Atalho criado com sucesso na Area de Trabalho: $ShortcutPath"
