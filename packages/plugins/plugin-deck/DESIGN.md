# Deck

The deck is the app's main region: a horizontal run of **planks**, each rendering one graph node's
article surface. This document is the current design record. For the navigation model (dispositions,
what a click does) see `PLUGIN.mdl`; for the URL grammar see
`.agents/projects/url-deck-redesign/DESIGN.md`.

---

## 1. Composition

The split is deliberate: `components/` are dumb and reusable, `containers/` own every capability and
operation.

| Layer                  | Holds                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `components/Pane`      | The 48px toolbar chrome — sigil, title, tabs, content. No node, no capabilities.     |
| `components/Plank`     | Node → `Pane` + Article `Surface`; declares the node's attendable region.            |
| `components/Companion` | Companion tabs plus every panel mounted (inactive ones hidden, never unmounted).     |
| `components/FoldSpine` | The sliver a folded plank shows in a pile; owns `SPINE_PX`.                          |
| `containers/Deck`      | `DeckRoot` → `DeckContent` → `DeckViewport`; graph, attention, operations, geometry. |

`DeckViewport.tsx` is where the geometry lives. Everything renders through one pipeline —
`Mosaic.Container > ScrollArea > Mosaic.Stack` — with `DeckPlankTile` per plank. There is no second
render path: presentations and the exposé are styling variations on that one mounted stack, so a plank
never remounts when the deck's shape changes. This is load-bearing; see §7.

---

## 2. Presentation

Derived from plank count and breakpoint, never stored (`hooks/useDeckPresentation.ts`):

- **`fullbleed`** — a single plank at `md`+. Absolute inset, no resize handle, no horizontal scroll.
- **`sliding`** — two or more planks, and always below `md` (full-viewport-width planks with
  scroll-snap).

Counted in **planks, not panes**: a companion shares its plank's container rather than taking one of
its own, so opening it never changes the presentation.

The `flatten` setting collapses the deck to one plank at a time with the rest as breadcrumbs
(`getRenderedPlanks` in `util/companion-anchor.ts` narrows the rendered list; `deck.active` is
untouched, so the real deck is still there underneath).

---

## 3. Stacking geometry

The sliding deck follows the stacked-notes pattern (notes.andymatuschak.org). Each tile is
`position: sticky` on **both** edges:

```ts
insetInlineStart: `${index * SPINE_PX}px`,
insetInlineEnd:   `${(rendered.length - index) * SPINE_PX - tileWidthPx}px`,
zIndex:           index + 1,
```

A positive per-index start inset builds the **left pile**; a _negative_ end inset lets a plank slide
fully off the right edge and pin only once a spine's worth remains, building the **right pile**. Both
are native CSS, so the spines never lag or flicker during a scroll — no per-frame JS repin. z-order
stacks later planks above earlier ones so right-hand spines read on top.

**Folding** is presentation only. `useFoldedPlanks` reads the already-pinned rects and stamps
`data-folded` when a plank's visible sliver drops below `FOLD_THRESHOLD_PX` (a spine plus the gap);
the tile's content crossfades out over 200ms while `FoldSpine` crossfades in. A folded plank keeps its
width and stays mounted.

**Width cap.** `useMaxPlankWidth` caps a plank to _exactly_ the gap the two piles leave it: the
viewport, less one spine per other plank, less the single inter-plank gap, less the stack's leading
padding. The exactness matters — reserving any more leaves the _next_ plank short of its own pin
position, and since sticky pins but never pushes, it wedges a part-drawn header over the current plank
instead of folding.

**Attention hysteresis.** Attention must always point at a plank the user can see, so when the
attended plank folds (or leaves the viewport on mobile) `useFoldedPlanks` moves focus to the unfolded
plank nearest the viewport centre. Attention is focus-driven, so it moves focus rather than setting
attention directly. Two guards keep this from fighting the user: `scrollIntentRef` holds focus on a
plank a navigation is still travelling to, and `handoffRef` marks attention this hook handed over so
`useCollapseAfterAttended` does not read it as a deliberate choice and scroll back against the gesture.

**Collapse on attend.** `useCollapseAfterAttended` scrolls a newly attended plank flush against the
left pile, which pushes everything after it off the trailing edge into the right pile. The offset
cannot come from a rect or `offsetLeft` — while sticky, both report the _pinned_ position — so
`scrollPlankToPile` sums the preceding planks' widths and gaps and backs off one spine each.

