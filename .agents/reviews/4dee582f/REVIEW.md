---
branch: dm/amazing-allen-w7xfpm
commit: 4dee582f64d2670bb2173a8f99494b063c18a76e
base: 853af68cc50be52fe608dce782b3fcd0399e0bc8
mode: fast
createdAt: 2026-10-22T17:18:06.539Z
isFinalized: true
groups: 88
rules: [design-tokens-not-raw-spacing-sizing, inject-dependencies-via-constructor, stable-component-for-optional-content, subscribe-where-you-read]
reviewId: 4dee582f
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4dee582f-1 - ignored - inject-dependencies-via-constructor - packages/common/diagram/src/extension/preview.ts:62
- 4dee582f-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.stories.tsx:39
- 4dee582f-3 - ignored - subscribe-where-you-read - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:47
- 4dee582f-4 - ignored - stable-component-for-optional-content - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:95

## Issues

# WARN 4dee582f-1 inject-dependencies-via-constructor `packages/common/diagram/src/extension/preview.ts:62`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.83. The likeliest place is lines 62-72 (`if (renders.size >= MAX_RENDERS) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4dee582f-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.stories.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 39-50 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4dee582f-3 subscribe-where-you-read `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:47`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.85. The likeliest place is lines 47-58 (`export const SpecArticle = forwardRef<HTMLDivElement, SpecArticleProps>(`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4dee582f-4 stable-component-for-optional-content `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:95`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.87. The likeliest place is lines 95-106 (`</Panel.Header>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `853af68cc50be52fe608dce782b3fcd0399e0bc8`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 116 uncertain, 176 clean, 0 unanswered
- left for an agentic reviewer: 58 batch(es)

```text
requests: 164 (52 verdicts re-asked with context the model requested)
estimated input tokens: 794999
billed input tokens: 743546 (cost $0.0312)
measured chars per token: 3.21
```
