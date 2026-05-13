# WeftGuard Product and Technical Plan

## Executive decision

Build **WeftGuard**, a commercial VS Code extension for Microsoft Fabric application lifecycle management. The product should help teams understand what changed, what depends on what, what will break, and whether a Fabric workspace is ready to deploy.

The name is deliberately distinctive. The weft is the cross-thread in woven fabric; WeftGuard protects the dependency threads between Fabric workspaces, items, environments, and releases.

This is a better commercial bet than a generic Fabric explorer because enterprises pay for release safety, governance, auditability, and repeatable delivery. The extension should become the developer cockpit for Fabric ALM.

## Market need

Microsoft Fabric consolidates analytics workloads into one SaaS platform, but that breadth creates operational complexity:

- Fabric workspaces contain many item types with hidden or indirect dependencies.
- Git integration makes changes reviewable, but teams still need semantic validation beyond text diffs.
- Deployment pipelines automate promotion, but teams need preflight checks before deployment.
- Variable libraries and environment-specific IDs reduce manual configuration, but drift and broken references are common release risks.
- Fabric REST APIs, Fabric CLI, `fabric-cicd`, and MCP servers expose automation surfaces, but developers need a cohesive VS Code workflow.

The commercial buyer is not buying a nicer tree view. They are buying fewer failed releases, faster promotion, better governance, and confidence that Fabric is being run like software.

## Positioning

**Tagline:** Ship Microsoft Fabric changes with confidence.

**Category:** Fabric DevOps, ALM, governance, and deployment intelligence for VS Code.

**Primary promise:** Before a Fabric change reaches production, WeftGuard explains the blast radius, validates deployment readiness, and generates repeatable release automation.

## Competitive landscape

| Tooling | Strength | Gap WeftGuard fills |
| --- | --- | --- |
| Fabric portal | Native management and deployment UX | Not optimized for local developer review loops |
| Fabric Git integration | Source control for workspace items | Limited semantic validation and dependency intelligence |
| Deployment pipelines | Promotion across environments | Needs preflight risk checks and better local visibility |
| Fabric CLI | Scriptable Fabric operations | Low-level command surface, not an ALM cockpit |
| `fabric-cicd` | Code-first automation library | Needs VS Code UX, rule packs, reports, and onboarding |
| Fabric MCP servers | AI/tool access to Fabric | Not a dedicated release-quality product |

WeftGuard should integrate with official tools instead of competing with them.

## Product pillars

### 1. Workspace intelligence

- Connect to Fabric workspaces.
- Show items, folders, permissions metadata, Git status, deployment pipeline stage, and relevant item definitions.
- Support offline/local scan of Git-connected Fabric definitions where possible.

### 2. Dependency graph

- Infer links between notebooks, lakehouses, warehouses, pipelines, semantic models, reports, shortcuts, variables, and environment-specific resources.
- Render a graph in a VS Code webview.
- Highlight cross-workspace and production dependencies.

### 3. Deployment preflight

- Validate missing dependencies.
- Detect hardcoded workspace IDs, lakehouse IDs, connection strings, and environment-specific references.
- Flag unsupported or partially supported item types.
- Warn when test/prod drift exists.
- Check deployment rules and variable references.
- Surface findings in VS Code Problems and in a release report.

### 4. Environment compare

- Compare dev/test/prod workspaces or deployment pipeline stages.
- Show added, removed, changed, and drifted items.
- Identify changes that are not represented in Git.

### 5. CI/CD scaffolding

- Generate GitHub Actions and Azure Pipelines templates.
- Support Fabric CLI, Fabric REST APIs, or `fabric-cicd` as execution backends.
- Create service-principal setup checklist without storing secrets.

### 6. Commercial governance layer

- Custom rule packs.
- Organization policy baselines.
- Risk scoring.
- Drift history.
- Pull request annotations.
- Markdown/JSON/HTML audit reports.
- Consulting-friendly project templates.

## MVP command set

| Command | Outcome |
| --- | --- |
| `WeftGuard: Connect to Fabric` | Authenticates and selects tenant/workspace |
| `WeftGuard: Scan Current Project` | Parses local Fabric item definitions |
| `WeftGuard: Load Workspace Inventory` | Pulls remote workspace metadata |
| `WeftGuard: Build Dependency Graph` | Creates graph and impact analysis |
| `WeftGuard: Run Deployment Preflight` | Emits diagnostics and report |
| `WeftGuard: Compare Environments` | Compares selected workspaces or stages |
| `WeftGuard: Generate CI/CD Pipeline` | Creates GitHub Actions/Azure Pipelines starter workflow |
| `WeftGuard: Export Release Report` | Writes Markdown/JSON report |

