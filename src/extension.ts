import * as vscode from 'vscode';
import { registerWeftGuardCommands } from './commands';
import { WeftGuardDiagnostics } from './diagnostics/weftGuardDiagnostics';
import { WeftGuardState } from './state/weftGuardState';
import { FabricTreeProvider } from './views/fabricTreeProvider';

export function activate(context: vscode.ExtensionContext): void {
  const state = new WeftGuardState();
  const treeProvider = new FabricTreeProvider(state);
  const diagnostics = new WeftGuardDiagnostics();

  context.subscriptions.push(state, diagnostics);
  context.subscriptions.push(vscode.window.registerTreeDataProvider('weftguard.fabricItems', treeProvider));

  registerWeftGuardCommands(context, state, treeProvider, diagnostics);
}

export function deactivate(): void {
  // VS Code disposes subscriptions registered during activation.
}
