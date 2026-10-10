---
branch: claude/react-ui-next-design-4db6eb
commit: 0fe2ff5582ff623245b71fed2ac9fdc95c8e854a
base: 37943fe689790002e104872f54f022f7d7512dc5
mode: fast
createdAt: 2026-10-06T01:31:47.112Z
isFinalized: true
groups: 61
rules: [extract-non-rendering-logic-from-component, no-casts, structured-logging-not-console]
reviewId: 0fe2ff5582f
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0fe2ff5582f-1 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62
- 0fe2ff5582f-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:192
- 0fe2ff5582f-3 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:35
- 0fe2ff5582f-4 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:97
- 0fe2ff5582f-5 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217

## Issues

# ERROR 0fe2ff5582f-1 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0fe2ff5582f-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:192`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 192-203 (`const objectsAnchoredTo = useQuery(db, Query.select(Filter.id(subject.id)).ta...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0fe2ff5582f-3 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:35`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 35-46 (`console.log(JSON.stringify(canvas, undefined, 2));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 0fe2ff5582f-4 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:97`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 97-108 (`const cleanup = editor?.store.listen(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0fe2ff5582f-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `37943fe689790002e104872f54f022f7d7512dc5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 116 uncertain, 132 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 158 (67 verdicts re-asked with context the model requested)
estimated input tokens: 1456462
billed input tokens: 1414897 (cost $0.0594)
measured chars per token: 3.09
```
