import * as vscode from 'vscode';
import { ProjectScanner } from '../scanners/projectScanner';
import { WeftGuardDiagnostics } from '../diagnostics/weftGuardDiagnostics';
import { generateReleaseReportJson, generateReleaseReportMarkdown } from '../reports/releaseReport';
import { WeftGuardState } from '../state/weftGuardState';
import { FabricTreeProvider } from '../views/fabricTreeProvider';
import { showWeftGuardDashboard } from '../webview/dashboard';

export function registerWeftGuardCommands(
  context: vscode.ExtensionContext,
  state: WeftGuardState,
  treeProvider: FabricTreeProvider,
  diagnostics: WeftGuardDiagnostics
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('weftguard.scanCurrentProject', () => scanCurrentProject(state, treeProvider, diagnostics)),
    vscode.commands.registerCommand('weftguard.runDeploymentPreflight', () => runDeploymentPreflight(state, diagnostics)),
    vscode.commands.registerCommand('weftguard.buildDependencyGraph', () => buildDependencyGraph(state)),
    vscode.commands.registerCommand('weftguard.exportReleaseReport', () => exportReleaseReport(state)),
    vscode.commands.registerCommand('weftguard.generateCICDPipeline', () => generateCICDPipeline()),
    vscode.commands.registerCommand('weftguard.showDashboard', () => showWeftGuardDashboard(context, state))
  );
}

async function scanCurrentProject(
  state: WeftGuardState,
  treeProvider: FabricTreeProvider,
  diagnostics: WeftGuardDiagnostics
): Promise<void> {
  await runCommand('Scan failed', async () => {
    const root = getWorkspaceRoot();
    const scanner = new ProjectScanner();
    const scan = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'WeftGuard is scanning the Fabric project',
        cancellable: false
      },
      () => scanner.scanProject(root.fsPath)
    );

    state.setScan(scan);
    diagnostics.clear();
    treeProvider.refresh();

    const itemCount = scan.workspaces.reduce((count, workspace) => count + workspace.items.length, 0);
    vscode.window.showInformationMessage(`WeftGuard scanned ${itemCount} Fabric items across ${scan.workspaces.length} workspace.`);
  });
}

async function runDeploymentPreflight(state: WeftGuardState, diagnostics: WeftGuardDiagnostics): Promise<void> {
  await runCommand('Deployment preflight failed', async () => {
    ensureScan(state);
    const snapshot = state.runPreflight();
    diagnostics.publish(snapshot.findings);

    const errors = snapshot.findings.filter((finding) => finding.severity === 'error').length;
    const warnings = snapshot.findings.filter((finding) => finding.severity === 'warning').length;
    const message = errors > 0
      ? `WeftGuard preflight found ${errors} errors and ${warnings} warnings.`
      : `WeftGuard preflight passed with ${warnings} warnings.`;

    if (errors > 0) {
      vscode.window.showWarningMessage(message);
    } else {
      vscode.window.showInformationMessage(message);
    }
  });
}

async function buildDependencyGraph(state: WeftGuardState): Promise<void> {
  await runCommand('Dependency graph failed', async () => {
    ensureScan(state);
    await vscode.commands.executeCommand('weftguard.showDashboard');
  });
}

async function exportReleaseReport(state: WeftGuardState): Promise<void> {
  await runCommand('Release report export failed', async () => {
    const snapshot = ensureScan(state);
    const findings = snapshot.findings.length > 0 ? snapshot.findings : state.runPreflight().findings;
    const graph = state.value.graph;
    const scan = state.value.scan;
    if (!scan || !graph) {
      throw new Error('Scan state was not available after preflight.');
    }

    const targetFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!targetFolder) {
      throw new Error('Open a workspace folder before exporting a release report.');
    }

    const reportFolder = vscode.Uri.joinPath(targetFolder, 'weftguard-reports');
    await vscode.workspace.fs.createDirectory(reportFolder);

    const baseName = `release-report-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const markdownUri = vscode.Uri.joinPath(reportFolder, `${baseName}.md`);
    const jsonUri = vscode.Uri.joinPath(reportFolder, `${baseName}.json`);
    const reportInput = { scan, graph, findings };

    await vscode.workspace.fs.writeFile(markdownUri, Buffer.from(generateReleaseReportMarkdown(reportInput), 'utf8'));
    await vscode.workspace.fs.writeFile(jsonUri, Buffer.from(generateReleaseReportJson(reportInput), 'utf8'));
    await vscode.window.showTextDocument(markdownUri);
    vscode.window.showInformationMessage(`WeftGuard exported ${markdownUri.fsPath}`);
  });
}

async function generateCICDPipeline(): Promise<void> {
  await runCommand('CI/CD pipeline generation failed', async () => {
    const root = getWorkspaceRoot();
    const workflowFolder = vscode.Uri.joinPath(root, '.github', 'workflows');
    const workflowFile = vscode.Uri.joinPath(workflowFolder, 'weftguard-fabric-deploy.yml');
    await vscode.workspace.fs.createDirectory(workflowFolder);
    await vscode.workspace.fs.writeFile(workflowFile, Buffer.from(buildGitHubActionsWorkflow(), 'utf8'));
    await vscode.window.showTextDocument(workflowFile);
    vscode.window.showInformationMessage('WeftGuard generated a Fabric deployment workflow template.');
  });
}

function ensureScan(state: WeftGuardState) {
  if (!state.value.scan || !state.value.graph) {
    throw new Error('Run "WeftGuard: Scan Current Project" first.');
  }
  return state.value;
}

function getWorkspaceRoot(): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error('Open a folder containing a Fabric project before using WeftGuard.');
  }
  return folder.uri;
}

async function runCommand(failurePrefix: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`WeftGuard: ${failurePrefix}. ${message}`);
    throw error;
  }
}

function buildGitHubActionsWorkflow(): string {
  return `name: WeftGuard Fabric Deployment

on:
  workflow_dispatch:
  pull_request:
    paths:
      - '**/*.json'
      - '**/*.ipynb'
      - '**/*.sql'
      - '**/*.py'

jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install Fabric automation dependencies
        run: |
          python -m pip install --upgrade pip
          pip install ms-fabric-cli fabric-cicd
      - name: Fabric authentication placeholder
        run: |
          echo "Configure service-principal authentication with repository secrets before deployment."
      - name: Deployment gate
        run: |
          echo "Run WeftGuard preflight locally and attach the release report to this pull request."
`;
}
