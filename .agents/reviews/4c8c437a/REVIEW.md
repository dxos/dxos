---
branch: dm/serene-cray-cr404x
commit: 4c8c437a1caff42392865f14c63e028c9da8d0c5
base: af8ed263e2ca3bb38652340328f8ada2e0f4ed4b
mode: fast
createdAt: 2026-10-25T05:13:59.758Z
isFinalized: true
groups: 94
rules: [extract-non-rendering-logic-from-component, repo-scripts-are-typescript-on-bun, toolbars-are-menu-actions]
reviewId: 4c8c437a
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4c8c437a-1 - resolved - repo-scripts-are-typescript-on-bun - .github/workflows/storybook-specs-cache.yml:1
- 4c8c437a-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:252
- 4c8c437a-3 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:408

## Issues

# WARN 4c8c437a-1 repo-scripts-are-typescript-on-bun `.github/workflows/storybook-specs-cache.yml:1`

System One judges this a likely violation of `repo-scripts-are-typescript-on-bun` (New repo scripts are TypeScript run with Bun), p=0.86. This is a single-shot classifier: confirm against the rule before acting.

# WARN 4c8c437a-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:252`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 252-263 (`() => buildChangelogGraph(changelog).nodes.filter((node): node is DecisionMod...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4c8c437a-3 toolbars-are-menu-actions `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:408`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 408-419 (`<Toolbar.ToggleGroup`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `af8ed263e2ca3bb38652340328f8ada2e0f4ed4b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 179 uncertain, 246 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 239 (75 verdicts re-asked with context the model requested)
estimated input tokens: 1860009
billed input tokens: 1814605 (cost $0.0762)
measured chars per token: 3.08
```
