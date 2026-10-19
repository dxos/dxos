---
branch: claude/canvas-style-property-sync-f6db46
commit: 88d7714d032359edaad176b7b93ffbce6ff15b0a
base: 276d27017d1257c579f9c69df3975e5c67530791
mode: fast
createdAt: 2026-10-06T13:11:11.414Z
isFinalized: true
groups: 147
rules: [errors-extend-base-error, named-react-imports, namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs]
reviewId: 88d7714d032
---

_2 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 88d7714d032-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:319
- 88d7714d032-2 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52
- 88d7714d032-3 - resolved - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- 88d7714d032-4 - ignored - errors-extend-base-error - packages/ui/react-ui-form/src/components/layout/parser.ts:30
- 88d7714d032-5 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:412
- 88d7714d032-6 - ignored - namespace-export-with-internal-hiding - packages/ui/ui-types/src/index.ts:13

## Issues

# WARN 88d7714d032-1 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:319`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 319-330 (`export const ClassNodeView = ({ node, editing }: NodeViewProps) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 88d7714d032-2 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 52-63 (`<ActionToolbar actions={actions} nodes={defaultNodeRegistry} capabilities={fr...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 88d7714d032-3 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 88d7714d032-4 errors-extend-base-error `packages/ui/react-ui-form/src/components/layout/parser.ts:30`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 30-42 (`export class LayoutParseError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 88d7714d032-5 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:412`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 412-423 (`const mergeAtPath = (obj: any, path: readonly (string | number)[], value: any...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 88d7714d032-6 namespace-export-with-internal-hiding `packages/ui/ui-types/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.87. The likeliest place is lines 13-18 (`export * from './palette.ts';`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `276d27017d1257c579f9c69df3975e5c67530791`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 159 uncertain, 1008 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 493 (96 verdicts re-asked with context the model requested)
estimated input tokens: 3221426
billed input tokens: 3060305 (cost $0.1285)
measured chars per token: 3.16
```
