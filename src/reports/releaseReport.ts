import { DependencyGraph } from '../graph/dependencyGraph';
import { FabricScanResult, RuleFinding } from '../models/fabricModels';

export interface ReleaseReportInput {
  scan: FabricScanResult;
  graph: DependencyGraph;
  findings: RuleFinding[];
}

export function generateReleaseReportMarkdown(input: ReleaseReportInput): string {
  const errorCount = input.findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = input.findings.filter((finding) => finding.severity === 'warning').length;
  const infoCount = input.findings.filter((finding) => finding.severity === 'info').length;
  const graph = input.graph.toJSON();

  const lines = [
    '# WeftGuard Release Report',
    '',
    `**Scanned:** ${input.scan.scannedAt}`,
    `**Root:** \`${input.scan.rootPath}\``,
    `**Workspaces:** ${input.scan.workspaces.length}`,
    `**Items:** ${graph.nodes.length}`,
    `**Dependencies:** ${graph.edges.length}`,
    `**Findings:** ${errorCount} errors, ${warningCount} warnings, ${infoCount} info`,
    '',
    '## Deployment Readiness',
    '',
    errorCount > 0
      ? 'Deployment is **blocked** until error-level findings are resolved.'
      : warningCount > 0
        ? 'Deployment is **review required** because warning-level findings were detected.'
        : 'Deployment is **ready** based on the scanned local project.',
    '',
    '## Findings',
    ''
  ];

  if (input.findings.length === 0) {
    lines.push('No findings detected.');
  } else {
    for (const finding of input.findings) {
      lines.push(`### ${severityIcon(finding.severity)} ${finding.title}`);
      lines.push('');
      lines.push(`- **Rule:** \`${finding.ruleId}\``);
      lines.push(`- **Severity:** ${finding.severity}`);
      if (finding.itemId) {
        lines.push(`- **Item:** \`${finding.itemId}\``);
      }
      if (finding.source?.file) {
        lines.push(`- **Source:** \`${finding.source.file}\``);
      }
      lines.push(`- **Message:** ${finding.message}`);
      lines.push('');
    }
  }

  lines.push('## Dependency Graph');
  lines.push('');
  if (graph.edges.length === 0) {
    lines.push('No dependencies detected.');
  } else {
    lines.push('| From | To | Kind | Confidence |');
    lines.push('| --- | --- | --- | --- |');
    for (const edge of graph.edges) {
      lines.push(`| \`${edge.from}\` | \`${edge.to}\` | ${edge.kind} | ${edge.confidence} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function generateReleaseReportJson(input: ReleaseReportInput): string {
  return `${JSON.stringify(
    {
      scan: input.scan,
      graph: input.graph.toJSON(),
      findings: input.findings
    },
    null,
    2
  )}\n`;
}

function severityIcon(severity: RuleFinding['severity']): string {
  switch (severity) {
    case 'error':
      return 'Error:';
    case 'warning':
      return 'Warning:';
    case 'info':
      return 'Info:';
  }
}
