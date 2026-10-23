---
branch: worktree-mdl-spec-ide
commit: d22ba9790971404ea80275016bda1e1fe98f29ac
base: 6b7cb0839721ab6dc1675c0615aff34dae6f2307
mode: fast
createdAt: 2026-10-23T10:43:48.010Z
isFinalized: true
groups: 92
rules: [error-messages-carry-context, extract-non-rendering-logic-from-component, no-styling-wrapper-divs, story-for-new-ui-component]
reviewId: d22ba979
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d22ba979-1 - resolved - error-messages-carry-context - packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.stories.tsx:121
- d22ba979-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:83
- d22ba979-3 - resolved - story-for-new-ui-component - packages/plugins/plugin-code/src/components/VerdictCard/Walkthrough.tsx:23
- d22ba979-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/VerdictCard/Walkthrough.tsx:57
- d22ba979-5 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:131

## Issues

# WARN d22ba979-1 error-messages-carry-context `packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.stories.tsx:121`

Resolution: The thrown error now lists the keys every code chip points at, so a failure says what the story found.

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 121-132 (`() => expect(canvas.getAllByTestId('spec-editor.implementation-chip').length)...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN d22ba979-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:83`

Resolution: False positive: the cited memo parses the review prop once per change; there is no query, resource or business logic to extract.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 83-94 (`const review = useMemo(() => (reviewText ? parseReview(reviewText) : undefine...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN d22ba979-3 story-for-new-ui-component `packages/plugins/plugin-code/src/components/VerdictCard/Walkthrough.tsx:23`

Resolution: Added `Walkthrough.stories.tsx` (Default asserts each step's sentence and code; NoCheckout asserts steps without snippets).

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 23-32 (`export const Walkthrough = ({ steps, read, onOpenCode }: WalkthroughProps) => (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN d22ba979-4 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/VerdictCard/Walkthrough.tsx:57`

Resolution: False positive: the element is one line of a code listing inside `<pre>`; no design-system primitive models a numbered code line.

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 57-68 (`}}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN d22ba979-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:131`

Resolution: False positive: the memo assembles the list of checkout files the page reads, which is the page's own data wiring, not domain logic.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 131-142 (`const related = useMemo(`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6b7cb0839721ab6dc1675c0615aff34dae6f2307`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 248 uncertain, 294 clean, 0 unanswered
- left for an agentic reviewer: 69 batch(es)

```text
requests: 316 (120 verdicts re-asked with context the model requested)
estimated input tokens: 1898625
billed input tokens: 1821751 (cost $0.0765)
measured chars per token: 3.13
```