## Technical architecture

Use a TypeScript VS Code extension with a clean core-service boundary.

| Layer | Responsibility |
| --- | --- |
| VS Code extension host | Commands, tree views, diagnostics, status bar, configuration |
| Fabric auth adapter | Auth via Fabric CLI initially, later direct Entra/MSAL support |
| Fabric API client | Workspaces, items, folders, permissions, deployment pipelines, Git status |
| Local project scanner | Reads Git-connected Fabric item definitions from the workspace |
| Dependency engine | Builds graph edges and impact paths |
| Rule engine | Runs preflight checks and maps issues to severity |
| Report generator | Produces Markdown/JSON artifacts for PRs and releases |
| Webviews | Graph viewer, environment diff, release dashboard |
| CI generator | Emits GitHub Actions and Azure Pipelines templates |

Keep scanners and rules pure and testable. VS Code UI should be a thin shell over the core services.

## Proposed repository structure

```text
WeftGuard/
  package.json
  README.md
  PRODUCT_PLAN.md
  src/
    extension.ts
    commands/
    fabric/
      auth.ts
      client.ts
      cliAdapter.ts
    scanners/
      localProjectScanner.ts
      workspaceScanner.ts
    graph/
      dependencyGraph.ts
      impactAnalysis.ts
    rules/
      ruleEngine.ts
      builtInRules.ts
    reports/
      releaseReport.ts
    webview/
      graphView.ts
      dashboardView.ts
  tests/
    scanners/
    graph/
    rules/
    reports/
```

## Built-in rule candidates

| Rule | Severity | Commercial value |
| --- | --- | --- |
| Hardcoded environment ID | Error | Prevents broken promotion across workspaces |
| Missing referenced item | Error | Catches failed deployments before runtime |
| Prod workspace drift | Warning/Error | Protects release integrity |
| Unsupported item type in pipeline | Warning | Avoids false deployment confidence |
| Shortcut target changed | Warning | Catches OneLake dependency risk |
| Variable reference unresolved | Error | Validates Fabric variable-library usage |
| Direct production edit detected | Warning/Error | Governance and audit control |
| Capacity-sensitive operation | Info/Warning | Helps platform owners manage cost and reliability |

## MVP implementation sequence

1. Create VS Code extension scaffold with compile, test, package, and local install scripts.
2. Implement local Fabric project scanner and typed item model.
3. Implement Fabric CLI-backed authentication and workspace inventory loading.
4. Implement dependency graph service with unit tests.
5. Implement built-in rule engine and VS Code diagnostics.
6. Implement deployment preflight report export.
7. Add graph and diff webviews.
8. Add CI/CD template generation.
9. Package, test, and publish as a free preview.
10. Add paid/pro governance features after validating demand.

## Business model

Start with a free marketplace extension that proves the wedge:

- Free: local scan, workspace inventory, basic dependency graph, built-in preflight, Markdown report.
- Pro: custom rules, environment drift history, PR annotations, advanced graph filters, CI/CD templates, service-principal onboarding, HTML reports.
- Team/Enterprise: shared policy packs, compliance exports, managed templates, consulting support, multi-tenant/customer rollout patterns.

The consulting angle is strong: every Fabric implementation needs ALM conventions, workspace promotion, and governance. The extension can be both a product and a delivery accelerator.

## Success metrics

- Users can run a useful preflight without reading Fabric API documentation.
- The extension finds at least one actionable deployment risk in real customer workspaces.
- Release reports are clear enough to attach to PRs or change approvals.
- Setup works with existing Fabric CLI authentication before direct MSAL auth is added.
- Core scanner/rule tests cover representative Fabric item definitions.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Fabric APIs and item definitions evolve quickly | Version adapters and keep scanners tolerant but explicit about unsupported types |
| Some dependencies are not exposed cleanly | Combine API metadata, local definitions, and rule heuristics; report confidence levels |
| Authentication complexity slows adoption | Start with Fabric CLI auth; add direct Entra auth later |
| Official tooling may add similar features | Differentiate with VS Code workflow, reports, rules, and commercial governance packs |
| Marketplace trust barrier | Publish as transparent, local-first, no-secret-storage tooling with clear privacy docs |

## CTO notes

The product should not be an AI gimmick. AI can help explain findings later, especially through Fabric MCP integration, but the foundation must be deterministic scanners, typed models, tests, and reliable reports.

The first demo should show a real Fabric project with a broken environment reference, a missing dependency, and a dev/prod drift warning. If that demo is compelling, the product has a credible commercial wedge.

