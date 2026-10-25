---
branch: dm/confident-maxwell-narknv
commit: 8f1049d4511e1c0e6389e0468b3c3d1db8c0d470
base: 9d66bcd4eb0db0a525c2eaa101acbf7111984262
mode: fast
createdAt: 2026-10-22T09:49:04.964Z
isFinalized: true
groups: 140
rules: [import-as-namespace-is-all-or-nothing, named-durations-and-budgets]
reviewId: 8f1049d4
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8f1049d4-1 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-debug/src/samples/index.ts:1
- 8f1049d4-2 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-debug/src/samples/plugin/index.ts:1
- 8f1049d4-3 - ignored - named-durations-and-budgets - packages/plugins/plugin-projects/src/templates/composer-plugin.ts:148

## Issues

# WARN 8f1049d4-1 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-debug/src/samples/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-15 (`export * as FieldstoneSpace from './fieldstone/FieldstoneSpace.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** every re-export in the barrel names its module (`export * as WorldClockSpace from './world-clock/WorldClockSpace.ts'`), and each of those modules carries `// @import-as-namespace`; the four agree.

# WARN 8f1049d4-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-debug/src/samples/plugin/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-6 (`export * as PluginSpace from './PluginSpace.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Resolved:** `PluginSpace.PluginConfig` was a namespace-prefixed member; it is now `PluginSpace.Config`.

# WARN 8f1049d4-3 named-durations-and-budgets `packages/plugins/plugin-projects/src/templates/composer-plugin.ts:148`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.94. The likeliest place is lines 148-159 (``Fetch it with \`curl -fsSL https://raw.githubusercontent.com/dxos/dxos/${too...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** the flagged timeouts are World Clock's existing prompt text, which this PR does not change (it only exports helpers from the file); the plugin templates' own timeouts are named (`INSTALL_TIMEOUT_MS`, `PUBLISH_TIMEOUT_MS`).

## Appendix

### System One pass

- model: jev-latest
- base for context: `9d66bcd4eb0db0a525c2eaa101acbf7111984262`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 287 uncertain, 422 clean, 0 unanswered
- left for an agentic reviewer: 67 batch(es)

```text
requests: 425 (189 verdicts re-asked with context the model requested)
estimated input tokens: 1970838
billed input tokens: 1804763 (cost $0.0758)
measured chars per token: 3.28
```
