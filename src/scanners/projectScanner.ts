import * as fs from 'fs/promises';
import * as path from 'path';
import {
  DependencyKind,
  FabricDependency,
  FabricEnvironment,
  FabricItem,
  FabricScanResult,
  FabricWorkspace,
  normalizeFabricItemType,
  SourceLocation
} from '../models/fabricModels';

const DEFAULT_EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'out', 'dist', '.vscode-test', 'coverage']);
const FABRIC_FILE_EXTENSIONS = new Set(['.json', '.ipynb', '.py', '.sql', '.yml', '.yaml']);
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const VARIABLE_PATTERN = /\$\{([A-Za-z0-9_.:-]+)\}/g;

interface CandidateFile {
  fullPath: string;
  relativePath: string;
}

interface PlatformMetadata {
  [key: string]: unknown;
  id?: unknown;
  logicalId?: unknown;
  displayName?: unknown;
  name?: unknown;
  type?: unknown;
  metadata?: unknown;
  config?: unknown;
}

export class ProjectScanner {
  async scanProject(rootPath: string): Promise<FabricScanResult> {
    const normalizedRoot = path.resolve(rootPath);
    const candidateFiles = await this.collectCandidateFiles(normalizedRoot);
    const workspace = await this.buildWorkspace(normalizedRoot, candidateFiles);

    return {
      rootPath: normalizedRoot,
      scannedAt: new Date().toISOString(),
      workspaces: [workspace],
      filesScanned: candidateFiles.length,
      skippedFiles: 0
    };
  }

