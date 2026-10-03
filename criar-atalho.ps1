$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "Pelada Top (Nuvem Oficial).lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "E:\PeladaTop\abrir-app-nuvem.bat"
$Shortcut.WorkingDirectory = "E:\PeladaTop"
$Shortcut.IconLocation = "E:\PeladaTop\app-icon.ico"
$Shortcut.Description = "Abre o Pelada Top Oficial na Nuvem (Render)"
$Shortcut.Save()
Write-Output "Atalho criado com sucesso na Area de Trabalho: $ShortcutPath"
