---
branch: dm/inspiring-goodall-p5ww07
commit: 31446a9e9c52d58f74fec98ea04eac761c729fb1
base: 6a0206164f82d856daf1e32037e8ed9557e3c6f5
mode: fast
createdAt: 2026-10-15T09:02:08.470Z
isFinalized: true
groups: 79
rules: [no-sleep-in-test, test-real-scenario-not-narrower-proxy]
reviewId: 31446a9e
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 31446a9e-1 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:32
- 31446a9e-2 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:304

## Issues

# WARN 31446a9e-1 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:32`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 32-43 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31446a9e-2 no-sleep-in-test `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:304`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 304-315 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6a0206164f82d856daf1e32037e8ed9557e3c6f5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 99 uncertain, 51 clean, 0 unanswered
- left for an agentic reviewer: 62 batch(es)

```text
requests: 91 (71 verdicts re-asked with context the model requested)
estimated input tokens: 1063784
billed input tokens: 1031705 (cost $0.0433)
measured chars per token: 3.09
```
