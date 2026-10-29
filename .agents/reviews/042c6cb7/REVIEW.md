---
branch: dm/amazing-allen-w7xfpm
commit: 042c6cb7e2f503d8776f6dec6a5f28e76408b516
base: 6b7cb0839721ab6dc1675c0615aff34dae6f2307
mode: fast
createdAt: 2026-10-23T10:58:04.537Z
isFinalized: true
groups: 62
rules: [reactive-state-via-atom-bridge]
reviewId: 042c6cb7
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 042c6cb7-1 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-code/src/testing/spec-files.ts:29

## Issues

# WARN 042c6cb7-1 reactive-state-via-atom-bridge `packages/plugins/plugin-code/src/testing/spec-files.ts:29`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 29-40 (`export const useSpecTexts = <K extends string>(`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6b7cb0839721ab6dc1675c0615aff34dae6f2307`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 43 uncertain, 109 clean, 0 unanswered
- left for an agentic reviewer: 37 batch(es)

```text
requests: 82 (29 verdicts re-asked with context the model requested)
estimated input tokens: 321910
billed input tokens: 300032 (cost $0.0126)
measured chars per token: 3.22
```
