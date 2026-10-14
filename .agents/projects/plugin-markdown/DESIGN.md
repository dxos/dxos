# plugin-markdown — Design

## Inline object embeds: focus gating

### Problem

`![label](echo:///…)` renders the object's Section surface inside the CodeMirror document as a block
widget. The surface is live from the moment it mounts: a wheel over a tldraw sketch pans the canvas
and a wheel over an embedded document scrolls that document, so the page stops scrolling wherever an
embed sits under the pointer. There was also no visible focus state.

### Decision

The embed container is an **attendable** (react-ui-attention), and the surface is **`inert`** unless
the embed has attention.

- **Attention, not local focus state.** `TldrawArticle` already keys its section chrome on
  `useAttention(attendableId)`; the container simply had no `data-attendable-id`, so that never
  fired. Using attention makes the ring, the tldraw UI, and event gating one signal.
- **Nested id `<editor attendable id>/<object id>`.** Attention ancestry is slash-prefix based, so
  nesting keeps the document an ancestor while the embed is primary — the same shape as a section in
  a stack. The object _id_ is used rather than the URI because the URI's slashes would split into
  bogus prefixes; the object id as last segment also marks a plank showing the same object as
  `isRelated`.
- **`inert` over `pointer-events: none`.** `inert` removes the subtree from hit-testing _and_ the
  focus order, so a click lands on the container (which is `tabIndex=0` and focuses itself) and the
  wheel bubbles from the container to the editor's scroller. `pointer-events` alone would still let
  the subtree receive keyboard focus.
- **Escape** focuses the editor view, which moves attention back to the document.
- **Attended, nothing leaks out.** `overscroll-behavior: contain` on the (overflow-hidden) surface
  wrapper ends the scroll chain, so an embed wheeled past its end does not scroll the document; key
  events stop propagating at the container, so an app or editor shortcut cannot fire from inside a
  sketch. Mouse and focus events still bubble: attention depends on them.
- **Focus border, not a ring.** The wrapper border switches to `border-focus-ring-subtle` (the
  neutral token the deck uses for its attended tile), never the primary blue.

### Not done

- Card previews are not gated (no scrollable content yet).
- Tab from the editor into an embed (CodeMirror owns Tab).
