# Widget Portal Mechanism Audit

Two mechanisms for rendering React components into CodeMirror editor positions have developed in
parallel. Both use the same core pattern — a `WidgetType.toDOM()` creates a DOM placeholder, and
React portals render content into it — but they evolved independently with different APIs, lifecycle
contracts, and notification models.

---

## Mechanism A — `xmlTags` / `PlaceholderWidget`

**Source:** `packages/ui/ui-editor/src/extensions/tags/xml-tags.ts`

**How it works:**

1. A `XmlWidgetRegistry` maps XML tag names to `XmlWidgetDef` entries.
2. `xmlTags({ registry, setWidgets })` is added to a CodeMirror extension list.
3. On each document change, `buildDecorations` walks the syntax tree and, for every matching
   `<tag>` element, creates either a native `WidgetType` (via `factory`) or a `PlaceholderWidget`
   (via `Component`).
4. `PlaceholderWidget.toDOM()` creates a `<div class="min-h-[24px]">` and calls
   `notifier.mounted({ id, root, props, Component })`.
5. The `setWidgets` callback (owned by the React host) receives the updated widget list.
6. The React host renders `createPortal(<Component {...props} />, root)` for each widget.
7. `PlaceholderWidget.destroy()` calls `notifier.unmounted(id)`; the host removes the portal.

**Extra capabilities:**

- Widget state can be updated imperatively via `xmlTagUpdateEffect`.
- Context propagated to all widgets via `xmlTagContextEffect`.
- Full reset via `xmlTagResetEffect`.
- Streaming tag support (unclosed opening tags while content arrives).
- Keyboard navigation bookmarks (`navigatePreviousEffect` / `navigateNextEffect`).

**Call sites:**

| File                                                                                     | Role                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/ui-editor/src/extensions/tags/xml-tags.ts`                                  | Definition                                                                                                                                           |
| `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx`                    | Primary consumer — chat thread renderer. Passes `componentRegistry`, `setWidgets`, effect dispatchers.                                               |
| `packages/plugins/plugin-assistant/src/components/ChatThread/registry.tsx`               | Defines `componentRegistry` (10 tags, 7 React components: `summary`, `surface`, `toolCall`, `toolResult`, `toolkit`, `json`, inline factory widgets) |
| `packages/plugins/plugin-assistant/src/components/ChatThread/widgets/SurfaceWidget.tsx`  | `Component` for `<surface>` — dispatches to app-framework `Surface`                                                                                  |
| `packages/plugins/plugin-assistant/src/components/ChatThread/widgets/SummaryWidget.tsx`  | `Component` for `<summary>`                                                                                                                          |
| `packages/plugins/plugin-assistant/src/components/ChatThread/widgets/ToolWidget.tsx`     | `Component` for `<toolCall>`                                                                                                                         |
| `packages/plugins/plugin-assistant/src/components/ChatThread/widgets/FallbackWidget.tsx` | `Component` for `<toolResult>`, `<toolkit>`, `<json>`                                                                                                |
| `packages/plugins/plugin-assistant/src/components/ToolBlock/ToolBlock.tsx`               | Types only (`XmlWidgetProps`)                                                                                                                        |
| `packages/ui/react-ui-editor/src/stories/Tags.stories.tsx`                               | Story / test harness                                                                                                                                 |
| `packages/ui/ui-editor/src/extensions/tags/xml-util.test.ts`                             | Unit tests                                                                                                                                           |
| `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.stories.tsx`            | Story defining `dom-widget` (factory) and `react-widget` (Component)                                                                                 |

---

## Mechanism B — `preview` / `PreviewBlockWidget`

**Source:** `packages/ui/ui-editor/src/extensions/preview/preview.ts`

**How it works:**

1. `preview({ db, addBlockContainer, removeBlockContainer })` is added to a CodeMirror extension list.
2. A `StateField` walks the syntax tree on each document change; for `Image` nodes whose URL starts
   with `dxn:` or `echo:`, it creates a `PreviewBlockWidget`.
3. `PreviewBlockWidget.toDOM()` creates a plain `<div>` and calls `addBlockContainer({ link, el })`.
4. The React host (typically `MarkdownEditor`) collects blocks in `useState<PreviewBlock[]>`.
5. For each block, the host renders `createPortal(<PreviewBlock link={link} el={el} />, el)`.
6. `PreviewBlock` resolves the DXN to an ECHO object and renders
   `<Surface.Surface type={AppSurface.Section} data={{ subject, attendableId }} limit={1} />` into `el`.
7. `PreviewBlockWidget.destroy()` calls `removeBlockContainer({ link, el })`; the host removes the
   portal.

`Link` nodes (inline, not block) use `PreviewInlineWidget` which renders directly to a custom
`<dx-anchor>` DOM element with no React involvement.

**Call sites:**

| File                                                                                | Role                                                                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/ui-editor/src/extensions/preview/preview.ts`                           | Definition                                                                                                                                            |
| `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx`                      | Adds `preview(previewOptions)` to the editor extension list                                                                                           |
| `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.tsx` | Owns `previewBlocks` state; provides `addBlockContainer` / `removeBlockContainer` callbacks; renders portals via `MarkdownEditorBlocks` sub-component |
| `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx`               | Adds `preview()` with no callbacks (inline link chip rendering only)                                                                                  |
| `packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx`    | Adds `preview()` with no callbacks (read-only, inline chips only)                                                                                     |
| `packages/ui/react-ui-transcription/src/components/Transcription/Transcription.tsx` | Adds `preview()` with no callbacks (inline chips only)                                                                                                |
| `packages/ui/react-ui-editor/src/stories/Preview.stories.tsx`                       | Story with full `addBlockContainer` / `removeBlockContainer` wiring                                                                                   |

