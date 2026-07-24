# Markdown selection → Assistant companion context

Make the current text selection in a markdown document visible to the companion
Assistant chat, without a plugin-markdown → plugin-assistant dependency, and
normalize the existing anchor→text resolution shared with plugin-comments.

## Decisions

- **Transport**: the existing well-known `Selection.aspect` view-state aspect
  (react-ui-attention). plugin-markdown already publishes debounced multi-range
  Automerge cursors keyed by object URI; no publish-side changes.
- **Resolution**: a new typename-keyed `AppCapabilities.AnchorResolver`
  capability in `@dxos/app-toolkit` (neutral ground, mirroring `AnchorSort`),
  replacing `CommentConfig.getAnchorLabel`.
- **Payload**: text-only initially; the anchor strings travel alongside so a
  future iteration can act on the selection (in-place edits) without schema
  changes.
- **UX**: invisible per-request context injection — no context chip.
- **Staleness**: keep the last selection. The aspect is keyed per object and
  memory-backed (session-only); deselection empties the ranges. Focusing the
  chat input must not clear it (CodeMirror retains selection on blur).

## Design

### 1. `AnchorResolver` capability (app-toolkit)

```ts
export type AnchorResolver = Readonly<{
  key: string; // typename
  getText: (obj: any, anchor: string) => string | undefined;
}>;
export const AnchorResolver = Capability$.make<AnchorResolver>(
  'org.dxos.app-framework.capability.anchorResolver',
);
```

- `CommentConfig` drops `getAnchorLabel`; comments consumers
  (`plugin-comments` app-graph-builder, `CommentsArticle`) look up
  `AnchorResolver` by typename instead.
- Contributors migrated in the same change (no shims): plugin-markdown,
  plugin-sheet, plugin-bookmarks.
- The anchor string format `"${from}:${to}"` (cursor pair) is wrapped in an
  echo-client helper `getTextInAnchorRange(accessor, anchor)`, resolving the
  existing `TODO(burdon): Wrap this` in markdown's comment-config.

### 2. Selection transport (no changes to publish side)

- plugin-markdown keeps writing `{ mode: 'multi-range', ranges }` to
  `Selection.aspect` (useExtensions `selectionChange`).
- Add `Selection.toAnchors(selection): string[]` in react-ui-attention so the
  comments `getAnchor` path and the assistant share one selection→anchor
  normalization.

### 3. Assistant consumption

- At submit time, `ChatCompanion` reads `Selection.aspect` for
  `Obj.getURI(companionTo)` via the `AttentionCapabilities.ViewState`
  capability (already held), maps ranges → anchors → text via the
  `AnchorResolver` registered for `companionTo`'s typename.
- `ProcessorRequest` gains an optional ephemeral field:
  `context?: { selection?: { anchors: string[]; text: string } }`.
- The processor appends the selection text to that request's system context
  only — never persisted to the feed or context bindings.
- Empty/no ranges → field omitted; request proceeds unchanged.

### 4. Error handling

- No `AnchorResolver` for the typename → skip silently.
- A cursor that no longer resolves (document edited since selection) → skip
  that range; remaining ranges still contribute.

### 5. Testing

- Unit: `getTextInAnchorRange` (echo-client) and `Selection.toAnchors`
  (react-ui-attention).
- Comments migration: existing comments tests/stories must stay green.
- Assistant: processor test asserting the selection context is included in the
  request when provided and omitted when absent.
- Manual: storybook end-to-end check of the markdown + companion chat flow.

## Out of scope

- Folding `AnchorSort` into `AnchorResolver` (possible later; YAGNI now).
- Visible context chip in the chat input (possible fast-follow).
- Acting on the selection (replace-in-range) — enabled by the anchor payload
  but not implemented.
- id-mode selections (table/sheet row selection → context) — the capability
  shape permits it later.
