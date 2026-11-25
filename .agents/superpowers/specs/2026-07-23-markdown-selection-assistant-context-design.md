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
export const AnchorResolver = Capability$.make<AnchorResolver>('org.dxos.app-framework.capability.anchorResolver');
```

- `CommentConfig` drops `getAnchorLabel`; the sole consumer
  (`plugin-comments` app-graph-builder) looks up `AnchorResolver` by typename
  instead.
- Only plugin-markdown ever implemented `getAnchorLabel` (sheet and bookmarks
  contribute `CommentConfig` without it), so markdown is the only contributor
  to migrate; registration mirrors the existing `AnchorSort` module.
- The anchor string format `"${from}:${to}"` (cursor pair) is wrapped in an
  echo-client helper `getTextInAnchorRange(accessor, anchor)`, resolving the
  existing `TODO(burdon): Wrap this` in markdown's comment-config.

### 2. Selection transport (no changes to publish side)

- plugin-markdown keeps writing `{ mode: 'multi-range', ranges }` to
  `Selection.aspect` (useExtensions `selectionChange`).
- Add `Selection.toAnchors(selection): string[]` in react-ui-attention: the
  selection→anchor-list normalization used by the assistant. Comments' own
  `getAnchor` keeps its single-anchor aggregation (one thread anchors to one
  string; multi ids join with `,`, multi-range takes the first range) — the
  semantics differ, so it is not folded in (amended during planning).

### 3. Assistant consumption

- At submit time, `ChatArticle` reads `Selection.aspect` for
  `Obj.getURI(companionTo)` via the `AttentionCapabilities.ViewState`
  capability (already held), maps ranges → anchors → text via the
  `AnchorResolver` registered for `companionTo`'s typename.
- `ProcessorRequest` gains an optional field:
  `context?: { selection?: { anchors: string[]; text: string } }`.
- **Delivery (amended during planning):** the selection travels as a
  `ContentBlock.Text` with `disposition: 'synthetic'` prepended to the user's
  prompt blocks — the codebase's existing mechanism for system-generated
  user-turn content (tool results, alarm wake-ups use it). Synthetic blocks
  are not rendered as user-authored text and are hidden in summary view; they
  do persist in the conversation feed, which gives provenance for what the
  agent saw. This replaces the earlier "never persisted" wording, which
  assumed a per-request system-prompt seam that does not exist — adding one
  would mean threading per-turn state through the durable agent-process input
  queue for no behavioral gain.
- Requires widening `AgentService.Session.submitPrompt` (and the agent
  process input schema) from `string` to `string | ContentBlock.Any[]`.
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

## Increment 2: `GetSelection` tool (approved 2026-07-24)

Pull-based complement to the push-based context: an agent tool that retrieves
the current selection on demand ("translate the selection to french"), covering
multi-turn follow-ups where the selection may have changed since submit.

- **`MarkdownOperation.GetSelection`** — input `{ doc: Ref<Markdown.Document> }`;
  output `{ ranges: [{ anchor, text }] }` (anchors enable follow-up in-place
  edits). Markdown-specific for now; a generic plugin-attention variant via
  `AnchorResolver` is possible later.
- **Handler**: load doc → read `Selection.aspect` for `Obj.getURI(doc)` via
  `AttentionCapabilities.ViewState` (non-throwing `getAll` lookup — no
  ViewState, e.g. node/workerd, → empty ranges, never an error) → resolve
  anchors via the shared markdown anchor resolution, skipping failures.
- **Structure**: `getMarkdownAnchorText` moves to `src/model/selection.ts`
  (no shim; anchor-resolver capability imports it) joined by pure
  `getSelectionRanges(doc, selection)`; the operation handler is thin glue.
- **Skill**: tool added to `MarkdownSkill` with an instruction line telling the
  agent to call it when the user refers to "the selection"/"selected text".

## Out of scope

- Folding `AnchorSort` into `AnchorResolver` (possible later; YAGNI now).
- Visible context chip in the chat input (possible fast-follow).
- Acting on the selection (replace-in-range) — enabled by the anchor payload
  but not implemented.
- id-mode selections (table/sheet row selection → context) — the capability
  shape permits it later.
