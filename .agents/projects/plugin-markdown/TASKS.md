# plugin-markdown — Tasks

_Resume: build + typecheck, run the `EmbedFocus` story, open the PR. Uncommitted: all of it. Last: focus gating implemented._

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
- [ ] **Verify** — build, lint, format, run the play story, manual check of wheel over the sketch.
- [ ] **PR**

### Follow-ups

- [ ] Card previews (`AppSurface.CardContent`) are not gated; they have no scrollable content today.
- [ ] Keyboard: Tab into an embed from the editor is not wired (CodeMirror owns Tab).

### References

- `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx`
- `packages/ui/react-ui-attention/src/types/Attention.ts` — slash-qualified ancestry.
