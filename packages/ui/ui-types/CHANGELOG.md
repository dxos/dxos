# @dxos/ui-types

## 0.17.0

### Minor Changes

- cb058b9: `AttentionGlyph` draws activity in four slots (fill, mark, edge, corner) from a `treatments` prop; each treatment names its slot, hue, mark, priority and whether it animates, and at most one slot animates. The navtree glyph shows the progress monitors keyed `<uri>#<suffix>` to an object (new `useObjectProgressMonitors` hook): a pulsing star while one runs, a red edge when one fails. Agent turns report themselves as trace status updates (`withTurnStatus` in `@dxos/agent-runtime`), on the chat and on a companion chat's subject (`Chat.getCompanionSubject`), so a turn shows wherever it runs; `@dxos/compute` exports the terminal status messages (`Trace.StatusComplete`, `StatusFailed`, `StatusError`, `StatusCancelled`), and `StatusError` (`Failed`) ends a run that is not a sync without calling it one. Breaking: the glyph's `presence` and `syncing` props are removed; pass `treatments`. `@dxos/ui-types` exports `Hue`, which `IconHue` aliases; `Icon` accepts the `primary` hue.
- 8a66e4e: You can comment on the text of a Composer spec's features (name, description, each requirement) and on a project's name, description and notes, as well as on the whole object. A comment anchors to a span of one string field, written as an Automerge ref path such as `requirements/<key>/text/[a-b]` by the new `PathAnchor` helpers in `@dxos/types`. A plugin declares which objects a comments companion covers with `AppCapabilities.CommentScope`. `Form.Root` takes `object`, a live ECHO object: a field carrying the `CollaborativeAnnotation` (or `fieldOverrides.collaborative`) edits that object's string in place through Automerge, while other fields report through `onValuesChanged`. `Form.Root`'s `markdownExtensions` is now `extensions`, which also takes a function of the field's path, and a `MarkdownCapabilities.ExtensionProvider` receives the field as `binding`, which is how comment marks reach form fields. `Feature` 0.5.0 stores requirements by key, and the `featureRequirements` migration upgrades 0.4.0 features.

### Patch Changes

- 1a0fff1: Keep guided tours working on a narrow plank: a step pointing at a toolbar control now opens the overflow menu when the toolbar has folded that control away, and a step whose target never appears is stepped over rather than ending the tour.

## 0.16.0

## 0.15.0

## 0.14.0

## 0.13.0

## 0.12.0

### Patch Changes

- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.

## 0.11.1

## 0.11.0

### Minor Changes

- ed992c2: Remove `className` from `ComposableProps`, so `classNames` is the only styling prop a consumer may
  pass to a composable or slottable component. Accepting both gave every part two indistinguishable
  props, and a part that destructured one while spreading the other silently dropped the caller's
  classes. Passing `className` to such a component is now a compile error; rename it to `classNames`.
  Radix `Slot` still injects `className` at runtime — implementations receive it through
  `HTMLAttributes` and `composableProps` merges it, so slotted composition is unchanged.
