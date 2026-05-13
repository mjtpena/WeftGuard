import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ProjectScanner } from '../../src/scanners/projectScanner';

describe('ProjectScanner', () => {
  it('discovers Fabric item folders with .platform metadata and dependencies', async () => {
    const root = await mkdtemp(join(tmpdir(), 'weftguard-'));
    try {
      const itemDir = join(root, 'SalesLakehouse.Lakehouse');
      await mkdir(itemDir, { recursive: true });
      await writeFile(
        join(itemDir, '.platform'),
        JSON.stringify({
          logicalId: 'lakehouse-1',
          displayName: 'Sales Lakehouse',
          type: 'Lakehouse'
        })
      );
      await writeFile(
        join(itemDir, 'definition.json'),
        JSON.stringify({
          dependencies: [{ targetId: 'warehouse-1', type: 'item-reference' }],
          connectionId: '11111111-1111-4111-8111-111111111111',
          variable: '${ProdLakehouseId}'
        })
      );

      const result = await new ProjectScanner().scanProject(root);
      const item = result.workspaces[0].items[0];

      expect(result.filesScanned).toBe(2);
      expect(item.name).toBe('Sales Lakehouse');
      expect(item.type).toBe('Lakehouse');
      expect(item.dependencies.map((dependency) => dependency.toItemId)).toEqual(
        expect.arrayContaining(['warehouse-1', '11111111-1111-4111-8111-111111111111', 'ProdLakehouseId'])
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('falls back to JSON item files when .platform metadata is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'weftguard-'));
    try {
      await writeFile(
        join(root, 'report.json'),
        JSON.stringify({
          id: 'report-1',
          name: 'Executive Report',
          type: 'Report',
          dependencies: [{ id: 'semantic-model-1', type: 'semantic-model-binding' }]
        })
      );

      const result = await new ProjectScanner().scanProject(root);

      expect(result.workspaces[0].items).toHaveLength(1);
      expect(result.workspaces[0].items[0].dependencies[0].toItemId).toBe('semantic-model-1');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
