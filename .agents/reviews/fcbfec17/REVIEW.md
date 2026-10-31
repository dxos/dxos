---
branch: claude/busy-davinci-4v6dar
commit: fcbfec170b8da732e5db55d6008ac8e8dab12f48
base: 9a7d9b5a8619552394af89fe811eb028e9661aa7
mode: fast
createdAt: 2026-10-06T10:04:26.126Z
isFinalized: true
groups: 52
rules: [no-casts, no-sleep-in-test]
reviewId: fcbfec17
---

_2 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fcbfec17-1 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:25
- fcbfec17-2 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:114
- fcbfec17-3 - ignored - no-casts - packages/sdk/client-services/src/Replication.ts:376

## Issues

# WARN fcbfec17-1 no-sleep-in-test `packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:25`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 25-41 (`import { range } from '@dxos/util';`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fcbfec17-2 no-casts `packages/sdk/client-services/src/internal/spaces/edge-feed-replicator.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 114-137 (`sendSpy.mockImplementationOnce(async (_ctx: any, request: any) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fcbfec17-3 no-casts `packages/sdk/client-services/src/Replication.ts:376`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 376-387 (`await this._pushBlocks(this._connectionCtx!, feed, remoteLength, feed.length);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9a7d9b5a8619552394af89fe811eb028e9661aa7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 67 uncertain, 82 clean, 0 unanswered
- left for an agentic reviewer: 38 batch(es)

```text
requests: 89 (39 verdicts re-asked with context the model requested)
estimated input tokens: 783911
billed input tokens: 770361 (cost $0.0324)
measured chars per token: 3.05
```
