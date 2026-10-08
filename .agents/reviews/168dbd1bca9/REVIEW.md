---
branch: claude/react-ui-canvas-style-updates-cb989e
commit: 168dbd1bca9ef613b9a3c22716dc564c3cc3d251
base: 929d683da3a6e0344ab0a2effc36c14d940052c4
mode: fast
createdAt: 2026-10-07T20:57:20.040Z
isFinalized: true
groups: 52
rules: [import-as-namespace-is-all-or-nothing]
reviewId: 168dbd1bca9
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 168dbd1bca9-1 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-illustrator/src/types/Drawing.ts:1

## Issues

# WARN 168dbd1bca9-1 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-illustrator/src/types/Drawing.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 168dbd1bca9-1 ignored: this PR adds only a doc comment to `Drawing.ts`; its module layout predates it.

### System One pass

- model: jev-latest
- base for context: `929d683da3a6e0344ab0a2effc36c14d940052c4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 52 uncertain, 62 clean, 0 unanswered
- left for an agentic reviewer: 31 batch(es)

```text
requests: 66 (27 verdicts re-asked with context the model requested)
estimated input tokens: 413455
billed input tokens: 397698 (cost $0.0167)
measured chars per token: 3.12
```
