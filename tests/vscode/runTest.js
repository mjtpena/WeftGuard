const { copyFileSync, cpSync, mkdirSync, mkdtempSync, rmSync } = require('fs');
const { tmpdir } = require('os');
const path = require('path');
const { runTests } = require('@vscode/test-electron');

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'index.js');
  const sourceWorkspace = path.resolve(extensionDevelopmentPath, 'examples', 'demo-fabric-production');
  const workspacePath = mkdtempSync(path.join(tmpdir(), 'weftguard-vscode-'));
  cpSync(sourceWorkspace, workspacePath, { recursive: true });

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [workspacePath, '--disable-workspace-trust'],
      extensionTestsEnv: {
        WEFTGUARD_TEST_WORKSPACE: workspacePath
      }
    });
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
