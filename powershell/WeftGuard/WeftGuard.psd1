@{
    RootModule = 'WeftGuard.psm1'
    ModuleVersion = '0.1.0'
    GUID = '15d7aab5-9f3f-4c2a-9ff2-c1b579f9a761'
    Author = 'Michael Pena'
    CompanyName = 'Data Chain Consulting'
    Copyright = '(c) 2026 Michael Pena. All rights reserved.'
    Description = 'PowerShell commands for running WeftGuard Microsoft Fabric deployment preflight checks and generating CI/CD templates.'
    PowerShellVersion = '7.0'
    FunctionsToExport = @(
        'Invoke-WeftGuardPreflight',
        'New-WeftGuardPipelineTemplate',
        'Get-WeftGuardCliPath'
    )
    CmdletsToExport = @()
    VariablesToExport = @()
    AliasesToExport = @()
    PrivateData = @{
        PSData = @{
            Tags = @('MicrosoftFabric', 'Fabric', 'ALM', 'CICD', 'Deployment', 'Governance')
            ProjectUri = 'https://github.com/mjtpena/WeftGuard'
            LicenseUri = 'https://github.com/mjtpena/WeftGuard/blob/main/LICENSE'
            ReleaseNotes = 'Initial WeftGuard PowerShell module wrapper for headless Fabric preflight checks.'
        }
    }
}
