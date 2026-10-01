---
branch: dm/cool-thompson-f258rv
commit: 24704548e1686399445cc0521ae25bcc0fd220cc
base: 7c8c2568a7c9231a8f7682ccfcea21559d2628c0
mode: fast
createdAt: 2026-10-01T10:43:35.269Z
isFinalized: true
groups: 56
rules: [structured-logging-not-console]
reviewId: 24704548
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 24704548-1 - resolved - structured-logging-not-console - packages/plugins/plugin-sandbox/src/services/SandboxClient.edge.test.ts:31

## Issues

# WARN 24704548-1 structured-logging-not-console `packages/plugins/plugin-sandbox/src/services/SandboxClient.edge.test.ts:31`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 31-42 (`yield* client.createSandbox(spaceId, sandboxId, { name: 'manual-port-test', e...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7c8c2568a7c9231a8f7682ccfcea21559d2628c0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 127 uncertain, 237 clean, 0 unanswered
- left for an agentic reviewer: 37 batch(es)

```text
requests: 209 (85 verdicts re-asked with context the model requested)
estimated input tokens: 1086056
billed input tokens: 1006198 (cost $0.0423)
measured chars per token: 3.24
```
