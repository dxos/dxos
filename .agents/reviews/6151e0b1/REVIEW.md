---
branch: dm/cool-cerf-czesvk
commit: 6151e0b12c8bd18ee54a2c1ad057954de32a8c1b
base: 346175bc41758ed985f7d79bec49739f9006a9e1
mode: fast
createdAt: 2026-10-02T09:14:22.551Z
isFinalized: true
groups: 61
rules: [isolate-benchmark-setup-and-flaky-tests, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 6151e0b1
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6151e0b1-1 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/echo.bench.ts:60
- 6151e0b1-2 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client-e2e/src/query-executor.bench.ts:220
- 6151e0b1-3 - ignored - structured-logging-not-console - packages/core/echo/echo-client-e2e/src/query-executor.bench.ts:286

## Issues

# WARN 6151e0b1-1 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/echo.bench.ts:60`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.80. The likeliest place is lines 60-71 (`seedPromise = (async () => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6151e0b1-2 use-context-scoped-cancellation `packages/core/echo/echo-client-e2e/src/query-executor.bench.ts:220`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 220-231 (`const measureMemory = async (label: string, work: () => Promise<void>): Promi...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6151e0b1-3 structured-logging-not-console `packages/core/echo/echo-client-e2e/src/query-executor.bench.ts:286`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 286-297 (`console.log(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `346175bc41758ed985f7d79bec49739f9006a9e1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 148 uncertain, 217 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 203 (66 verdicts re-asked with context the model requested)
estimated input tokens: 1587608
billed input tokens: 1565564 (cost $0.0658)
measured chars per token: 3.04
```