---

## 4. Companion

A companion renders **beside the plank it belongs to**, sharing that plank's container across a single
`Splitter` seam — the same seam whether the deck is fullbleed or sliding, so opening a second plank
never moves it.

- **Which plank** — `resolveCompanionAnchor` picks the attended plank, else the last. Nested ids
  (`<mailbox>/<message>`) resolve by **longest** prefix match, or a message's companion would attach
  to its mailbox.
- **Per plank, not per deck** — `DeckState.companionPlanks` lists the planks showing their companion,
  so moving between planks restores what each was left in.
- **Sizing** — the tile is the plank's own width _plus_ the companion beside it, and the companion's
  width is held deck-wide under `COMPANION_SIZE_KEY` (not a valid node id, so it cannot collide).
  Opening or closing the companion therefore never resizes the plank. Dragging the seam commits both
  widths in one `UpdatePlankSizes`, because two sequential writes render an inconsistent intermediate
  frame and the size visibly flickers on release.

---

## 5. Named planks

A plank may carry a **name**, which makes it behave like a browser tab: opening under a name that is
already taken replaces its occupant in place rather than growing the deck. `DeckState.plankNames` maps
name → plank id and is pruned as planks close. The mailbox passes `<mailbox>/message`, so reading down
a mailbox reuses one plank instead of adding one per message.

Only the _first_ subject of an open may take the name — that is the one the name is bound to. If it is
already open elsewhere it keeps its position and takes the name with it, and the plank that held the
name stays open as an ordinary plank.

---

## 6. State

```ts
type DeckState = {
  active: string[]; // presentation derives from length + breakpoint
  inactive: string[];
  plankSizing: Record<string, number>; // rem widths by plank id, plus the companion's own key
  companionPlanks: string[]; // planks showing their companion
  plankNames: Record<string, string>; // name → plank id
};

type EphemeralDeckState = {
  fullscreen?: string; // plank rendered headless over the deck
  expanded?: string; // plank filling the space between the two piles
  expose?: boolean; // every plank at once, shrunk to fit
  scrollIntoView?: string;
  // ...dialog / popover / toast fields
};
```

Persisted state is versioned through `util/migrate-persisted-state.ts`. The policy for unshipped
fields is **drop, don't migrate**: `Atom.kvs` falls back to `defaultValue` when a blob fails to decode,
so a removed field costs a fresh local deck and nothing more. The selected companion _variant_ lives in
`react-ui-attention` view state, not here (`util/companion-view-state.ts`).

---

## 7. Exposé

`meta+;` shows every plank at once as shrunk-to-fit tiles; Escape, a background click, or picking a
tile returns. Clicking a tile also brings that plank to the front.

**It is the same mounted deck, scaled.** `Mosaic.Stack` is transformed in place — no second copy of the
planks, so no plank remounts and no editor is instantiated twice. Only `style`/`classNames` change.
Four things this needs, each of which was a real defect first:

