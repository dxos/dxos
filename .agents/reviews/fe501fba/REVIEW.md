---
branch: worktree-mdl-spec-ide
commit: fe501fba92ba7981c07ae4b64c1cb57864aa0518
base: 6b7cb0839721ab6dc1675c0615aff34dae6f2307
mode: fast
createdAt: 2026-10-23T11:20:53.403Z
isFinalized: true
groups: 98
rules: [extract-non-rendering-logic-from-component]
reviewId: fe501fba
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fe501fba-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:83
- fe501fba-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:131

## Issues

# WARN fe501fba-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 83-94 (`const review = useMemo(() => (reviewText ? parseReview(reviewText) : undefine...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

Resolution: False positive: the cited memo parses the review prop once per change; there is no query, resource or business logic to extract.

# WARN fe501fba-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:131`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 131-142 (`const related = useMemo(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

Resolution: False positive: the memo assembles the list of checkout files the page reads, which is the page's own data wiring, not domain logic.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6b7cb0839721ab6dc1675c0615aff34dae6f2307`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 284 uncertain, 345 clean, 0 unanswered
- left for an agentic reviewer: 74 batch(es)

```text
requests: 370 (140 verdicts re-asked with context the model requested)
estimated input tokens: 2146813
billed input tokens: 2056346 (cost $0.0864)
measured chars per token: 3.13
```
