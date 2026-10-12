---
branch: dm/bold-bardeen-21dale
commit: 9525990437024e3048ac77e17810e7bd0bf6e996
base: 36f4894cc7f413abf8c3988738f77cbd4286df58
mode: fast
createdAt: 2026-10-12T05:10:45.753Z
isFinalized: true
groups: 57
rules: [structured-logging-not-console]
reviewId: 95259904
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 95259904-1 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:146

## Issues

# WARN 95259904-1 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:146`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 146-157 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `36f4894cc7f413abf8c3988738f77cbd4286df58`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 114 uncertain, 86 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 149 (73 verdicts re-asked with context the model requested)
estimated input tokens: 1232711
billed input tokens: 1229674 (cost $0.0516)
measured chars per token: 3.01
```
