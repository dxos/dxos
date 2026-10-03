---
branch: dm/busy-bohr-fpmfa1
commit: f63d2534398af7b86ef98083e9f531072939fc94
base: 0e1eb16cd1aaf8818d06dcecd4034abc63b5a69f
mode: fast
createdAt: 2026-09-30T19:09:37.441Z
isFinalized: true
groups: 64
rules: [bounded-live-state]
reviewId: f63d2534
---

_1 error(s), 0 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f63d2534-1 - resolved - bounded-live-state - packages/plugins/plugin-github/src/hooks/useSyncPullRequest.ts:19

## Issues

# ERROR f63d2534-1 bounded-live-state `packages/plugins/plugin-github/src/hooks/useSyncPullRequest.ts:19`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 19-27 (`const lastSynced = new Map<string, number>();`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0e1eb16cd1aaf8818d06dcecd4034abc63b5a69f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 138 uncertain, 283 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 236 (98 verdicts re-asked with context the model requested)
estimated input tokens: 1253141
billed input tokens: 1183061 (cost $0.0497)
measured chars per token: 3.18
```
