import * as vscode from 'vscode';
import { FabricItem, RuleFinding } from '../models/fabricModels';
import { WeftGuardState } from '../state/weftGuardState';

type TreeNode =
  | { kind: 'workspace'; id: string; label: string; description: string }
  | { kind: 'item'; item: FabricItem }
  | { kind: 'findings-root'; count: number }
  | { kind: 'finding'; finding: RuleFinding };

export class FabricTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly state: WeftGuardState) {
    this.state.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    switch (element.kind) {
      case 'workspace':
        return {
          label: element.label,
          description: element.description,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          iconPath: new vscode.ThemeIcon('organization')
        };
      case 'item':
        return {
          label: element.item.name,
          description: element.item.type,
          tooltip: element.item.path,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          iconPath: iconForItem(element.item.type)
        };
      case 'findings-root':
        return {
          label: 'Findings',
          description: `${element.count}`,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          iconPath: new vscode.ThemeIcon(element.count > 0 ? 'warning' : 'pass')
        };
      case 'finding':
        return {
          label: element.finding.title,
          description: element.finding.severity,
          tooltip: element.finding.message,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          iconPath: severityIcon(element.finding.severity)
        };
    }
  }

  getChildren(element?: TreeNode): TreeNode[] {
    const snapshot = this.state.value;
    if (!snapshot.scan) {
      return [{ kind: 'findings-root', count: 0 }];
    }

    if (!element) {
      return [
        ...snapshot.scan.workspaces.map((workspace) => ({
          kind: 'workspace' as const,
          id: workspace.id,
          label: workspace.name,
          description: `${workspace.items.length} items`
        })),
        { kind: 'findings-root', count: snapshot.findings.length }
      ];
    }

    if (element.kind === 'workspace') {
      const workspace = snapshot.scan.workspaces.find((candidate) => candidate.id === element.id);
      return workspace?.items.map((item) => ({ kind: 'item' as const, item })) ?? [];
    }

    if (element.kind === 'findings-root') {
      return snapshot.findings.map((finding) => ({ kind: 'finding' as const, finding }));
    }

    return [];
  }
}

function iconForItem(type: FabricItem['type']): vscode.ThemeIcon {
  switch (type) {
    case 'Lakehouse':
      return new vscode.ThemeIcon('database');
    case 'Warehouse':
      return new vscode.ThemeIcon('server-environment');
    case 'Notebook':
      return new vscode.ThemeIcon('notebook');
    case 'DataPipeline':
      return new vscode.ThemeIcon('run-all');
    case 'Report':
      return new vscode.ThemeIcon('graph');
    case 'SemanticModel':
      return new vscode.ThemeIcon('symbol-structure');
    case 'VariableLibrary':
      return new vscode.ThemeIcon('symbol-variable');
    default:
      return new vscode.ThemeIcon('symbol-misc');
  }
}

function severityIcon(severity: RuleFinding['severity']): vscode.ThemeIcon {
  switch (severity) {
    case 'error':
      return new vscode.ThemeIcon('error');
    case 'warning':
      return new vscode.ThemeIcon('warning');
    case 'info':
      return new vscode.ThemeIcon('info');
  }
}
