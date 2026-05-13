import * as vscode from 'vscode';
import { RuleFinding } from '../models/fabricModels';

export class WeftGuardDiagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('weftguard');

  publish(findings: RuleFinding[]): void {
    this.collection.clear();
    const byFile = new Map<string, vscode.Diagnostic[]>();

    for (const finding of findings) {
      if (!finding.source?.file) {
        continue;
      }

      const range = new vscode.Range(
        Math.max((finding.source.line ?? 1) - 1, 0),
        Math.max((finding.source.column ?? 1) - 1, 0),
        Math.max((finding.source.line ?? 1) - 1, 0),
        Math.max((finding.source.column ?? 1), 1)
      );
      const diagnostic = new vscode.Diagnostic(range, finding.message, toVsCodeSeverity(finding.severity));
      diagnostic.source = `WeftGuard/${finding.ruleId}`;
      const diagnostics = byFile.get(finding.source.file) ?? [];
      diagnostics.push(diagnostic);
      byFile.set(finding.source.file, diagnostics);
    }

    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!root) {
      return;
    }

    for (const [file, diagnostics] of byFile.entries()) {
      this.collection.set(vscode.Uri.joinPath(root, file), diagnostics);
    }
  }

  clear(): void {
    this.collection.clear();
  }

  dispose(): void {
    this.collection.dispose();
  }
}

function toVsCodeSeverity(severity: RuleFinding['severity']): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
  }
}
