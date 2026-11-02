---
branch: dm/confident-maxwell-narknv
commit: 5de4115050ac66a1622b33d2d296cc60b0c01ee6
base: 8ad08cb2be9afbc854637512e3fa36d633216698
mode: fast
createdAt: 2026-11-02T14:24:30.169Z
isFinalized: true
groups: 93
rules: [import-as-namespace-is-all-or-nothing, named-durations-and-budgets]
reviewId: 5de4115050
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5de4115050-1 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-debug/src/samples/plugin/index.ts:1
- 5de4115050-2 - ignored - named-durations-and-budgets - packages/plugins/plugin-projects/src/templates/composer-plugin.ts:237

## Issues

# WARN 5de4115050-1 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-debug/src/samples/plugin/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as PluginSpace from './PluginSpace.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** the four agree: `PluginSpace.ts` carries `// @import-as-namespace`, the barrel re-exports it as `export * as PluginSpace from './PluginSpace.ts'`, and both consumers (`ShogiSpace.ts`, `WorldClockSpace.ts`) import `{ PluginSpace }` and reach members through it.

# WARN 5de4115050-2 named-durations-and-budgets `packages/plugins/plugin-projects/src/templates/composer-plugin.ts:237`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.93. The likeliest place is lines 237-248 (``Fetch it with \`curl -fsSL https://raw.githubusercontent.com/dxos/dxos/${too...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** the flagged `timeout` of 900000 is World Clock's existing prompt text, which this PR does not change (it only exports helpers from the file); the plugin templates' own timeouts are named (`INSTALL_TIMEOUT_MS`, `PUBLISH_TIMEOUT_MS`).

## Appendix

### System One pass

- model: jev-latest
- base for context: `8ad08cb2be9afbc854637512e3fa36d633216698`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 261 uncertain, 378 clean, 0 unanswered
- left for an agentic reviewer: 61 batch(es)

```text
requests: 381 (170 verdicts re-asked with context the model requested)
estimated input tokens: 1923726
billed input tokens: 1764380 (cost $0.0741)
measured chars per token: 3.27
```
