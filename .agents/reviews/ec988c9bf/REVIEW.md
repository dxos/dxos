---
branch: HEAD
commit: ec988c9bfcfd05575772c91387c54dae0a5964cf
base: bdb798472a4e6b7215bf09c3a27c547e6a928cf9
mode: fast
createdAt: 2026-10-06T05:38:49.664Z
isFinalized: true
groups: 149
rules: [effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, no-sleep-in-test]
reviewId: ec988c9bf
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ec988c9bf-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/capabilities/connector.test.ts:21
- ec988c9bf-2 - resolved - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-claude/src/process/index.ts:1
- ec988c9bf-3 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:83

## Issues

# WARN ec988c9bf-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/capabilities/connector.test.ts:21`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 21-30 (`const rejection = (token: string) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

Resolved: `rejection` is defined with `Effect.fnUntraced`.

# WARN ec988c9bf-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-claude/src/process/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-6 (`export * as ClaudeCodeProcess from './ClaudeCodeProcess.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.65. This is a single-shot classifier: confirm against the rule before acting.

Resolved: the namespace's members no longer repeat its name — `ClaudeCodeProcess.make` and `ClaudeCodeProcess.KEY`.

# WARN ec988c9bf-3 no-sleep-in-test `packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:83`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 83-94 (`const findRequest = (feed: Feed.Feed) =>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

Ignored: this is the opt-in real end-to-end test against a real `claude` subprocess; the permission request it waits for arrives from that process, which offers no event to subscribe to, so polling the chat's feed with a deadline is the only way to observe it.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bdb798472a4e6b7215bf09c3a27c547e6a928cf9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 228 uncertain, 1014 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 554 (160 verdicts re-asked with context the model requested)
estimated input tokens: 4014707
billed input tokens: 3641628 (cost $0.1529)
measured chars per token: 3.31
```
