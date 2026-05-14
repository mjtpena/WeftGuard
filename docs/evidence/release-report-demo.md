# WeftGuard Release Report Demo

This is the evidence output from a sample Microsoft Fabric project scanned by WeftGuard.

**Scenario:** a production-like Fabric project contains a report that references a missing semantic model, includes a GUID-like environment-specific value, and uses an unresolved `${ProdLakehouseId}` variable.

## Summary

| Metric | Value |
| --- | ---: |
| Workspaces | 1 |
| Items | 2 |
| Dependencies | 3 |
| Errors | 2 |
| Warnings | 1 |

## Deployment Readiness

Deployment is **blocked** until error-level findings are resolved.

## Findings

### Error: Missing referenced Fabric item

- **Rule:** `missing-reference`
- **Severity:** error
- **Item:** `report-1`
- **Message:** Dependency target `missing-model` is not present in the scanned Fabric project.

### Error: Missing referenced Fabric item

- **Rule:** `missing-reference`
- **Severity:** error
- **Item:** `report-1`
- **Message:** Dependency target `11111111-1111-4111-8111-111111111111` is not present in the scanned Fabric project.

### Warning: Unresolved variable reference

- **Rule:** `unresolved-variable-reference`
- **Severity:** warning
- **Item:** `report-1`
- **Message:** Variable reference `ProdLakehouseId` was found but no matching variable library item was detected in the scan.

## Dependency Graph

| From | To | Kind | Confidence |
| --- | --- | --- | --- |
| `report-1` | `missing-model` | semantic-model-binding | high |
| `report-1` | `11111111-1111-4111-8111-111111111111` | environment-reference | medium |
| `report-1` | `ProdLakehouseId` | variable-reference | medium |

