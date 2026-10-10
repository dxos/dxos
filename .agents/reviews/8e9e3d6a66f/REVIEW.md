---
branch: claude/react-ui-next-design-4db6eb
commit: 8e9e3d6a66f07f45304ac9ac165adaa92db81466
base: e4a783591e1cb33be03b20a4b9680104b2636a99
mode: fast
createdAt: 2026-10-06T07:50:29.079Z
isFinalized: true
groups: 58
rules: [use-context-scoped-cancellation]
reviewId: 8e9e3d6a66f
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8e9e3d6a66f-1 - ignored - use-context-scoped-cancellation - packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:244

## Issues

# WARN 8e9e3d6a66f-1 use-context-scoped-cancellation `packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:244`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 244-255 (`const scheduleHide = (view: EditorView) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e4a783591e1cb33be03b20a4b9680104b2636a99`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 118 uncertain, 186 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 183 (72 verdicts re-asked with context the model requested)
estimated input tokens: 1007897
billed input tokens: 957727 (cost $0.0402)
measured chars per token: 3.16
```
