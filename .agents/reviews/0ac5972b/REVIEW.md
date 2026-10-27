---
branch: dm/admiring-darwin-1tdzl8
commit: 0ac5972ba7d31776a836f2cc2bcd8b962a64448b
base: b73cc5be04013bd110d1aec2fd23afaa01339dbf
mode: fast
createdAt: 2026-10-25T19:06:37.142Z
isFinalized: true
groups: 71
rules: [extract-non-rendering-logic-from-component, leaf-objects-render-as-cards, toolbars-are-menu-actions]
reviewId: 0ac5972b
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 0ac5972b-1 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:86
- 0ac5972b-2 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:99
- 0ac5972b-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:253
- 0ac5972b-4 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:409

## Issues

# WARN 0ac5972b-1 leaf-objects-render-as-cards `packages/plugins/plugin-code/src/components/DecisionLog/DecisionLog.tsx:86`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.89. The likeliest place is lines 86-97 (`const DeciderSection = ({ group, selected }: { group: DeciderGroup; selected?...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0ac5972b-2 leaf-objects-render-as-cards `packages/plugins/plugin-code/src/components/ReviewPanel/ReviewPanel.tsx:99`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.81. The likeliest place is lines 99-110 (`const VerdictTile = forwardRef<HTMLDivElement, VerdictTileProps>(({ data, loc...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0ac5972b-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:253`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 253-264 (`() => buildChangelogGraph(changelog).nodes.filter((node): node is DecisionMod...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 0ac5972b-4 toolbars-are-menu-actions `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:409`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 409-420 (`<Toolbar.ToggleGroup`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b73cc5be04013bd110d1aec2fd23afaa01339dbf`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 172 uncertain, 154 clean, 0 unanswered
- left for an agentic reviewer: 58 batch(es)

```text
requests: 177 (58 verdicts re-asked with context the model requested)
estimated input tokens: 1308764
billed input tokens: 1274363 (cost $0.0535)
measured chars per token: 3.08
```

### Triage

- 0ac5972b-1: `DeciderSection` is a Listbox group of decision rows, not a leaf in a card container, and this PR does not change it.
- 0ac5972b-2: false positive; `VerdictTile` hosts `VerdictCard`, which is a `Card.Root` with the icon, `Card.Title` and `Card.Menu` header.
- 0ac5972b-3: the decisions memo in `SpecArticle` predates this PR, which only changes the code tab's empty state there; out of scope.
- 0ac5972b-4: the view-switch `Toolbar.ToggleGroup` predates this PR; out of scope.
