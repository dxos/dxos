---
branch: dm/clever-volta-23tj2l
commit: 2d19054c03135f4a78f40f9f89c91a9a128d42b8
base: bc3520fe90f59b3c986ce116b228a7f4745efee7
mode: fast
createdAt: 2026-10-26T05:42:49.964Z
isFinalized: true
groups: 67
rules: [no-lint-suppression-to-pass]
reviewId: 2d19054c
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2d19054c-1 - ignored - no-lint-suppression-to-pass - packages/common/sql-sqlite/src/internal/opfs-pragmas.node.test.ts:1

## Issues

# WARN 2d19054c-1 no-lint-suppression-to-pass `packages/common/sql-sqlite/src/internal/opfs-pragmas.node.test.ts:1`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.87. The likeliest place is lines 1-15 (`import * as WaSqlite from '@effect/wa-sqlite';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `effect-subpath-imports` flags the Emscripten build `@effect/wa-sqlite/dist/wa-sqlite.mjs`, which has no barrel equivalent; `sqlite-module.node.test.ts` and `sql-storage.node.test.ts` load it with the same disable. The suppression-free `@dxos/wa-sqlite` build ships no types and would need a `@ts-expect-error` instead.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bc3520fe90f59b3c986ce116b228a7f4745efee7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 28 uncertain, 64 clean, 0 unanswered
- left for an agentic reviewer: 32 batch(es)

```text
requests: 47 (18 verdicts re-asked with context the model requested)
estimated input tokens: 176428
billed input tokens: 166365 (cost $0.0070)
measured chars per token: 3.18
```
