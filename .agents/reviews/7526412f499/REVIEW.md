---
branch: claude/react-ui-next-design-4db6eb
commit: 7526412f4992d98b51c79ac844bf1d15478d7e95
base: 8e386f47ba27fe31d338f20f31ebbccd55b0858f
mode: fast
createdAt: 2026-10-06T02:16:02.085Z
isFinalized: true
groups: 58
rules: [extract-non-rendering-logic-from-component, no-casts, toolbars-are-menu-actions]
reviewId: 7526412f499
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7526412f499-1 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:63
- 7526412f499-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:457
- 7526412f499-3 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:553

## Issues

# ERROR 7526412f499-1 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:63`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 63-74 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7526412f499-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:457`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 457-468 (`const target = anchors`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7526412f499-3 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:553`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 553-564 (`<Tabs.Trigger classNames='text-sm' value='all'>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8e386f47ba27fe31d338f20f31ebbccd55b0858f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 65 uncertain, 49 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 71 (31 verdicts re-asked with context the model requested)
estimated input tokens: 735194
billed input tokens: 709280 (cost $0.0298)
measured chars per token: 3.11
```
