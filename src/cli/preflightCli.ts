import * as fs from 'fs/promises';
import * as path from 'path';
import { buildDependencyGraphFromScan } from '../graph/dependencyGraph';
import { RuleFinding } from '../models/fabricModels';
import { generateReleaseReportJson, generateReleaseReportMarkdown } from '../reports/releaseReport';
import { runPreflightChecks } from '../rules/ruleEngine';
import { ProjectScanner } from '../scanners/projectScanner';

export interface PreflightCliResult {
  exitCode: number;
  markdownPath: string;
  jsonPath: string;
  summary: {
    items: number;
    dependencies: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

interface CliOptions {
  command: 'preflight';
  projectPath: string;
  outputPath: string;
  failOn: 'error' | 'warning' | 'never';
  markdown: boolean;
  json: boolean;
}

export async function runPreflightCli(args: string[], stdout = process.stdout, stderr = process.stderr): Promise<PreflightCliResult> {
  const options = parseArgs(args);
  const scanner = new ProjectScanner();
  const scan = await scanner.scanProject(options.projectPath);
  const graph = buildDependencyGraphFromScan(scan);
  const findings = runPreflightChecks(scan.workspaces, graph);
  const graphJson = graph.toJSON();
  const summary = summarize(findings, graphJson.nodes.length, graphJson.edges.length);

  await fs.mkdir(options.outputPath, { recursive: true });
  const markdownPath = path.join(options.outputPath, 'weftguard-release-report.md');
  const jsonPath = path.join(options.outputPath, 'weftguard-release-report.json');
  const input = { scan, graph, findings };

  if (options.markdown) {
    await fs.writeFile(markdownPath, generateReleaseReportMarkdown(input), 'utf8');
  }
  if (options.json) {
    await fs.writeFile(jsonPath, generateReleaseReportJson(input), 'utf8');
  }

  const exitCode = shouldFail(options.failOn, summary) ? 1 : 0;
  stdout.write(`WeftGuard preflight: ${summary.items} items, ${summary.dependencies} dependencies, ${summary.errors} errors, ${summary.warnings} warnings, ${summary.info} info.\n`);
  stdout.write(`Markdown report: ${markdownPath}\n`);
  stdout.write(`JSON report: ${jsonPath}\n`);
  if (exitCode !== 0) {
    stderr.write(`WeftGuard preflight failed because fail-on=${options.failOn} threshold was met.\n`);
  }

  process.exitCode = exitCode;
  return { exitCode, markdownPath, jsonPath, summary };
}

function parseArgs(args: string[]): CliOptions {
  const [command, ...rest] = args;
  if (command !== 'preflight' && command !== undefined) {
    throw new Error(`Unknown command "${command}". Use "weftguard preflight --project <path>".`);
  }

  const options: CliOptions = {
    command: 'preflight',
    projectPath: process.cwd(),
    outputPath: path.resolve(process.cwd(), 'weftguard-reports'),
    failOn: 'error',
    markdown: true,
    json: true
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    switch (arg) {
      case '--project':
      case '-p':
        options.projectPath = path.resolve(requireValue(rest, ++index, arg));
        break;
      case '--out':
      case '-o':
        options.outputPath = path.resolve(requireValue(rest, ++index, arg));
        break;
      case '--fail-on': {
        const value = requireValue(rest, ++index, arg);
        if (value !== 'error' && value !== 'warning' && value !== 'never') {
          throw new Error('--fail-on must be one of: error, warning, never.');
        }
        options.failOn = value;
        break;
      }
      case '--format': {
        const value = requireValue(rest, ++index, arg);
        const formats = new Set(value.split(',').map((part) => part.trim().toLowerCase()));
        options.markdown = formats.has('markdown') || formats.has('md');
        options.json = formats.has('json');
        if (!options.markdown && !options.json) {
          throw new Error('--format must include markdown and/or json.');
        }
        break;
      }
      case '--help':
      case '-h':
        throw new Error(helpText());
      default:
        throw new Error(`Unknown option "${arg}".\n${helpText()}`);
    }
  }

  return options;
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value || value.startsWith('-')) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function summarize(findings: RuleFinding[], items: number, dependencies: number): PreflightCliResult['summary'] {
  return {
    items,
    dependencies,
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    info: findings.filter((finding) => finding.severity === 'info').length
  };
}

function shouldFail(failOn: CliOptions['failOn'], summary: PreflightCliResult['summary']): boolean {
  if (failOn === 'never') {
    return false;
  }
  if (failOn === 'warning') {
    return summary.errors > 0 || summary.warnings > 0;
  }
  return summary.errors > 0;
}

function helpText(): string {
  return `Usage: weftguard preflight [options]

Options:
  -p, --project <path>     Fabric project path to scan. Defaults to cwd.
  -o, --out <path>         Output folder for reports. Defaults to ./weftguard-reports.
      --fail-on <level>    error, warning, or never. Defaults to error.
      --format <formats>   markdown,json; markdown; or json. Defaults to markdown,json.
`;
}
