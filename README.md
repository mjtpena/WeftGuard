# WeftGuard

**WeftGuard** is a VS Code extension for Microsoft Fabric teams who need code-first release confidence: workspace diffs, dependency graphs, deployment preflight checks, environment drift detection, and CI/CD scaffolding before changes hit production.

## Features

- Local scanner for Git-connected Microsoft Fabric projects.
- Dependency graph across Fabric items, variables, environment references, and semantic model bindings.
- Deployment preflight checks for missing dependencies, hardcoded environment IDs, unresolved variables, production drift signals, and unsupported item types.
- VS Code Problems integration for release-blocking findings.
- Fabric release map tree view and polished dashboard webview.
- CI/CD starter generator for GitHub Actions.
- Release report export in Markdown and JSON.

## Installation

Install from the VS Code Marketplace once published, or install the packaged `.vsix` locally with:

```powershell
code --install-extension .\weftguard-0.1.0.vsix
```

## Usage

1. Open a folder containing Microsoft Fabric item definitions.
2. Run `WeftGuard: Scan Current Project`.
3. Run `WeftGuard: Run Deployment Preflight`.
4. Open `WeftGuard: Show Dashboard` or export a release report.

## Marketplace Metadata
- **Categories:** Other, Data Science
- **Keywords:** Microsoft Fabric, Fabric, ALM, CI/CD, deployment, governance

## Target Users
| User | Pain | WeftGuard value |
| --- | --- | --- |
| Fabric engineering lead | Needs repeatable release quality across workspaces | Preflight checks, dependency impact analysis, deployment reports |
| BI platform owner | Needs governance without slowing teams | Rules, drift detection, capacity and environment warnings |
| Analytics consultant | Needs to ship Fabric solutions across clients | Reusable project templates, CI/CD generation, customer-ready reports |
| Enterprise developer | Wants local dev ergonomics | VS Code commands, tree views, diffs, and problem diagnostics |

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for release notes.

## License
[MIT](LICENSE)

---

> The name is intentional: in woven fabric, the **weft** is the cross-thread that binds the material together. WeftGuard protects the cross-workspace, cross-environment threads that hold a Fabric estate together before deployment.
