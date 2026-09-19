# plugin-markdown — Tasks

_Resume: PR #13237 MERGED 2026-09-19. Uncommitted: none. Next: the follow-ups below._

## Phase 1: focusable inline object embeds

An inline object (`![label](echo:///…)`) renders a Section surface inside the document. Until now
the surface received every event, so scrolling the document over a sketch panned the sketch and a
long embedded document scrolled itself instead of the page. The embed container is now an attendable
that must be clicked to take events.

### Tasks

- [x] **Thread the editor's attendable id into the embed widget** — `ExtensionsOptions.attendableId`
      → `createBaseExtensions` → `PreviewComponent`.
- [x] **Gate the section surface on attention** — container carries `data-attendable-id`
      (`<editor id>/<object id>`), `tabIndex=0`; the surface wrapper is `inert` until the embed has
      attention; focus ring while attended; Escape focuses the editor.
- [x] **Story** — `MarkdownArticle` `WithObjects` manual `Test:` block + `EmbedFocus` play story
      asserting the inert toggle.
- [x] **Verify** — build, lint, format, play story green, browser check of the wheel over the sketch.
- [x] **tailwind-merge** — `ring-focus-line` / `ring-offset-focus-offset` registered as widths in the shared
      merge config; `mx()` had been dropping the width beside the colour, so the ring never rendered.
- [x] **PR** — #13237.

- [x] **Attended containment** — `overscroll-contain` on the wrapper; keydown/keyup stop at the
      container; border switches to `border-focus-ring-subtle`.

### Also in PR #13237 (plugin-spacetime)

- [x] **Scene card** — `Scene` carries `CardAnnotation`, `SceneCard` renders the canvas (non-interactive,
      no fps) as `CardContent`; the object masonry picks it up without custom logic.
- [x] **SpacetimeArticle → SceneArticle**; camera pose memoised per scene URI via a `local`
      react-ui-attention view-state aspect (`SceneView.cameraAspect`), written 250ms after the orbit
      settles, again on unmount/`pagehide`, and applied when the canvas mounts.

- [x] **Colour edits always saved** — the programmatic-hue flag stayed armed when the selected
      object already matched the picker; replaced by `useSelectedObjectColor` (compare, no flag) +
      regression test. Orbit inertia halved (0.45).

- [x] **plugin-mermaid theming** — `theme`/`themeVariables`/`themeCSS` options, tokens via `themeCSS`,
      re-render on colour-mode switch; **plugin-tldraw** follows the app theme (not
      `prefers-color-scheme`); **plugin-space** single-card delete routed through `RemoveObjects`
      (undoable).

### Follow-ups

- [ ] Clicking an embedded _document_ scrolls the outer document (~190px): the inner editor focuses
      its cursor and `scrollIntoView` chains up. Needs `preventScroll` on the inner editor's focus.

- [ ] Card previews (`AppSurface.CardContent`) are not gated; they have no scrollable content today.
- [ ] Keyboard: Tab into an embed from the editor is not wired (CodeMirror owns Tab).

### References

- `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx`
- `packages/ui/react-ui-attention/src/types/Attention.ts` — slash-qualified ancestry.