---

## Comparison

| Aspect                  | `xmlTags` (A)                                             | `preview` (B)                                              |
| ----------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Trigger                 | XML tag name in doc (`<surface>`, `<toolCall>`, …)        | Markdown image/link URL scheme (`dxn:`, `echo:`)           |
| Decoration created by   | `StateField` (required for block deco)                    | `StateField`                                               |
| Widget base class       | `PlaceholderWidget extends WidgetType`                    | `PreviewBlockWidget extends WidgetType`                    |
| DOM placeholder         | `Domino.of('div').classNames('min-h-[24px]')`             | `document.createElement('div')`                            |
| React notification      | `notifier.mounted/unmounted` → `setWidgets(list)`         | `addBlockContainer/removeBlockContainer` callbacks         |
| Portal rendered by      | React host via `setWidgets` + `createPortal`              | React host via `useState<PreviewBlock[]>` + `createPortal` |
| Widget state            | Yes — `xmlTagUpdateEffect`, `xmlTagContextEffect`         | No                                                         |
| Streaming support       | Yes                                                       | No                                                         |
| Inline (non-block) path | Yes — `factory` widgets rendered natively                 | Yes — `PreviewInlineWidget` renders `<dx-anchor>` directly |
| Final surface rendered  | `<Surface type={ChatSurface} …>` (app-framework)          | `<Surface type={AppSurface.Section} …>` (app-framework)    |
| Key difference          | General-purpose XML tag registry; tag name selects widget | URL-scheme-gated; resolves ECHO object reference           |

Both mechanisms converge on the same end state: a React `<Surface …>` component portaled into a
DOM node that sits at a specific position in the CodeMirror document.

---

## Unification Plan

### Goal

A single `blockWidgets` extension (working name) that covers both use cases:

- Named XML tags → React components (current mechanism A).
- URL-scheme links/images → ECHO object surfaces (current mechanism B).
- One notification model, one lifecycle, one portal host.

### Approach

**Keep `PlaceholderWidget` as the shared primitive.** It is the more capable of the two (streaming,
state, context, navigation). `PreviewBlockWidget` is a strict subset of its functionality.

**Extend the `XmlWidgetRegistry` model to cover URL-scheme slots.** Add a parallel `UrlWidgetRegistry`
(or a unified `WidgetRegistry`) that maps URL scheme prefixes (e.g. `dxn:`, `echo:`) to
`XmlWidgetDef`-style entries. The `buildDecorations` walk already visits both `Element` and
`Link`/`Image` nodes; the scheme-matched entries would use the same `PlaceholderWidget` path.

**Merge the notification model.** `preview` currently notifies the host via mutable callback
references (`addBlockContainer`). Replace with the `setWidgets` / `notifier.mounted` pattern so
both tag and URL widgets flow through a single `XmlWidgetState[]` list.

