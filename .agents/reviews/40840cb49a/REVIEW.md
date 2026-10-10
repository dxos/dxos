---
branch: claude/ai-service-mock-storybook-90afd6
commit: 40840cb49a5ed912cd43cab39e99eb4dcdd94d73
base: 00fae046b10afae374f1727f27f9015488a8ba68
mode: fast
createdAt: 2026-10-01T08:41:19.677Z
isFinalized: true
groups: 58
rules: [diff-scoped-to-pr-purpose, no-casts]
reviewId: 40840cb49a
---

_2 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 40840cb49a-1 - ignored - diff-scoped-to-pr-purpose - packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:9
- 40840cb49a-2 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:194
- 40840cb49a-3 - ignored - no-casts - packages/sdk/client-services/src/internal/spaces/data-space.ts:559

## Issues

# WARN 40840cb49a-1 diff-scoped-to-pr-purpose `packages/plugins/plugin-registry/src/components/PluginList/PluginItem.tsx:9`

System One judges this a likely violation of `diff-scoped-to-pr-purpose` (Keep a diff scoped to what the PR says it does; drop unrelated or accidental hunks), p=0.83. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 40840cb49a-2 no-casts `packages/sdk/client-services/src/internal/spaces/data-space-manager.test.ts:194`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 194-217 (`expect(space2.id).to.equal(space1.id);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 40840cb49a-3 no-casts `packages/sdk/client-services/src/internal/spaces/data-space.ts:559`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 559-582 (`let lease: DocumentLease<DatabaseDirectory> | null = null;`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `00fae046b10afae374f1727f27f9015488a8ba68`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 70 uncertain, 43 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 80 (47 verdicts re-asked with context the model requested)
estimated input tokens: 1076231
billed input tokens: 1055623 (cost $0.0443)
measured chars per token: 3.06
```
