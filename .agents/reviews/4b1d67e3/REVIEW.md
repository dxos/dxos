---
branch: dm/pensive-bohr-wpqys7
commit: 4b1d67e3d17151bb433b4a96aa43217d84506f9c
base: 346175bc41758ed985f7d79bec49739f9006a9e1
mode: fast
createdAt: 2026-10-02T09:38:30.910Z
isFinalized: true
groups: 104
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: 4b1d67e3
---

_4 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4b1d67e3-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:39
- 4b1d67e3-2 - ignored - no-casts - packages/plugins/plugin-navtree/src/containers/index.ts:1
- 4b1d67e3-3 - ignored - no-casts - packages/plugins/plugin-search/src/containers/index.ts:1
- 4b1d67e3-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73
- 4b1d67e3-5 - ignored - structured-logging-not-console - packages/sdk/app-framework/src/plugin-cli/main.ts:33
- 4b1d67e3-6 - ignored - namespace-export-with-internal-hiding - packages/ui/react-primitives/react-hooks/src/index.ts:13
- 4b1d67e3-7 - ignored - no-casts - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111
- 4b1d67e3-8 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188
- 4b1d67e3-9 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218
- 4b1d67e3-10 - ignored - no-casts - packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103

## Issues

# WARN 4b1d67e3-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 39-50 (`const current = getHotkeyScope() ?? '';`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4b1d67e3-2 no-casts `packages/plugins/plugin-navtree/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 1-16 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4b1d67e3-3 no-casts `packages/plugins/plugin-search/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 1-12 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1d67e3-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 73-84 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1d67e3-5 structured-logging-not-console `packages/sdk/app-framework/src/plugin-cli/main.ts:33`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 33-43 (`return;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1d67e3-6 namespace-export-with-internal-hiding `packages/ui/react-primitives/react-hooks/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 13-24 (`export * from './useComposedRefs.ts';`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4b1d67e3-7 no-casts `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 111-116 (`} satisfies Meta<StoryArgs<any>>;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1d67e3-8 no-styling-wrapper-divs `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 188-199 (`export const Variants: Story<Schema.Schema.Type<typeof SettingsSchema>> = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4b1d67e3-9 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/Form/Form.stories.tsx:218`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 218-229 (`const InlineMarkdownTextStory = (args: StoryArgs<any>) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4b1d67e3-10 no-casts `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 103-116 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `346175bc41758ed985f7d79bec49739f9006a9e1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 111 uncertain, 707 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 348 (59 verdicts re-asked with context the model requested)
estimated input tokens: 1914556
billed input tokens: 1834456 (cost $0.0770)
measured chars per token: 3.13
```
