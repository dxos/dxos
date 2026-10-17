---
branch: dm/dazzling-goldberg-fdw85c
commit: 7fffb6fd6d6f0eca6e95ee206fead328a2d559af
base: e2a575396e0520520af1b41e151656e9ef8ece27
mode: fast
createdAt: 2026-10-01T06:56:01.755Z
isFinalized: true
groups: 47
rules: [no-trivial-wrappers-over-official-apis]
reviewId: 7fffb6fd
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7fffb6fd-1 - ignored - no-trivial-wrappers-over-official-apis - packages/common/permission/src/Check.test.ts:41

## Issues

# WARN 7fffb6fd-1 no-trivial-wrappers-over-official-apis `packages/common/permission/src/Check.test.ts:41`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.81. The likeliest place is lines 41-44 (`const check = (options: Omit<Check.CheckOptions, 'now'> & { now?: number }) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

Ignored: the helper is not a plain forwarder. It pins `now` to the fixed test clock and runs the Effect, which every scenario in the file relies on.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e2a575396e0520520af1b41e151656e9ef8ece27`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 65 uncertain, 117 clean, 0 unanswered
- left for an agentic reviewer: 30 batch(es)

```text
requests: 103 (39 verdicts re-asked with context the model requested)
estimated input tokens: 989544
billed input tokens: 941541 (cost $0.0395)
measured chars per token: 3.15
```
