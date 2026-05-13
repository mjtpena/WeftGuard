import { DependencyGraph } from '../graph/dependencyGraph';
import { FabricItem, FabricWorkspace, RuleFinding } from '../models/fabricModels';

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const VARIABLE_PATTERN = /^\$\{[A-Za-z0-9_.:-]+\}$/;

export interface RuleContext {
  workspaces: FabricWorkspace[];
  graph: DependencyGraph;
}

export interface Rule {
  id: string;
  title: string;
  run(context: RuleContext): RuleFinding[];
}

export class RuleEngine {
  constructor(private readonly rules: Rule[] = builtInRules) {}

  run(context: RuleContext): RuleFinding[] {
    return this.rules.flatMap((rule) => rule.run(context));
  }
}

export const builtInRules: Rule[] = [
  {
    id: 'missing-reference',
    title: 'Missing referenced Fabric item',
    run: ({ graph }) =>
      graph.getUnresolvedDependencies().map((edge) => ({
        ruleId: 'missing-reference',
        title: 'Missing referenced Fabric item',
        message: `Dependency target "${edge.to}" is not present in the scanned Fabric project.`,
        severity: 'error',
        itemId: edge.from
      }))
  },
  {
    id: 'hardcoded-environment-id',
    title: 'Hardcoded environment identifier',
    run: ({ workspaces }) =>
      flatItems(workspaces).flatMap(({ workspace, item }) => {
        const serialized = JSON.stringify({ metadata: item.metadata, definition: item.definition });
        return UUID_PATTERN.test(serialized)
          ? [
              {
                ruleId: 'hardcoded-environment-id',
                title: 'Hardcoded environment identifier',
                message: `${item.name} contains a GUID-like value. Replace environment-specific IDs with Fabric variables or deployment rules before promotion.`,
                severity: 'warning',
                workspaceId: workspace.id,
                itemId: item.id,
                source: item.path ? { file: item.path } : undefined,
                helpUri: 'https://learn.microsoft.com/en-us/fabric/cicd/cicd-overview'
              } satisfies RuleFinding
            ]
          : [];
      })
  },
  {
    id: 'unresolved-variable-reference',
    title: 'Unresolved variable reference',
    run: ({ workspaces, graph }) => {
      const variableLibraryNames = new Set(
        flatItems(workspaces)
          .filter(({ item }) => item.type === 'VariableLibrary')
          .map(({ item }) => item.name)
      );

      return graph.getVariableReferences().flatMap((edge) => {
        if (variableLibraryNames.has(edge.to)) {
          return [];
        }

        return [
          {
            ruleId: 'unresolved-variable-reference',
            title: 'Unresolved variable reference',
            message: `Variable reference "${edge.to}" was found but no matching variable library item was detected in the scan.`,
            severity: 'warning',
            itemId: edge.from
          } satisfies RuleFinding
        ];
      });
    }
  },
  {
    id: 'direct-production-edit',
    title: 'Possible direct production edit',
    run: ({ workspaces }) =>
      flatItems(workspaces).flatMap(({ workspace, item }) => {
        if (workspace.environment !== 'production' || !hasDirtyGitSignal(item)) {
          return [];
        }

        return [
          {
            ruleId: 'direct-production-edit',
            title: 'Possible direct production edit',
            message: `${item.name} appears changed in a production workspace. Confirm the change came through Git/deployment pipeline promotion.`,
            severity: 'warning',
            workspaceId: workspace.id,
            itemId: item.id,
            source: item.path ? { file: item.path } : undefined
          } satisfies RuleFinding
        ];
      })
  },
  {
    id: 'unsupported-item-type',
    title: 'Unsupported or unknown Fabric item type',
    run: ({ workspaces }) =>
      flatItems(workspaces).flatMap(({ workspace, item }) =>
        item.type === 'Unknown'
          ? [
              {
                ruleId: 'unsupported-item-type',
                title: 'Unsupported or unknown Fabric item type',
                message: `${item.name} has an unknown item type. Review before relying on automated deployment validation.`,
                severity: 'info',
                workspaceId: workspace.id,
                itemId: item.id,
                source: item.path ? { file: item.path } : undefined
              } satisfies RuleFinding
            ]
          : []
      )
  }
];

export function runPreflightChecks(workspaces: FabricWorkspace[], graph: DependencyGraph): RuleFinding[] {
  return new RuleEngine().run({ workspaces, graph });
}

function flatItems(workspaces: FabricWorkspace[]): Array<{ workspace: FabricWorkspace; item: FabricItem }> {
  return workspaces.flatMap((workspace) => workspace.items.map((item) => ({ workspace, item })));
}

function hasDirtyGitSignal(item: FabricItem): boolean {
  const status = item.metadata.gitStatus ?? item.metadata.status ?? item.metadata.changeState;
  if (typeof status === 'string') {
    return /modified|changed|dirty|uncommitted/i.test(status);
  }

  const serialized = JSON.stringify(item.metadata);
  return VARIABLE_PATTERN.test(serialized);
}
