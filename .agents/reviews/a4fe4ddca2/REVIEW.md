---
branch: claude/pr-1440-using-api-716e77
commit: a4fe4ddca237d89e36d90f882d5cc26cdf614924
base: 1b93cb079c2b369a3e69c50c7e74bd0b7da124fb
mode: fast
createdAt: 2026-10-31T00:05:13.962Z
isFinalized: true
groups: 57
rules: [no-casts]
reviewId: a4fe4ddca2
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a4fe4ddca2-1 - ignored - no-casts - packages/common/eslint-plugin-rules/src/rpc-unmanaged-disposal.test.ts:20

## Issues

# ERROR a4fe4ddca2-1 no-casts `packages/common/eslint-plugin-rules/src/rpc-unmanaged-disposal.test.ts:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 20-31 (`describe('rpc-unmanaged-disposal', () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1b93cb079c2b369a3e69c50c7e74bd0b7da124fb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 10 uncertain, 35 clean, 0 unanswered
- left for an agentic reviewer: 21 batch(es)

```text
requests: 19 (8 verdicts re-asked with context the model requested)
estimated input tokens: 80659
billed input tokens: 74330 (cost $0.0031)
measured chars per token: 3.26
```

Resolution: a4fe4ddca2-1 is ignored. The test casts nothing: the only `as` in it is inside the code strings handed to `RuleTester` (`'… as any'`, `satisfies Sink`), which are the input the rule is tested against.
