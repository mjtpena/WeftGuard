import { FabricDependency, FabricItem, FabricScanResult, FabricWorkspace } from '../models/fabricModels';

export interface GraphNode {
  id: string;
  label: string;
  type: FabricItem['type'];
  workspaceId: string;
  path?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: FabricDependency['kind'];
  confidence: FabricDependency['confidence'];
  label?: string;
}

export interface ImpactResult {
  itemId: string;
  impactedItemIds: string[];
}

export class DependencyGraph {
  readonly nodes = new Map<string, GraphNode>();
  readonly edges: GraphEdge[] = [];

  constructor(workspaces: FabricWorkspace[]) {
    for (const workspace of workspaces) {
      for (const item of workspace.items) {
        this.nodes.set(item.id, {
          id: item.id,
          label: item.name,
          type: item.type,
          workspaceId: workspace.id,
          path: item.path
        });

        for (const dependency of item.dependencies) {
          this.edges.push({
            id: `${dependency.fromItemId}->${dependency.toItemId}:${dependency.kind}`,
            from: dependency.fromItemId,
            to: dependency.toItemId,
            kind: dependency.kind,
            confidence: dependency.confidence,
            label: dependency.label
          });
        }
      }
    }
  }

  getUnresolvedDependencies(): GraphEdge[] {
    return this.edges.filter((edge) => edge.kind !== 'variable-reference' && !this.nodes.has(edge.to));
  }

  getVariableReferences(): GraphEdge[] {
    return this.edges.filter((edge) => edge.kind === 'variable-reference');
  }

  getImpact(itemId: string): ImpactResult {
    const impacted = new Set<string>();
    const queue = [itemId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      for (const edge of this.edges.filter((candidate) => candidate.to === current)) {
        if (!impacted.has(edge.from)) {
          impacted.add(edge.from);
          queue.push(edge.from);
        }
      }
    }

    return {
      itemId,
      impactedItemIds: [...impacted].sort()
    };
  }

  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: [...this.nodes.values()].sort((a, b) => a.label.localeCompare(b.label)),
      edges: [...this.edges].sort((a, b) => a.id.localeCompare(b.id))
    };
  }
}

export function buildDependencyGraph(workspaces: FabricWorkspace[]): DependencyGraph {
  return new DependencyGraph(workspaces);
}

export function buildDependencyGraphFromScan(scanResult: FabricScanResult): DependencyGraph {
  return buildDependencyGraph(scanResult.workspaces);
}
