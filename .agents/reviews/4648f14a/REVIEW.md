---
branch: dm/agent-13-oct-x8ehi8
commit: 4648f14ab4e417593966b67477374cdc6441de88
base: 5490cbc2c14a9e93639c8515fd71fcad27ef8b9f
mode: fast
createdAt: 2026-10-13T13:30:30.974Z
isFinalized: true
groups: 74
rules: [obj-update-push, one-test-suite-per-module, per-test-mutable-fixtures]
reviewId: 4648f14a
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4648f14a-1 - resolved - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/interview.test.ts:60
- 4648f14a-2 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/read-source.test.ts:69
- 4648f14a-3 - ignored - obj-update-push - packages/plugins/plugin-agent/src/operations/resolve-entity.ts:39

## Issues

# WARN 4648f14a-1 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/interview.test.ts:60`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.83. The likeliest place is lines 60-71 (`describe('Interview', () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4648f14a-2 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/read-source.test.ts:69`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 69-83 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4648f14a-3 obj-update-push `packages/plugins/plugin-agent/src/operations/resolve-entity.ts:39`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.82. The likeliest place is lines 39-50 (`if (match) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5490cbc2c14a9e93639c8515fd71fcad27ef8b9f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 190 uncertain, 210 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 239 (128 verdicts re-asked with context the model requested)
estimated input tokens: 1730363
billed input tokens: 1615113 (cost $0.0678)
measured chars per token: 3.21
```
