import { describe, expect, it } from 'vitest';
import { buildDependencyGraph } from '../../src/graph/dependencyGraph';
import { FabricScanResult } from '../../src/models/fabricModels';
import { generateReleaseReportJson, generateReleaseReportMarkdown } from '../../src/reports/releaseReport';

const scan: FabricScanResult = {
  rootPath: 'C:\\Fabric',
  scannedAt: '2026-05-14T00:00:00.000Z',
  filesScanned: 1,
  skippedFiles: 0,
  workspaces: [
    {
      id: 'workspace-1',
      name: 'Fabric Dev',
      environment: 'development',
      path: '.',
      items: [
        {
          id: 'item-1',
          name: 'Notebook',
          type: 'Notebook',
          workspaceId: 'workspace-1',
          dependencies: [],
          metadata: {}
        }
      ]
    }
  ]
};

describe('release reports', () => {
  it('generates Markdown and JSON release evidence', () => {
    const graph = buildDependencyGraph(scan.workspaces);
    const input = {
      scan,
      graph,
      findings: [
        {
          ruleId: 'example',
          title: 'Example finding',
          message: 'Review this item',
          severity: 'warning' as const,
          itemId: 'item-1'
        }
      ]
    };

    expect(generateReleaseReportMarkdown(input)).toContain('WeftGuard Release Report');
    expect(JSON.parse(generateReleaseReportJson(input))).toMatchObject({
      findings: [{ ruleId: 'example' }]
    });
  });
});
