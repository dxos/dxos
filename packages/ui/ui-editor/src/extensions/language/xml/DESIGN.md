# Widget Portal Mechanism

React components are rendered into CodeMirror editor positions via a single unified mechanism:
a `WidgetType.toDOM()` creates a DOM placeholder, and React portals render content into it.

---

## `xmlTags` / `StubWidget`

**Source:** `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts`

**How it works:**

1. A `XmlWidgetRegistry` maps tag names and URL scheme prefixes to `XmlWidgetDef` entries.
2. `xmlTags({ registry, setWidgets })` is added to a CodeMirror extension list.
3. On each document change, `buildDecorations` walks the syntax tree and handles two node types:
   - **`Element` nodes** — matched by XML tag name (e.g. `<surface>`, `<toolCall>`).
   - **`Link`/`Image` nodes** — matched when the URL starts with a declared `urlSchemes` prefix
     (e.g. `dxn:`, `echo:`). Block widgets are created for `Image`; inline for `Link`.
4. For each match, a `factory` returns a native `WidgetType`, or a `StubWidget` is created for
   `Component`-backed entries.
5. `StubWidget.toDOM()` creates a `<div class="min-h-[24px]">` and calls
   `notifier.mounted({ id, root, props, Component })`.
6. The `setWidgets` callback (owned by the React host) receives the updated widget list.
7. The React host renders `createPortal(<Component {...props} />, root)` for each widget.
8. `StubWidget.destroy()` calls `notifier.unmounted(id)`; the host removes the portal.

**Extra capabilities:**

- Widget state updated imperatively via `xmlTagUpdateEffect`.
- Context propagated to all widgets via `xmlTagContextEffect`.
- Full reset via `xmlTagResetEffect`.
- Streaming tag support (unclosed opening tags while content streams in).
- Keyboard navigation bookmarks (`navigatePreviousEffect` / `navigateNextEffect`).

**Call sites:**

| File                                                                                | Role                                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts`                             | Definition                                                                                             |
| `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx`               | Chat thread renderer — XML tags + dxn:/echo: url-scheme widgets                                        |
| `packages/plugins/plugin-assistant/src/components/ChatThread/registry.tsx`          | Defines component registry (summary, surface, toolCall, toolResult, toolkit, json, inline factories)   |
| `packages/plugins/plugin-markdown/src/hooks/useExtensions.tsx`                      | Editor — registers `dxn-preview` (block) and `link-preview` (inline) url-scheme widgets                |
| `packages/plugins/plugin-inbox/src/components/MarkdownViewer/MarkdownViewer.tsx`    | Read-only viewer — inline anchor chips via url-scheme registry                                         |
| `packages/ui/react-ui-transcription/src/components/Transcription/Transcription.tsx` | Transcription viewer — inline anchor chips via url-scheme registry                                     |
| `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx`                       | Stories: `XmlTags` (XML tag registry) and `Preview` (url-scheme registry with `EditorPreviewProvider`) |
| `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.test.ts`                | Unit tests                                                                                             |
| `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.stories.tsx`       | Story defining dom-widget (factory) and react-widget (Component)                                       |

---

## Inline anchor chip

`Link` nodes that match a url-scheme entry with `block: false` use a `factory` that returns an
`AnchorInlineWidget` — a native `WidgetType` that renders a `<dx-anchor>` Lit web component.
No React portal is involved. On click, `<dx-anchor>` dispatches a `DxAnchorActivate` custom event
that either `EditorPreviewProvider` (standalone/stories) or `PreviewPlugin` (Composer) handles to
open a popover.
