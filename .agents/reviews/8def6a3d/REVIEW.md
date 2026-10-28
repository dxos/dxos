---
branch: dm/wizardly-brown-p4pha9
commit: 8def6a3d473320c2d31036c4757335efbddfc127
base: af8ed263e2ca3bb38652340328f8ada2e0f4ed4b
mode: fast
createdAt: 2026-10-25T05:52:03.395Z
isFinalized: true
groups: 130
rules: [import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding]
reviewId: 8def6a3d
---

_0 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8def6a3d-1 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-ste/src/check/index.ts:1
- 8def6a3d-2 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-ste/src/check/SteCheck.ts:1
- 8def6a3d-3 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-ste/src/index.ts:1
- 8def6a3d-4 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-ste/src/index.ts:1
- 8def6a3d-5 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-ste/src/operations/index.ts:1
- 8def6a3d-6 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-ste/src/operations/SteOperation.ts:1
- 8def6a3d-7 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-ste/src/skills/index.ts:1

## Issues

# WARN 8def6a3d-1 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-ste/src/check/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-6 (`export * as SteCheck from './SteCheck.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8def6a3d-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-ste/src/check/SteCheck.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-12 (`import { WORD_LIST_ENTRIES } from './word-list.ts';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8def6a3d-3 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-ste/src/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-9 (`export * from './check/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8def6a3d-4 namespace-export-with-internal-hiding `packages/plugins/plugin-ste/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-9 (`export * from './check/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8def6a3d-5 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-ste/src/operations/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-6 (`export * as SteOperation from './SteOperation.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8def6a3d-6 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-ste/src/operations/SteOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-11 (`import * as Schema from 'effect/Schema';`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8def6a3d-7 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-ste/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-6 (`export * as SteSkill from './SteSkill.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `af8ed263e2ca3bb38652340328f8ada2e0f4ed4b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 182 uncertain, 593 clean, 0 unanswered
- left for an agentic reviewer: 54 batch(es)

```text
requests: 394 (107 verdicts re-asked with context the model requested)
estimated input tokens: 1791273
billed input tokens: 1784107 (cost $0.0749)
measured chars per token: 3.01
```
