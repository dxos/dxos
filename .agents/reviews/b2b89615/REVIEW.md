---
branch: dm/gracious-dirac-b39x8a
commit: b2b89615574ca76aab52df5cccc9ddda8b65d2af
base: 6a37f4b4c92dcd721a3375a0f25a33b6534a3848
mode: fast
createdAt: 2026-11-17T17:08:00.680Z
isFinalized: true
groups: 67
rules: [errors-extend-base-error, structured-logging-not-console]
reviewId: b2b89615
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b2b89615-1 - resolved - errors-extend-base-error - packages/core/compute/plugin-builder/src/bin/publish-release.ts:27
- b2b89615-2 - ignored - structured-logging-not-console - packages/core/compute/plugin-builder/src/bin/publish-release.ts:109

## Issues

# ERROR b2b89615-1 errors-extend-base-error `packages/core/compute/plugin-builder/src/bin/publish-release.ts:27`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 27-42 (`const readBundleFiles = async (bundleDir: string): Promise<BundleFile[]> => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b2b89615-2 structured-logging-not-console `packages/core/compute/plugin-builder/src/bin/publish-release.ts:109`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 109-120 (`catch: (cause) => new UploadFailedError({ cause }),`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6a37f4b4c92dcd721a3375a0f25a33b6534a3848`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 24 uncertain, 30 clean, 0 unanswered
- left for an agentic reviewer: 35 batch(es)

```text
requests: 32 (12 verdicts re-asked with context the model requested)
estimated input tokens: 175941
billed input tokens: 169278 (cost $0.0071)
measured chars per token: 3.12
```