  private async collectCandidateFiles(rootPath: string): Promise<CandidateFile[]> {
    const files: CandidateFile[] = [];

    const visit = async (directory: string): Promise<void> => {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!DEFAULT_EXCLUDED_DIRS.has(entry.name)) {
            await visit(path.join(directory, entry.name));
          }
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const fullPath = path.join(directory, entry.name);
        const extension = path.extname(entry.name).toLowerCase();
        if (FABRIC_FILE_EXTENSIONS.has(extension) || entry.name === '.platform') {
          files.push({
            fullPath,
            relativePath: path.relative(rootPath, fullPath)
          });
        }
      }
    };

    await visit(rootPath);
    return files;
  }

  private async buildWorkspace(rootPath: string, files: CandidateFile[]): Promise<FabricWorkspace> {
    const workspaceId = stableId(rootPath);
    const workspaceName = path.basename(rootPath);
    const items = await this.discoverItems(rootPath, workspaceId, files);

    return {
      id: workspaceId,
      name: workspaceName,
      environment: inferEnvironment(workspaceName),
      path: rootPath,
      items
    };
  }

  private async discoverItems(rootPath: string, workspaceId: string, files: CandidateFile[]): Promise<FabricItem[]> {
    const platformFiles = files.filter((file) => path.basename(file.fullPath) === '.platform');
    const itemByPath = new Map<string, FabricItem>();

    for (const file of platformFiles) {
      const text = await fs.readFile(file.fullPath, 'utf8');
      const metadata = parseJsonObject<PlatformMetadata>(text);
      if (!metadata) {
        continue;
      }

      const itemDirectory = path.dirname(file.fullPath);
      const itemId = firstString(metadata.logicalId, metadata.id) ?? stableId(itemDirectory);
      const itemName = firstString(metadata.displayName, metadata.name) ?? path.basename(itemDirectory);
      const itemType = normalizeFabricItemType(metadata.type ?? path.extname(itemDirectory).replace('.', ''));
      const definitionFiles = files.filter((candidate) => candidate.fullPath.startsWith(`${itemDirectory}${path.sep}`));
      const dependencySources = await this.extractDependencies(itemId, definitionFiles);

      itemByPath.set(itemDirectory, {
        id: itemId,
        name: itemName,
        type: itemType,
        workspaceId,
        path: path.relative(rootPath, itemDirectory),
        dependencies: dependencySources,
        definition: metadata,
        metadata: collectMetadata(metadata, definitionFiles)
      });
    }

    if (itemByPath.size > 0) {
      return [...itemByPath.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    return this.discoverFallbackItems(rootPath, workspaceId, files);
  }

  private async discoverFallbackItems(rootPath: string, workspaceId: string, files: CandidateFile[]): Promise<FabricItem[]> {
    const items: FabricItem[] = [];
    for (const file of files.filter((candidate) => path.extname(candidate.fullPath).toLowerCase() === '.json')) {
      const text = await fs.readFile(file.fullPath, 'utf8');
      const json = parseJsonObject<Record<string, unknown>>(text);
      if (!json) {
        continue;
      }

      const id = firstString(json.id, json.logicalId, json.objectId) ?? stableId(file.relativePath);
      const name = firstString(json.displayName, json.name) ?? path.basename(file.fullPath, path.extname(file.fullPath));
      const type = normalizeFabricItemType(json.type ?? json.itemType);
      const explicitDependencies = parseExplicitDependencies(id, json, toSource(file.relativePath, text));
      const inferredDependencies = inferDependenciesFromText(id, text, toSource(file.relativePath, text));

      items.push({
        id,
        name,
        type,
        workspaceId,
        path: file.relativePath,
        dependencies: mergeDependencies([...explicitDependencies, ...inferredDependencies]),
        definition: json,
        metadata: json
      });
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async extractDependencies(fromItemId: string, files: CandidateFile[]): Promise<FabricDependency[]> {
    const dependencies: FabricDependency[] = [];
    for (const file of files) {
      const text = await fs.readFile(file.fullPath, 'utf8');
      const source = toSource(file.relativePath, text);
      const json = parseJsonObject<Record<string, unknown>>(text);
      if (json) {
        dependencies.push(...parseExplicitDependencies(fromItemId, json, source));
      }
      dependencies.push(...inferDependenciesFromText(fromItemId, text, source));
    }
    return mergeDependencies(dependencies);
  }
}

export async function scanLocalProject(rootPath: string): Promise<FabricScanResult> {
  return new ProjectScanner().scanProject(rootPath);
}

function parseExplicitDependencies(fromItemId: string, json: Record<string, unknown>, source: SourceLocation): FabricDependency[] {
  const dependenciesValue = json.dependencies;
  if (!Array.isArray(dependenciesValue)) {
    return [];
  }

  const dependencies: FabricDependency[] = [];
  for (const entry of dependenciesValue) {
    if (!isRecord(entry)) {
      continue;
    }

    const target = firstString(entry.id, entry.itemId, entry.targetId, entry.toItemId, entry.logicalId);
    if (!target) {
      continue;
    }

    dependencies.push({
      fromItemId,
      toItemId: target,
      kind: normalizeDependencyKind(firstString(entry.kind, entry.type)),
      source,
      confidence: 'high',
      label: firstString(entry.name, entry.label)
    });
  }
  return dependencies;
}

function inferDependenciesFromText(fromItemId: string, text: string, source: SourceLocation): FabricDependency[] {
  const dependencies: FabricDependency[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(UUID_PATTERN)) {
    const value = match[0];
    if (value === fromItemId || seen.has(value)) {
      continue;
    }
    seen.add(value);
    dependencies.push({
      fromItemId,
      toItemId: value,
      kind: 'environment-reference',
      source: { ...source, column: match.index ? match.index + 1 : undefined },
      confidence: 'medium',
      label: 'GUID reference'
    });
  }

  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    const value = match[1];
    dependencies.push({
      fromItemId,
      toItemId: value,
      kind: 'variable-reference',
      source: { ...source, column: match.index ? match.index + 1 : undefined },
      confidence: 'medium',
      label: `Variable ${value}`
    });
  }

  return dependencies;
}

function mergeDependencies(dependencies: FabricDependency[]): FabricDependency[] {
  const map = new Map<string, FabricDependency>();
  for (const dependency of dependencies) {
    const key = `${dependency.fromItemId}|${dependency.toItemId}|${dependency.kind}`;
    if (!map.has(key)) {
      map.set(key, dependency);
    }
  }
  return [...map.values()];
}

function collectMetadata(metadata: PlatformMetadata, files: CandidateFile[]): Record<string, unknown> {
  return {
    ...toRecord(metadata.metadata),
    ...toRecord(metadata.config),
    fileCount: files.length,
    sourceFiles: files.map((file) => file.relativePath)
  };
}

function normalizeDependencyKind(value: string | undefined): DependencyKind {
  const normalized = value?.toLowerCase().replace(/[\s_-]/g, '');
  switch (normalized) {
    case 'variable':
    case 'variablereference':
      return 'variable-reference';
    case 'environment':
    case 'environmentreference':
      return 'environment-reference';
    case 'shortcut':
    case 'shortcuttarget':
      return 'shortcut-target';
    case 'semanticmodel':
    case 'semanticmodelbinding':
      return 'semantic-model-binding';
    case 'pipeline':
    case 'pipelineactivity':
      return 'pipeline-activity';
    default:
      return 'item-reference';
  }
}

function inferEnvironment(name: string): FabricEnvironment {
  const normalized = name.toLowerCase();
  if (/\b(prod|production)\b/.test(normalized)) {
    return 'production';
  }
  if (/\b(test|uat|qa)\b/.test(normalized)) {
    return 'test';
  }
  if (/\b(dev|development)\b/.test(normalized)) {
    return 'development';
  }
  return 'unknown';
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function parseJsonObject<T extends Record<string, unknown>>(text: string): T | undefined {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? (value as T) : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toSource(file: string, text: string): SourceLocation {
  return {
    file,
    line: text.length > 0 ? 1 : undefined
  };
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `local-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
