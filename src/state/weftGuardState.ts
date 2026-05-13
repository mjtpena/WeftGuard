import * as vscode from 'vscode';
import { DependencyGraph, buildDependencyGraphFromScan } from '../graph/dependencyGraph';
import { FabricScanResult, RuleFinding } from '../models/fabricModels';
import { runPreflightChecks } from '../rules/ruleEngine';

export interface WeftGuardSnapshot {
  scan?: FabricScanResult;
  graph?: DependencyGraph;
  findings: RuleFinding[];
}

export class WeftGuardState {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<WeftGuardSnapshot>();
  private snapshot: WeftGuardSnapshot = { findings: [] };

  readonly onDidChange = this.onDidChangeEmitter.event;

  get value(): WeftGuardSnapshot {
    return this.snapshot;
  }

  setScan(scan: FabricScanResult): WeftGuardSnapshot {
    const graph = buildDependencyGraphFromScan(scan);
    this.snapshot = {
      scan,
      graph,
      findings: []
    };
    this.onDidChangeEmitter.fire(this.snapshot);
    return this.snapshot;
  }

  runPreflight(): WeftGuardSnapshot {
    if (!this.snapshot.scan || !this.snapshot.graph) {
      throw new Error('Scan a Fabric project before running deployment preflight.');
    }

    this.snapshot = {
      ...this.snapshot,
      findings: runPreflightChecks(this.snapshot.scan.workspaces, this.snapshot.graph)
    };
    this.onDidChangeEmitter.fire(this.snapshot);
    return this.snapshot;
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }
}
