# Widget Portal Mechanism

React components are rendered into CodeMirror editor positions via a single unified mechanism:
a `WidgetType.toDOM()` creates a DOM placeholder, and React portals render content into it.

---

## `widgets` / `xmlTags` / `linkWidgets`

**Source:** `packages/ui/ui-editor/src/extensions/widgets/` (core), `language/xml/xml-tags.ts` (element matcher)

**How it works:**

1. `widgets.ts` owns everything after a match: the one decoration `StateField` (block decorations
   cannot come from a view plugin), the `StubWidget` placeholder lifecycle the host renders portals
   from, widget state and context effects, and bookmark navigation. Matchers are contributed through
   `widgetMatchersFacet`; the host's callbacks through `widgetHost({ setWidgets, bookmarks })`.
2. `xmlTags({ registry })` is the **element matcher**: an `Element` node is looked up by tag name in
   an `XmlWidgetRegistry` (e.g. `<surface>`, `<toolCall>`). It also scans the document tail for a
   streaming tag whose close has not arrived and decorates it provisionally.
3. `linkWidgets({ match, link, image })` is the **link matcher**: a `Link`/`Image` node whose URL
   the `match: (url) => boolean` accepts is replaced by the `link` (inline) or `image` (block)
   widget. `matchSchemes`, `matchHosts` and `matchPattern` build matchers; `objectLinks()` is the
   `dxn:`/`echo:` case with the anchor chip as its default inline widget; `githubLinks({ link })`
   the pull-request/issue URL case, handing its widget the parsed parts and defaulting to a plain
   chip.
4. A host composes `[widgetHost({ setWidgets }), xmlTags({ registry }), objectLinks(…)]`; every
   matcher extension includes the core, which CodeMirror deduplicates.
5. On each document change, `buildDecorations` walks the syntax tree, hands each claimed node to
   the matchers in registration order, then lets each matcher inspect the tail.
6. For each match, `createWidget` returns the definition's native `WidgetType` from its `factory`,
   or a `StubWidget` for a `Component`-backed definition.
7. `StubWidget.toDOM()` creates the placeholder and calls `notifier.mounted({ id, root, props, Component })`.
8. The `setWidgets` callback (owned by the React host) receives the updated widget list, and the
   host renders `createPortal(<Component {...props} />, root)` for each widget.
9. `StubWidget.destroy()` calls `notifier.unmounted(id)`; the host removes the portal.

**Extra capabilities:**

- Widget state updated imperatively via `widgetUpdateEffect`.
- Context propagated to all widgets via `widgetContextEffect`.
- Full reset via `widgetResetEffect`.

## Inline anchor chip

`Link` nodes `objectLinks()` accepts use a `factory` that returns an `AnchorWidget` — a native
`WidgetType` that renders a `<dx-anchor>` Lit web component.
No React portal is involved. On click, `<dx-anchor>` dispatches a `DxAnchorActivate` custom event
that either `EditorPreviewProvider` (standalone/stories) or `PreviewPlugin` (Composer) handles to
open a popover.
