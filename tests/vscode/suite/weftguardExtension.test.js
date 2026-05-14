const assert = require('assert');
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
};
