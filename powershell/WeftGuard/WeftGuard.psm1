Set-StrictMode -Version Latest

function Get-WeftGuardRepositoryRoot {
    [CmdletBinding()]
    param()

    $candidate = Resolve-Path -LiteralPath ([System.IO.Path]::Combine($PSScriptRoot, '..', '..')) -ErrorAction Stop
    return $candidate.Path
}

function Get-WeftGuardCliPath {
    [CmdletBinding()]
    param(
        [string] $CliPath
    )

    if ($CliPath) {
        $resolved = Resolve-Path -LiteralPath $CliPath -ErrorAction Stop
        return $resolved.Path
    }

    $root = Get-WeftGuardRepositoryRoot
    $candidate = [System.IO.Path]::Combine($root, 'out', 'cli.js')
    if (Test-Path -LiteralPath $candidate) {
        return $candidate
    }

    throw "WeftGuard CLI was not found at '$candidate'. Run 'npm run compile' in the WeftGuard repository or provide -CliPath."
}

function Invoke-WeftGuardPreflight {
    [CmdletBinding()]
    param(
        [Parameter(Position = 0)]
        [string] $ProjectPath = '.',

        [Parameter(Position = 1)]
        [string] $OutputPath = 'weftguard-reports',

        [ValidateSet('Error', 'Warning', 'Never')]
        [string] $FailOn = 'Error',

        [ValidateSet('Markdown', 'Json')]
        [string[]] $Format = @('Markdown', 'Json'),

        [string] $NodePath = 'node',

        [string] $CliPath,

        [switch] $NoThrow
    )

    $resolvedProject = Resolve-Path -LiteralPath $ProjectPath -ErrorAction Stop
    $resolvedOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
        $OutputPath
    } else {
        Join-Path (Get-Location).Path $OutputPath
    }
    $resolvedOutput = [System.IO.Path]::GetFullPath($resolvedOutput)
    $resolvedCli = Get-WeftGuardCliPath -CliPath $CliPath
    $formatValue = ($Format | ForEach-Object { $_.ToLowerInvariant() }) -join ','
    $failOnValue = $FailOn.ToLowerInvariant()

    $arguments = @(
        $resolvedCli,
        'preflight',
        '--project',
        $resolvedProject.Path,
        '--out',
        $resolvedOutput,
        '--fail-on',
        $failOnValue,
        '--format',
        $formatValue
    )

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $NodePath
    foreach ($argument in $arguments) {
        [void] $startInfo.ArgumentList.Add($argument)
    }
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    [void] $process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    if ($stdout) {
        Write-Host $stdout.TrimEnd()
    }
    if ($stderr) {
        Write-Error -Message $stderr.TrimEnd() -ErrorAction Continue
    }

    $result = [pscustomobject]@{
        ExitCode = $process.ExitCode
        ProjectPath = $resolvedProject.Path
        OutputPath = $resolvedOutput
        MarkdownReport = Join-Path $resolvedOutput 'weftguard-release-report.md'
        JsonReport = Join-Path $resolvedOutput 'weftguard-release-report.json'
        StdOut = $stdout
        StdErr = $stderr
    }

    if ($process.ExitCode -ne 0 -and -not $NoThrow) {
        throw "WeftGuard preflight failed with exit code $($process.ExitCode). See reports in '$resolvedOutput'."
    }

    return $result
}

function New-WeftGuardPipelineTemplate {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Position = 0)]
        [string] $DestinationPath = '.',

        [ValidateSet('GitHubActions', 'AzureDevOps', 'Both')]
        [string] $Platform = 'Both',

        [switch] $Force
    )

    $root = Get-WeftGuardRepositoryRoot
    $destination = if ([System.IO.Path]::IsPathRooted($DestinationPath)) {
        $DestinationPath
    } else {
        Join-Path (Get-Location).Path $DestinationPath
    }
    $destination = [System.IO.Path]::GetFullPath($destination)
    New-Item -ItemType Directory -Force -Path $destination | Out-Null

    $outputs = New-Object System.Collections.Generic.List[object]

    if ($Platform -eq 'GitHubActions' -or $Platform -eq 'Both') {
        $source = [System.IO.Path]::Combine($root, 'templates', 'github', 'weftguard-preflight.yml')
        $targetDirectory = [System.IO.Path]::Combine($destination, '.github', 'workflows')
        $target = Join-Path $targetDirectory 'weftguard-preflight.yml'
        if ($PSCmdlet.ShouldProcess($target, 'Create WeftGuard GitHub Actions template')) {
            Copy-WeftGuardTemplate -Source $source -Target $target -Force:$Force -Outputs $outputs
        }
    }

    if ($Platform -eq 'AzureDevOps' -or $Platform -eq 'Both') {
        $source = [System.IO.Path]::Combine($root, 'templates', 'azure-pipelines', 'weftguard-preflight.yml')
        $target = Join-Path $destination 'azure-pipelines-weftguard.yml'
        if ($PSCmdlet.ShouldProcess($target, 'Create WeftGuard Azure DevOps template')) {
            Copy-WeftGuardTemplate -Source $source -Target $target -Force:$Force -Outputs $outputs
        }
    }

    return $outputs
}

function Copy-WeftGuardTemplate {
    param(
        [Parameter(Mandatory)]
        [string] $Source,

        [Parameter(Mandatory)]
        [string] $Target,

        [System.Collections.Generic.List[object]] $Outputs,

        [switch] $Force
    )

    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Template source '$Source' was not found."
    }

    if ((Test-Path -LiteralPath $Target) -and -not $Force) {
        throw "Template target '$Target' already exists. Use -Force to overwrite."
    }

    $targetDirectory = Split-Path -Parent $Target
    New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null

    Copy-Item -LiteralPath $Source -Destination $Target -Force:$Force
    $Outputs.Add([pscustomobject]@{
        Path = $Target
        Source = $Source
    })
}

Export-ModuleMember -Function Invoke-WeftGuardPreflight, New-WeftGuardPipelineTemplate, Get-WeftGuardCliPath
