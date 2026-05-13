import * as vscode from 'vscode';
import { WeftGuardState } from '../state/weftGuardState';

export function showWeftGuardDashboard(context: vscode.ExtensionContext, state: WeftGuardState): void {
  const panel = vscode.window.createWebviewPanel(
    'weftguardDashboard',
    'WeftGuard Release Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [context.extensionUri]
    }
  );

  panel.webview.html = getDashboardHtml(panel.webview, state);
}

function getDashboardHtml(webview: vscode.Webview, state: WeftGuardState): string {
  const nonce = getNonce();
  const snapshot = state.value;
  const graph = snapshot.graph?.toJSON() ?? { nodes: [], edges: [] };
  const errorCount = snapshot.findings.filter((finding) => finding.severity === 'error').length;
  const warningCount = snapshot.findings.filter((finding) => finding.severity === 'warning').length;
  const itemCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  const cspSource = webview.cspSource;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>WeftGuard Release Dashboard</title>
  <style>
    :root {
      --card: var(--vscode-editor-background);
      --border: var(--vscode-panel-border);
      --text: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --accent: var(--vscode-textLink-foreground);
      --error: var(--vscode-errorForeground);
      --warning: var(--vscode-editorWarning-foreground);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(0, 120, 212, .22), transparent 30rem),
        var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
    }
    .shell { max-width: 1180px; margin: 0 auto; padding: 32px; }
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: center;
      margin-bottom: 24px;
    }
    .eyebrow { color: var(--accent); font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: 40px; line-height: 1.05; margin: 8px 0; }
    .subtitle { max-width: 740px; color: var(--muted); font-size: 15px; line-height: 1.6; }
    .status {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 10px 14px;
      background: rgba(255,255,255,.04);
      font-weight: 700;
    }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
    .card {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: color-mix(in srgb, var(--card) 94%, transparent);
      box-shadow: 0 18px 54px rgba(0,0,0,.18);
      padding: 18px;
    }
    .metric { font-size: 32px; font-weight: 800; margin-top: 8px; }
    .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
    .main { display: grid; grid-template-columns: 1.35fr .65fr; gap: 16px; }
    .graph {
      min-height: 430px;
      overflow: hidden;
      position: relative;
    }
    .node {
      position: absolute;
      width: 150px;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 10px;
      background: var(--vscode-editorWidget-background);
      transform: translate(-50%, -50%);
      box-shadow: 0 10px 30px rgba(0,0,0,.20);
    }
    .node strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .node span { color: var(--muted); font-size: 12px; }
    .empty {
      display: grid;
      min-height: 360px;
      place-items: center;
      color: var(--muted);
      text-align: center;
      border: 1px dashed var(--border);
      border-radius: 16px;
    }
    .finding { border-left: 3px solid var(--accent); padding: 10px 0 10px 12px; margin: 10px 0; }
    .finding.error { border-left-color: var(--error); }
    .finding.warning { border-left-color: var(--warning); }
    .finding-title { font-weight: 700; }
    .finding-message { color: var(--muted); margin-top: 4px; line-height: 1.45; }
    @media (max-width: 900px) {
      .grid, .main, .hero { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div>
        <div class="eyebrow">Microsoft Fabric ALM</div>
        <h1>Release confidence before production.</h1>
        <div class="subtitle">WeftGuard scans Fabric project definitions, maps dependencies, flags deployment risk, and exports release evidence for code-first Fabric teams.</div>
      </div>
      <div class="status">${readinessLabel(errorCount, warningCount)}</div>
    </section>

    <section class="grid">
      <div class="card"><div class="label">Items</div><div class="metric">${itemCount}</div></div>
      <div class="card"><div class="label">Dependencies</div><div class="metric">${edgeCount}</div></div>
      <div class="card"><div class="label">Errors</div><div class="metric">${errorCount}</div></div>
      <div class="card"><div class="label">Warnings</div><div class="metric">${warningCount}</div></div>
    </section>

    <section class="main">
      <div class="card graph" id="graph" aria-label="Dependency graph"></div>
      <div class="card">
        <div class="label">Findings</div>
        ${renderFindings(snapshot.findings)}
      </div>
    </section>
  </main>
  <script nonce="${nonce}">
    const graph = ${JSON.stringify(graph)};
    const container = document.getElementById('graph');
    if (!graph.nodes.length) {
      container.innerHTML = '<div class="empty"><div><strong>No scan loaded</strong><br>Run WeftGuard: Scan Current Project to build the release map.</div></div>';
    } else {
      const width = container.clientWidth || 720;
      const height = 430;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.34;
      container.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true"></svg>';
      const svg = container.querySelector('svg');
      const positions = new Map();
      graph.nodes.forEach((node, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(graph.nodes.length, 1) - Math.PI / 2;
        positions.set(node.id, { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius });
      });
      graph.edges.forEach(edge => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
        line.setAttribute('stroke', 'var(--border)'); line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
      });
      graph.nodes.forEach(node => {
        const position = positions.get(node.id);
        const div = document.createElement('div');
        div.className = 'node';
        div.style.left = position.x + 'px';
        div.style.top = position.y + 'px';
        div.innerHTML = '<strong title="' + escapeHtml(node.label) + '">' + escapeHtml(node.label) + '</strong><span>' + escapeHtml(node.type) + '</span>';
        container.appendChild(div);
      });
    }
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
  </script>
</body>
</html>`;
}

function renderFindings(findings: WeftGuardState['value']['findings']): string {
  if (findings.length === 0) {
    return '<div class="empty"><div><strong>No findings</strong><br>Run deployment preflight to populate release risks.</div></div>';
  }

  return findings
    .map(
      (finding) => `<article class="finding ${finding.severity}">
        <div class="finding-title">${escapeHtml(finding.title)}</div>
        <div class="finding-message">${escapeHtml(finding.message)}</div>
      </article>`
    )
    .join('');
}

function readinessLabel(errors: number, warnings: number): string {
  if (errors > 0) {
    return 'Blocked';
  }
  if (warnings > 0) {
    return 'Review required';
  }
  return 'Ready';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let index = 0; index < 32; index += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
