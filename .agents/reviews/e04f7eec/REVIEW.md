---
branch: claude/composer-plugin-deepseek-demo-v0t1io
commit: e04f7eec2b8239c4ff8c719d5b4543a4141f53cf
base: 15cd822f60b9c66637700ba6c4b501c9a0dcccd6
mode: fast
createdAt: 2026-09-27T12:01:13.116Z
isFinalized: true
groups: 53
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: e04f7eec
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e04f7eec-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81

## Issues

# WARN e04f7eec-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:81`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 81-92 (`AppGraphNode.makeAction({`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `15cd822f60b9c66637700ba6c4b501c9a0dcccd6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 73 uncertain, 179 clean, 0 unanswered

```text
requests: 130 (55 verdicts re-asked with context the model requested)
estimated input tokens: 628079
billed input tokens: 565826 (cost $0.0238)
measured chars per token: 3.33
```
