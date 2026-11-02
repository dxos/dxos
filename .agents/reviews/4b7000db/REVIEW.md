---
branch: dm/serene-cray-cr404x
commit: 4b7000db75299b805cf43af7cfd4535f8cb26bb0
base: bc50a909111ef54216970e243807b01cd0b0adf7
mode: fast
createdAt: 2026-10-25T12:16:05.514Z
isFinalized: true
groups: 66
rules: [no-trivial-wrappers-over-official-apis]
reviewId: 4b7000db
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4b7000db-1 - resolved - no-trivial-wrappers-over-official-apis - packages/core/echo/echo-client-e2e/src/feed-query-unindexed.test.ts:59

## Issues

# WARN 4b7000db-1 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/feed-query-unindexed.test.ts:59`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.83. The likeliest place is lines 59-70 (`await db.appendToFeed(feed, [...items]);`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bc50a909111ef54216970e243807b01cd0b0adf7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 24 uncertain, 30 clean, 0 unanswered
- left for an agentic reviewer: 35 batch(es)

```text
requests: 28 (15 verdicts re-asked with context the model requested)
estimated input tokens: 290856
billed input tokens: 267329 (cost $0.0112)
measured chars per token: 3.26
```
