export type FabricEnvironment = 'development' | 'test' | 'production' | 'unknown';

export type FabricItemType =
  | 'Lakehouse'
  | 'Warehouse'
  | 'Notebook'
  | 'DataPipeline'
  | 'SemanticModel'
  | 'Report'
  | 'Shortcut'
  | 'VariableLibrary'
  | 'Dataflow'
  | 'Eventhouse'
  | 'KQLDatabase'
  | 'Unknown';

export type DependencyKind =
  | 'item-reference'
  | 'variable-reference'
  | 'environment-reference'
  | 'shortcut-target'
  | 'semantic-model-binding'
  | 'pipeline-activity';

export type FindingSeverity = 'error' | 'warning' | 'info';

export interface SourceLocation {
  file: string;
  line?: number;
  column?: number;
}

export interface FabricDependency {
  fromItemId: string;
  toItemId: string;
  kind: DependencyKind;
  source?: SourceLocation;
  confidence: 'high' | 'medium' | 'low';
  label?: string;
}

export interface FabricItem {
  id: string;
  name: string;
  type: FabricItemType;
  workspaceId: string;
  path?: string;
  dependencies: FabricDependency[];
  definition?: unknown;
  metadata: Record<string, unknown>;
}

export interface FabricWorkspace {
  id: string;
  name: string;
  environment: FabricEnvironment;
  path: string;
  items: FabricItem[];
}

export interface FabricScanResult {
  rootPath: string;
  scannedAt: string;
  workspaces: FabricWorkspace[];
  filesScanned: number;
  skippedFiles: number;
}

export interface RuleFinding {
  ruleId: string;
  title: string;
  message: string;
  severity: FindingSeverity;
  workspaceId?: string;
  itemId?: string;
  source?: SourceLocation;
  helpUri?: string;
}

export function normalizeFabricItemType(value: unknown): FabricItemType {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[\s_-]/g, '');
  switch (raw) {
    case 'lakehouse':
      return 'Lakehouse';
    case 'warehouse':
      return 'Warehouse';
    case 'notebook':
      return 'Notebook';
    case 'datapipeline':
    case 'pipeline':
      return 'DataPipeline';
    case 'semanticmodel':
    case 'dataset':
      return 'SemanticModel';
    case 'report':
      return 'Report';
    case 'shortcut':
      return 'Shortcut';
    case 'variablelibrary':
      return 'VariableLibrary';
    case 'dataflow':
    case 'dataflowgen2':
      return 'Dataflow';
    case 'eventhouse':
      return 'Eventhouse';
    case 'kqldatabase':
      return 'KQLDatabase';
    default:
      return 'Unknown';
  }
}