**Preserve `PreviewInlineWidget`.** The inline `<dx-anchor>` chip (non-block links) has no
React involvement and no equivalent in mechanism A. Keep it as a `factory`-style entry in the
unified registry.

### Phases

#### Phase 1 — Shared primitive (no breaking changes)

- Extract `PlaceholderWidget` and `XmlWidgetNotifier` into a new internal file
  `extensions/tags/placeholder-widget.ts` so `preview.ts` can import it without a circular
  dependency.
- Rewrite `PreviewBlockWidget` to extend or delegate to `PlaceholderWidget`. The
  `addBlockContainer` / `removeBlockContainer` callbacks become an adapter shim that converts
  `notifier.mounted` / `notifier.unmounted` calls into the old API for existing call sites.
- **Zero call-site changes required.**

#### Phase 2 — Unified registry entry point

- Add an optional `urlSchemes?: string[]` field to `XmlWidgetDef` (or add a parallel
  `UrlWidgetDef`).
- Extend `buildDecorations` to visit `Link` / `Image` nodes and match URL scheme prefixes against
  the registry.
- Move the ECHO DXN/EID resolution logic out of `preview.ts` and into a `PreviewComponent`
  registered in the registry (like `SurfaceWidget` is today).
- `preview(options)` becomes a thin factory that returns `xmlTags({ registry: previewRegistry(options) })`.
- **Call sites in `useExtensions.tsx`, `MarkdownEditor.tsx`, `MarkdownStream.tsx` updated** to use
  the new form; the old `preview()` export kept as a re-export shim until all callers are migrated.

#### Phase 3 — Clean up

- Remove `addBlockContainer` / `removeBlockContainer` from `PreviewOptions` (no longer needed once
  all callers use the registry path).
- Remove `PreviewBlockWidget` (replaced by `PlaceholderWidget`).
- Remove `preview.ts` or reduce it to a thin re-export.
- Update `MarkdownEditor` to drop the `previewBlocks` state; portals are now driven entirely by
  `setWidgets` from `xmlTags`.
- Update all `preview()` call sites to pass the registry option instead of callbacks.
- Delete the `MarkdownEditorBlocks` sub-component (no longer needed).

### Files to change

| File                                                                       | Change                                                                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `extensions/tags/xml-tags.ts`                                              | Export `PlaceholderWidget` / `XmlWidgetNotifier`; optionally add URL-scheme matching               |
| `extensions/preview/preview.ts`                                            | Phase 1: delegate to `PlaceholderWidget`. Phase 3: remove.                                         |
| `plugins/plugin-markdown/src/hooks/useExtensions.tsx`                      | Phase 2: switch `preview(opts)` → `xmlTags({ registry: previewRegistry(opts) })`                   |
| `plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.tsx` | Phase 2/3: remove `previewBlocks` state and `MarkdownEditorBlocks`; drive portals via `setWidgets` |
| `react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx`                  | Phase 2: merge `preview()` call into the existing `xmlTags` call                                   |
| `plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx`    | Phase 2: replace `preview()` with registry-based equivalent                                        |
| `react-ui-transcription/src/components/Transcription/Transcription.tsx`    | Phase 2: replace `preview()` with registry-based equivalent                                        |
| `stories/Preview.stories.tsx`                                              | Phase 2/3: update story to new API                                                                 |

### Resolved decisions

1. **`db` context propagation** — the `db` option (used to resolve DXN labels for the inline anchor
   chip) will flow into the unified extension via `xmlTagContextEffect`, the same channel already
   used to propagate `MessageThreadContext` to chat widgets. The `PreviewComponent` reads it from
   `props.context`.

2. **Inline anchor chip stays as `factory`** — `PreviewInlineWidget` (renders `<dx-anchor>` with
   async label resolution via `ref.tryLoad()` + `labelResolvedEffect`) will be registered as a
   `factory`-style entry in the URL-scheme slot of the unified registry. No React portal overhead;
   the existing `WidgetType` pattern is correct for this stateless leaf.

3. **`suggest` / `block` flags** — these `PreviewLinkRef` fields become props passed to the
   `PreviewComponent` via the widget props bag once the block widget is a registry-backed React
   component.
