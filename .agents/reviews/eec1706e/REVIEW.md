---
branch: worktree-agent-a6cd96b9cc9f13774
commit: eec1706e0687c33fca9b119f9875d04fbabd6197
base: cd3e6c06c3d3c767ed62d412e0b5969e8a9848a6
mode: fast
createdAt: 2026-10-08T11:29:02.457Z
isFinalized: true
groups: 49
rules: [test-real-scenario-not-narrower-proxy]
reviewId: eec1706e
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- eec1706e-1 - unresolved - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:246

## Issues

# WARN eec1706e-1 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:246`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 246-251 (`aiService: ScriptedLanguageModel.scriptedAiService(makeScript(refs)),`, location confidence 0.72). Judged with added `imports, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cd3e6c06c3d3c767ed62d412e0b5969e8a9848a6`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 73 uncertain, 41 clean, 0 unanswered
- left for an agentic reviewer: 38 batch(es)

```text
requests: 80 (52 verdicts re-asked with context the model requested)
estimated input tokens: 714239
billed input tokens: 692486 (cost $0.0291)
measured chars per token: 3.09
```
