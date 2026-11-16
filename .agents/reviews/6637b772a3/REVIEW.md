---
branch: dm/trusting-goodall-baxvow
commit: 6637b772a36460d38f62d81156f61427b40faa9a
base: fe3aaf6bfc4ef9e6c16b70b6db3ef49d0a1841b2
mode: fast
createdAt: 2026-11-10T12:10:12.751Z
isFinalized: true
groups: 67
rules: [no-try-catch-in-effect-code, structured-logging-not-console]
reviewId: 6637b772a3
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6637b772a3-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-builder/src/bin/publish-release.ts:90
- 6637b772a3-2 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/publish-release.ts:90

## Issues

# WARN 6637b772a3-1 no-try-catch-in-effect-code `packages/core/compute/plugin-builder/src/bin/publish-release.ts:90`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 90-101 (`} catch (error) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6637b772a3-2 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/publish-release.ts:90`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 90-101 (`} catch (error) {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fe3aaf6bfc4ef9e6c16b70b6db3ef49d0a1841b2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 39 uncertain, 87 clean, 0 unanswered
- left for an agentic reviewer: 36 batch(es)

```text
requests: 67 (26 verdicts re-asked with context the model requested)
estimated input tokens: 261744
billed input tokens: 246486 (cost $0.0104)
measured chars per token: 3.19
```
