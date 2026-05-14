const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

exports.run = async function run() {
  const extension = vscode.extensions.getExtension('deltalenz.weftguard');
  assert.ok(extension, 'WeftGuard extension should be discoverable in the VS Code extension host.');

  await extension.activate();
  assert.strictEqual(extension.isActive, true, 'WeftGuard extension should activate.');

  const commands = await vscode.commands.getCommands(true);
  for (const command of [
    'weftguard.scanCurrentProject',
    'weftguard.runDeploymentPreflight',
    'weftguard.buildDependencyGraph',
    'weftguard.exportReleaseReport',
    'weftguard.generateCICDPipeline',
    'weftguard.showDashboard'
  ]) {
    assert.ok(commands.includes(command), `${command} should be registered.`);
  }

  await vscode.commands.executeCommand('weftguard.scanCurrentProject');
  await vscode.commands.executeCommand('weftguard.runDeploymentPreflight');
  await vscode.commands.executeCommand('weftguard.exportReleaseReport');
  await vscode.commands.executeCommand('weftguard.generateCICDPipeline');

  const workspacePath = process.env.WEFTGUARD_TEST_WORKSPACE;
  assert.ok(workspacePath, 'WEFTGUARD_TEST_WORKSPACE must be set.');

  const reportDir = path.join(workspacePath, 'weftguard-reports');
  const reports = fs.readdirSync(reportDir);
  assert.ok(reports.some((file) => file.endsWith('.md')), 'Markdown release report should be generated.');
  assert.ok(reports.some((file) => file.endsWith('.json')), 'JSON release report should be generated.');

  const markdown = fs.readFileSync(path.join(reportDir, reports.find((file) => file.endsWith('.md'))), 'utf8');
  assert.match(markdown, /Missing referenced Fabric item/);
  assert.match(markdown, /missing-model/);
  assert.match(markdown, /ProdLakehouseId/);

    const workflowPath = path.join(workspacePath, '.github', 'workflows', 'weftguard-fabric-deploy.yml');
    assert.ok(fs.existsSync(workflowPath), 'CI/CD workflow template should be generated.');
    assert.ok(fs.existsSync(path.join(workspacePath, 'azure-pipelines-weftguard.yml')), 'Azure DevOps workflow template should be generated.');

  await vscode.commands.executeCommand('weftguard.showDashboard');

  if (process.env.WEFTGUARD_SCREENSHOT_PATH) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    captureLiveScreenshot(process.env.WEFTGUARD_SCREENSHOT_PATH);
  }
};

function captureLiveScreenshot(targetPath) {
  const script = `
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

  [DllImport("user32.dll")]
  public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, int nFlags);

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
}
"@

$target = [IntPtr]::Zero
$titles = New-Object System.Collections.Generic.List[string]
$callback = [Win32+EnumWindowsProc]{
  param([IntPtr]$hWnd, [IntPtr]$lParam)
  if (-not [Win32]::IsWindowVisible($hWnd)) { return $true }
  $builder = New-Object System.Text.StringBuilder 512
  [void][Win32]::GetWindowText($hWnd, $builder, $builder.Capacity)
  $title = $builder.ToString()
  if ([string]::IsNullOrWhiteSpace($title)) { return $true }
  $titles.Add($title)
  if ($title -match 'Extension Development Host|WeftGuard|demo-fabric-production') {
    Set-Variable -Name target -Value $hWnd -Scope 1
    return $false
  }
  return $true
}

[void][Win32]::EnumWindows($callback, [IntPtr]::Zero)
if ($target -eq [IntPtr]::Zero) {
  throw "Could not find VS Code extension host window. Visible windows: $($titles -join ' | ')"
}

$rect = New-Object Win32+RECT
[void][Win32]::GetWindowRect($target, [ref]$rect)
$width = [Math]::Max($rect.Right - $rect.Left, 1)
$height = [Math]::Max($rect.Bottom - $rect.Top, 1)
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
[void][Win32]::PrintWindow($target, $hdc, 2)
$graphics.ReleaseHdc($hdc)
$bitmap.Save('${targetPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;
  childProcess.execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    stdio: 'inherit'
  });
}
