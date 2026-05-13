import { describe, expect, it } from 'vitest';
import { buildDependencyGraph } from '../../src/graph/dependencyGraph';
import { FabricWorkspace } from '../../src/models/fabricModels';
import { runPreflightChecks } from '../../src/rules/ruleEngine';

describe('RuleEngine', () => {
  it('detects missing references, hardcoded IDs, unresolved variables, and production edits', () => {
    const workspace: FabricWorkspace = {
      id: 'prod-workspace',
      name: 'Fabric Production',
      environment: 'production',
      path: '.',
      items: [
        {
          id: 'report-1',
          name: 'Revenue Report',
          type: 'Report',
          workspaceId: 'prod-workspace',
          path: 'Revenue.Report/.platform',
          dependencies: [
            {
              fromItemId: 'report-1',
              toItemId: 'missing-model',
              kind: 'semantic-model-binding',
              confidence: 'high'
            },
            {
              fromItemId: 'report-1',
              toItemId: 'ProdWorkspaceId',
              kind: 'variable-reference',
              confidence: 'medium'
            }
          ],
          definition: { connectionId: '11111111-1111-4111-8111-111111111111' },
          metadata: { gitStatus: 'modified' }
        }
      ]
    };

    const graph = buildDependencyGraph([workspace]);
    const findings = runPreflightChecks([workspace], graph);
    const ruleIds = findings.map((finding) => finding.ruleId);

    expect(ruleIds).toEqual(
      expect.arrayContaining([
        'missing-reference',
        'hardcoded-environment-id',
        'unresolved-variable-reference',
        'direct-production-edit'
      ])
    );
  });
});
