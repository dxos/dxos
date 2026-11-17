---
branch: worktree-dm-skill-token-no-secret
commit: 7d41c31352e7091155530eb3862d14b5004267a4
base: 524906089ef496b70bf7b8012df48a700816940a
mode: fast
createdAt: 2026-11-11T15:40:37.968Z
isFinalized: true
groups: 84
rules: [code-not-in-strings, effect-fn-not-hand-wrapped-gen, flat-layer-composition, no-try-catch-in-effect-code]
reviewId: 7d41c313
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7d41c313-1 - ignored - code-not-in-strings - packages/core/compute/assistant-evals/src/mcp-host.test.ts:136
- 7d41c313-2 - ignored - code-not-in-strings - packages/core/compute/mcp-server/src/McpServer.test.ts:709
- 7d41c313-3 - ignored - flat-layer-composition - packages/core/compute/mcp-server/src/McpServer.test.ts:1079
- 7d41c313-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/mcp-server/src/McpServer.ts:865
- 7d41c313-5 - ignored - no-try-catch-in-effect-code - packages/core/compute/mcp-server/src/McpServer.ts:1209

## Issues

# WARN 7d41c313-1 code-not-in-strings `packages/core/compute/assistant-evals/src/mcp-host.test.ts:136`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 136-147 (`"yield* loadSkill('tasks');",`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

Ignored: outside this diff, and not a violation on its merits. This diff's hunks in this file are at
lines 25, 90 and 107 (a removed `SKILL_SECRET` constant and the `skillGate()` call); line 136 is a
pre-existing code-mode program the test feeds to `runScript`, where the program text IS the input
under test, so it cannot live in a real file.

# WARN 7d41c313-2 code-not-in-strings `packages/core/compute/mcp-server/src/McpServer.test.ts:709`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.91. The likeliest place is lines 709-732 (`for (const title of ['a', 'b', 'c']) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

Ignored: outside this diff. This diff's hunks in this file are at lines 134 and 284, both one-line
`skillGate()` calls; the flagged range is pre-existing test code, and the locator's own confidence
is 0.32.

# WARN 7d41c313-3 flat-layer-composition `packages/core/compute/mcp-server/src/McpServer.test.ts:1079`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 1079-1102 (`describe('McpServer.toolsLayer', () => {`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

Ignored: outside this diff. The flagged `describe('McpServer.toolsLayer', ...)` block is pre-existing
and composes its layers inside a test body, which this change does not touch (locator confidence
0.20).

# WARN 7d41c313-4 effect-fn-not-hand-wrapped-gen `packages/core/compute/mcp-server/src/McpServer.ts:865`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 865-890 (`export const resolveDownload = (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

Ignored: outside this diff. `resolveDownload` is pre-existing and untouched here — this diff's hunks
in this file are at lines 81-94 (`skillGate`, `HostShape`), 671 (a comment) and 960 (the
`skillGate()` call). Rewriting it as `Effect.fn` is its own change.

# WARN 7d41c313-5 no-try-catch-in-effect-code `packages/core/compute/mcp-server/src/McpServer.ts:1209`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 1209-1226 (`const messageKind = (data: string): 'response' | 'notification' | undefined => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

Ignored: outside this diff. `messageKind` is pre-existing and untouched here; its try/catch guards a
`JSON.parse` of a wire message. Moving it to the error channel is its own change.

## Appendix

### System One pass

- model: jev-latest
- base for context: `524906089ef496b70bf7b8012df48a700816940a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 173 uncertain, 129 clean, 0 unanswered
- left for an agentic reviewer: 72 batch(es)

```text
requests: 212 (115 verdicts re-asked with context the model requested)
estimated input tokens: 2879086
billed input tokens: 2796837 (cost $0.1175)
measured chars per token: 3.09
```
