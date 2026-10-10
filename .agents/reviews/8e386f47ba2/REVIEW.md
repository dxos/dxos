---
branch: claude/react-ui-next-design-4db6eb
commit: 8e386f47ba27fe31d338f20f31ebbccd55b0858f
base: 0fe2ff5582ff623245b71fed2ac9fdc95c8e854a
mode: fast
createdAt: 2026-10-06T02:06:55.496Z
isFinalized: true
groups: 57
rules: [extract-non-rendering-logic-from-component, no-casts, structured-logging-not-console, toolbars-are-menu-actions]
reviewId: 8e386f47ba2
---

_2 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8e386f47ba2-1 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:63
- 8e386f47ba2-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:205
- 8e386f47ba2-3 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:565
- 8e386f47ba2-4 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22
- 8e386f47ba2-5 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217
- 8e386f47ba2-6 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253

## Issues

# ERROR 8e386f47ba2-1 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:63`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 63-74 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e386f47ba2-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:205`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 205-216 (`const objectsAnchoredTo = useQuery(db, Query.select(Filter.id(subject.id)).ta...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e386f47ba2-3 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:565`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 565-576 (`label={t('add-object-comment.label')}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e386f47ba2-4 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 22-33 (`const DefaultStory = () => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e386f47ba2-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8e386f47ba2-6 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 253-264 (`const overrides = useMemo(`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0fe2ff5582ff623245b71fed2ac9fdc95c8e854a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 80 uncertain, 96 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 112 (49 verdicts re-asked with context the model requested)
estimated input tokens: 860885
billed input tokens: 837409 (cost $0.0352)
measured chars per token: 3.08
```
