# Run a build or check script with the MCP v2 python. Full output goes to work_out\<script>.txt
param([string]$Script, [Parameter(ValueFromRemainingArguments=$true)][string[]]$Rest)
$py = 'C:\Users\admin\AppData\Local\LabVIEWNativeMCP\.venv\Scripts\python.exe'
$env:LABVIEW_VERSION = '2026'
$env:LABVIEW_HOME = 'C:/Program Files/National Instruments/LabVIEW 2026'
$env:PYTHONUTF8 = '1'
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force work_out | Out-Null
$name = [IO.Path]::GetFileNameWithoutExtension($Script)
$log = "work_out\$name.txt"
cmd /c "`"$py`" -B `"$Script`" $Rest > `"$log`" 2>&1"
"exit $LASTEXITCODE  $(Get-Date -Format HH:mm:ss)  $log"
