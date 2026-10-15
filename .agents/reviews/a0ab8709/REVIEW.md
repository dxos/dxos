---
branch: dm/bold-bardeen-21dale
commit: a0ab8709b731d564c963d6e82dc6d8bbeaca748d
base: 1013a19b5685738bbba6addc57ea796f5e247257
mode: fast
createdAt: 2026-10-11T08:27:24.193Z
isFinalized: true
groups: 59
rules: [structured-logging-not-console]
reviewId: a0ab8709
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a0ab8709-1 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:139

## Issues

# WARN a0ab8709-1 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:139`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 139-150 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `1013a19b5685738bbba6addc57ea796f5e247257`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 195 uncertain, 257 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 297 (122 verdicts re-asked with context the model requested)
estimated input tokens: 1854612
billed input tokens: 1809484 (cost $0.0760)
measured chars per token: 3.07
```