- **Scroll.** A transform does not change layout, so the scrollable width is untouched and the deck
  stays scrolled where it was — the shrunken row would sit off the leading edge with most planks out of
  view. `useExposeScroll` parks the scroll at zero on the way in and restores it on the way out. The
  scrollbar is hidden inline (a class would lose to the viewport's own `overflow-x-scroll`) and held
  hidden through the morph, since a transformed tile still counts towards scrollable overflow.
- **Sticky.** Tiles take `relative` while exposed. Sticky resolves against the scrollport in the scaled
  coordinate space and would re-pile the tiles the exposé means to lay out flat.
- **Folds.** Crossing the boundary refolds the whole deck at once, and the fold is a 200ms crossfade —
  long enough to paint the planks over the spines replacing them. `data-fold-instant` drops the
  transition for that frame, stamped in the same task as `data-folded` so the browser resolves both
  together.
- **Attention.** `useExposeScroll` must run **before** `useFoldedPlanks` (hooks run in declaration
  order), and neither the hysteresis nor the collapse may fire across the crossing: at the zeroed scroll
  every trailing plank reads as off-screen, which is enough to walk attention onto whatever sits near
  the start. The exposé round trip is attention-neutral by design.

**The transition is FLIP** (`useExposeFlip`), not a transition on the stack's transform. The two
layouts — sticky/folded/scrolled versus flat/unfolded/scaled — have no CSS interpolation between them,
so animating the transform alone leaves the rearrangement to snap on the first frame: the deck jumps
and _then_ grows. Instead every layout change lands at once, each tile is transformed back to where it
just was, and releasing that transform is what the eye follows. Two constraints hold it up:

- `capture()` runs in the **toggle handler**, never an effect. React has already committed the new
  layout by the time an effect runs, so that is the last moment the previous geometry exists.
- The scale is written onto the host element **imperatively**, not held in React state. As state it
  arrived a commit later, so the FLIP measured the deck at full size and the zoom in did not animate.
  For the same reason the natural width is summed from tile `offsetWidth` and never
  `stack.scrollWidth`, which counts transformed overflow and mid-FLIP reports a far wider stack.

---

## 8. Operations

- `LayoutOperation.Open({ subject, disposition?, name?, pivotId? })` — `'solo'` (default) navigates,
  `'add'` inserts after `pivotId` or at the end, `'auto'` follows the deck. `name` gives browser-tab
  reuse (§5).
- `LayoutOperation.Close` / `UpdateComplementary` / `UpdateCompanion` / `ScrollIntoView`.
- `DeckOperation.Adjust({ id, type })` — `close`, `companion`, `fullscreen`, `expand`,
  `increment-start`, `increment-end`. `fullscreen` and `expand` toggle ephemeral state rather than
  mutating `active`.
- `DeckOperation.UpdatePlankSize` / `UpdatePlankSizes` — the plural form applies several widths in one
  update so a seam whose panes trade width never renders a half-resized frame.
- `DeckOperation.ToggleExpose({ expose? })`.

`ScrollIntoView` is the single "bring this plank to the front" path, shared by navigation, a folded
spine's click, an exposé tile, and the arrow keys. It scrolls **and** attends, because the plank
focuses itself off the same one-shot flag.

### URL sync

`capabilities/url-handler.ts` parses the pathname's pair chain (`/w/<workspace>/<key>/<id>/...`) and
reverse-serializes `deck.active` plus the open companion back into it on every change
(`util/serialize-deck-url.ts`). Attention is never serialized and never triggers a sync; on load it
defaults to the last plank in the chain.

---

## 9. Keyboard

- `meta+;` — toggle the exposé; `Escape` leaves it.
- `←` / `→` — step to the previous/next plank and attend it. Gated on `isPlankLevelFocus()`: the
  focused element must be the attendable container itself, so a caret in an editor, a list or a toolbar
  keeps its own arrows. Reaching that level is tabster's groupper ladder — Escape leaves the editor,
  Escape again lands on the plank.
- `Escape` — exits fullscreen.

The arrow stepping is deliberately _not_ tabster's Mover yet: that is the principled version
(`Focus.Group` in `react-ui` already wraps `useArrowNavigationGroup` + `useFocusableGroup`), but
`MosaicStackProps` is a narrow `ThemedClassName<… & Pick<…>>` and forwards no arbitrary DOM props, so
`data-tabster` cannot be attached to the stack without changing `react-ui-mosaic`.

---

## 10. Layout experiments

Behind `Settings`, each off by default and independent, so a shape can be tried without committing to
it. Drop the flag once one settles rather than leaving it a permanent preference.

- **`overscroll`** — trailing runway so the last plank can be brought fully forward like any other,
  sized to exactly that resting position. Suppressed while exposed, or it would count towards the
  width the scale has to fit.

Shipped without a flag because they are additive and reversible: `expand` (a toolbar toggle filling the
space between the two piles) and the exposé.

---

## 11. Testing

- `util/*.test.ts` — pure geometry and state helpers (`companion-anchor`, `layout`, `set-active`,
  `serialize-deck-url`, `migrate-persisted-state`).
- `Deck.stories.tsx` — one `DefaultStory` plus args; play-tested variants are tagged `test`, and
  numbered manual scripts hang off play-free `*Manual` variants.

A green build is not a tested deck: the geometry lives in layout effects reading real rects, so
anything touching §3 or §7 wants a browser. Frame-level assertions (sampling `getComputedStyle` and
rects across `requestAnimationFrame`) are what caught the exposé's scroll clamping, the fold crossfade
and the FLIP ordering — none of which typecheck differently when broken.
