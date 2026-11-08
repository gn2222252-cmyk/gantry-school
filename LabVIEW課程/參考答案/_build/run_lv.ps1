# Run a build or test script with the labview-native-mcp v2 python. Output goes to out\<script>.txt
param([string]$Script, [Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest)
$py = 'C:\Users\admin\AppData\Local\LabVIEWNativeMCP\.venv\Scripts\python.exe'
$env:LABVIEW_VERSION = '2026'
$env:LABVIEW_HOME = 'C:/Program Files/National Instruments/LabVIEW 2026'
$env:PYTHONUTF8 = '1'
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force out | Out-Null
$name = [IO.Path]::GetFileNameWithoutExtension($Script)
$log = "out\$name.txt"
cmd /c "`"$py`" -B `"$Script`" $Rest > `"$log`" 2>&1"
"exit $LASTEXITCODE  $(Get-Date -Format HH:mm:ss)  $log"
