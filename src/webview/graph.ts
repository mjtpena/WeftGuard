import { DependencyGraph } from '../graph/dependencyGraph';

export function serializeGraph(graph: DependencyGraph): string {
  return JSON.stringify(graph.toJSON());
}
