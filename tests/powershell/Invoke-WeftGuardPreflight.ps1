$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path -LiteralPath ([System.IO.Path]::Combine($PSScriptRoot, '..', '..'))
$modulePath = [System.IO.Path]::Combine($repoRoot, 'powershell', 'WeftGuard', 'WeftGuard.psd1')
$outputPath = [System.IO.Path]::Combine($repoRoot, 'weftguard-reports', 'powershell')

Import-Module $modulePath -Force

$result = Invoke-WeftGuardPreflight `
    -ProjectPath ([System.IO.Path]::Combine($repoRoot, 'examples', 'demo-fabric-production')) `
    -OutputPath $outputPath `
    -FailOn Never

if ($result.ExitCode -ne 0) {
    throw "Expected PowerShell preflight wrapper to return exit code 0 when -FailOn Never is used."
}

if (-not (Test-Path -LiteralPath $result.MarkdownReport)) {
    throw "Markdown report was not generated at '$($result.MarkdownReport)'."
}

if (-not (Test-Path -LiteralPath $result.JsonReport)) {
    throw "JSON report was not generated at '$($result.JsonReport)'."
}

$templateRoot = [System.IO.Path]::Combine($repoRoot, 'weftguard-reports', 'powershell-templates')
Remove-Item -LiteralPath $templateRoot -Recurse -Force -ErrorAction SilentlyContinue
$templates = New-WeftGuardPipelineTemplate -DestinationPath $templateRoot -Platform Both -Force

if ($templates.Count -ne 2) {
    throw "Expected two templates, got $($templates.Count)."
}

if (-not (Test-Path -LiteralPath ([System.IO.Path]::Combine($templateRoot, '.github', 'workflows', 'weftguard-preflight.yml')))) {
    throw 'GitHub Actions template was not generated.'
}

if (-not (Test-Path -LiteralPath ([System.IO.Path]::Combine($templateRoot, 'azure-pipelines-weftguard.yml')))) {
    throw 'Azure DevOps template was not generated.'
}

Write-Host 'WeftGuard PowerShell module validation passed.'
