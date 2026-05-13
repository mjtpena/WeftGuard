import { describe, expect, it } from 'vitest';
import { buildDependencyGraph } from '../../src/graph/dependencyGraph';
import { FabricWorkspace } from '../../src/models/fabricModels';

const workspace: FabricWorkspace = {
  id: 'workspace-1',
  name: 'Fabric Dev',
  environment: 'development',
  path: '.',
  items: [
    {
      id: 'lakehouse-1',
      name: 'Sales Lakehouse',
      type: 'Lakehouse',
      workspaceId: 'workspace-1',
      dependencies: [],
      metadata: {}
    },
    {
      id: 'report-1',
      name: 'Sales Report',
      type: 'Report',
      workspaceId: 'workspace-1',
      dependencies: [
        {
          fromItemId: 'report-1',
          toItemId: 'lakehouse-1',
          kind: 'semantic-model-binding',
          confidence: 'high'
        },
        {
          fromItemId: 'report-1',
          toItemId: 'missing-warehouse',
          kind: 'item-reference',
          confidence: 'high'
        }
      ],
      metadata: {}
    }
  ]
};

describe('DependencyGraph', () => {
  it('builds graph nodes and unresolved dependency edges', () => {
    const graph = buildDependencyGraph([workspace]);

    expect(graph.toJSON().nodes).toHaveLength(2);
    expect(graph.toJSON().edges).toHaveLength(2);
    expect(graph.getUnresolvedDependencies().map((edge) => edge.to)).toEqual(['missing-warehouse']);
  });

  it('computes reverse impact for a changed item', () => {
    const graph = buildDependencyGraph([workspace]);

    expect(graph.getImpact('lakehouse-1').impactedItemIds).toEqual(['report-1']);
  });
});
