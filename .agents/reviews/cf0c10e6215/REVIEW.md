---
branch: claude/react-ui-next-design-4db6eb
commit: cf0c10e62151a8703820b02c2283171d02f031d6
base: 52ecf980c2c81193594fb082c3fef2f4b943ff2a
mode: fast
createdAt: 2026-10-03T17:08:21.893Z
isFinalized: true
groups: 455
rules: [design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, leaf-owns-its-subscription, namespace-brand-key-prefixing, no-casts, no-hand-rolled-lists, no-sleep-in-test, no-styling-wrapper-divs, toolbars-are-menu-actions]
reviewId: cf0c10e6215
---

_1 error(s), 33 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- cf0c10e6215-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.ts:288
- cf0c10e6215-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:49
- cf0c10e6215-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:64
- cf0c10e6215-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:180
- cf0c10e6215-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85
- cf0c10e6215-6 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133
- cf0c10e6215-7 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86
- cf0c10e6215-8 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:176
- cf0c10e6215-9 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- cf0c10e6215-10 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:113
- cf0c10e6215-11 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296
- cf0c10e6215-12 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59
- cf0c10e6215-13 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- cf0c10e6215-14 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:108
- cf0c10e6215-15 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:64
- cf0c10e6215-16 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246
- cf0c10e6215-17 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54
- cf0c10e6215-18 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:338
- cf0c10e6215-19 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-toolkit/src/ui/components/index.ts:1
- cf0c10e6215-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/types/src/types/TaskSet.ts:175
- cf0c10e6215-21 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:134
- cf0c10e6215-22 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:254
- cf0c10e6215-23 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:485
- cf0c10e6215-24 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54
- cf0c10e6215-25 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/testing/next-pane.tsx:25
- cf0c10e6215-26 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:106
- cf0c10e6215-27 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:298
- cf0c10e6215-28 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334
- cf0c10e6215-29 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:526
- cf0c10e6215-30 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-list/src/hooks/useReorder.ts:13
- cf0c10e6215-31 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:298
- cf0c10e6215-32 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120
- cf0c10e6215-33 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui/src/next/components/Main/MainContext.ts:28
- cf0c10e6215-34 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Toast/Toast.tsx:211

## Issues

# WARN cf0c10e6215-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.ts:288`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 288-299 (`export const resolve = (key: string): Effect.Effect<Skill, NotFoundError, Reg...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:49`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 49-53 (`const styles = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-3 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 64-75 (`export const ChatOptions = ({ db, chat, context, registry, presets, preset, o...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:180`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 180-191 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-5 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 85-96 (`/>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-6 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 133-144 (`classNames={[`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-7 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 86-97 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-8 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:176`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 176-187 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-9 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 42-54 (`applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-10 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:113`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.80. The likeliest place is lines 113-118 (`});`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-11 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 296-307 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-12 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex items-center gap-2 mb-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-13 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.86. The likeliest place is lines 71-82 (`))}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf0c10e6215-14 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 108-119 (`() =>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-15 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 64-75 (`</Dialog.Title>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-16 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 246-257 (`onSelect={() => onChange(option.id)}`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-17 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 54-65 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-18 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:338`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 338-349 (`<Match.Case when={AppSurface.Section.role}>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-19 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/ui/components/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-15 (`export * from './AttentionSigil.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-20 effect-fn-not-hand-wrapped-gen `packages/sdk/types/src/types/TaskSet.ts:175`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 175-186 (`export const findTaskSet = (task: Task.Task): Effect.Effect<TaskSet | undefin...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-21 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:134`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 134-145 (`useEffect(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-22 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:254`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 254-265 (`<Select.Content>`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-23 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:485`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 485-496 (`current={current === id}`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-24 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 54-65 (`const value = getValue() ?? '';`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-25 no-styling-wrapper-divs `packages/ui/react-ui-form/src/testing/next-pane.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 25-36 (`export const withNextPane =`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-26 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:106`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 106-118 (`const meta = {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-27 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:298`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 298-315 (`export const Large: Story = {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-28 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 334-359 (`export const Multiline: Story = {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-29 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:526`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 526-573 (`useEffect(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-30 namespace-brand-key-prefixing `packages/ui/react-ui-list/src/hooks/useReorder.ts:13`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 13-34 (`import {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-31 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:298`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 298-314 (`type TaskListViewportProps = ComposableProps<{`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-32 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 120-143 (`forwardedRef,`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-33 namespace-brand-key-prefixing `packages/ui/react-ui/src/next/components/Main/MainContext.ts:28`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 28-33 (`const landmarkAttr = 'data-main-landmark';`, location confidence 0.86). Judged with added `package` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# WARN cf0c10e6215-34 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Toast/Toast.tsx:211`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 211-222 (`() => () => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `52ecf980c2c81193594fb082c3fef2f4b943ff2a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 34 violations written to fragments, 553 uncertain, 4857 clean, 6 unanswered
- left for an agentic reviewer: 84 batch(es)

```text
requests: 2123 (338 verdicts re-asked with context the model requested)
estimated input tokens: 14129374
failed requests: 4 (their pairs are listed as unanswered)
billed input tokens: 13523084 (cost $0.5680)
measured chars per token: 3.13
```
