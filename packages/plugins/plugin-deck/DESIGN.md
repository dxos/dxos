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
attention directly. `scrollIntentRef` holds that focus on a plank a navigation is still travelling to,
so the hysteresis does not hand it straight back on the first scroll frame.

**The deck scrolls only when asked.** There are exactly two animated writers of scroll position, and
both are explicit:

- `useScrollIntoView`, for navigation from outside the deck (`LayoutOperation.ScrollIntoView`). It also
  focuses the plank, which is why an in-deck click does not reuse it — that would take the caret away
  from a click landing in a document.
- A delegated `pointerdown` on the stack: clicking a plank asks for it. Delegated because `Mosaic.Tile`
  forwards no pointer handlers, and captured so it settles before the click reaches an editor.

Three defenses keep those writers honest, each earned by a measured failure:

- **The click yields to navigation.** A click on a plank is often a click on a _launcher_ — a mailbox
  row opens a message — and both the click and the navigation it triggers would command the deck
  (measured: two writers per click). The click defers briefly and drops itself when a navigation
  intent appears or the deck changes under it.
- **Arrival watchdog.** A smooth scroll is a request, not a guarantee: a reflow mid-glide makes the
  browser abort it, stranding the deck (measured: command issued, deck never moved). A deck that sits
  still without arriving gets the command again; sitting at the destination — including the clamped
  one — is success.
- **Scroll anchoring is off** (`overflow-anchor: none`). A tile growing — a companion opening — made
  the browser silently shift the deck by exactly the width delta, with zero scroll commands; the
  instrumentation that exonerated every writer is how this was found. The `LauncherManual` story is
  the regression net for all three.

The deck deliberately does **not** scroll in response to attention. This was tried and removed. A hook
watched `attendedPlankId` and `companionId` and inferred "the user chose this plank", but attention also
moves for reasons that are not a choice — a companion resolving a commit later, the fold hysteresis
handing focus on, an exposé closing, a width cap recomputing. Each false positive earned a guard, and
the hook ended up with six of them plus a scroll-command dedupe, while still moving the deck under the
user when a companion opened. Intent is stated now, not deduced.

The corollary matters when adding features: a layout change must never scroll. A companion widens its
own tile, so the attended plank's edge does not move — nothing needs correcting, and correcting it is
what caused the jump.

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
- **The detail tab** — under flatten the main plank's detail (§5) shows as a companion of variant
  `detail`, contributed by the deck to any plank with a detail and labelled from the detail node's
  type (`AppNode.getTypeLabel`: "Message", "Task"). The tab renders the detail's own article with its
  own `attendableId`, exactly as the detail would render as a plank.

---

## 5. Details

A list plank opens its selected row as its **detail**: `Open({ subject, pivotId: <list plank>,
disposition: 'detail' })`, sent by `useDetailNavigation`. Only the caller knows an open is a detail, so
nothing is declared on any type; a plain `pivotId` still means "another plank beside this one".

`DeckState.details` maps owner plank id → detail plank id. Where the detail goes
(`resolveDetailOpen`):

- **Flattened** — the main plank's detail shows in the companion (§4). A detail opened _from_ that
  detail moves it into the main plank (the breadcrumb grows) and takes the companion itself. Going back
  through the breadcrumb shows the owner's remembered detail again, so links outlive the detail's plank
  and are pruned only once no open plank reaches them.
- **Not flattened** — a plank beside the pivot that takes the place of the pivot's previous detail;
  that one's own details close with it, so reading a second message drops the first one's attachment.
- **Mobile** — the same replacement, then a push onto the stack.

Closing a plank closes its details. A modified activation (meta/ctrl) sends `'add'` instead: a plank
of its own, outside the chain.

---

## 6. State

Three kinds of state, told apart by who owns them.

**What is open** is owned by the URL. The workspace, the ordered planks, and the open companion are
the pathname, and the deck stores no copy of them. The browser is the store.

**How it looks** is owned by the deck and persisted: plank widths, plank details, the sidebar
states, and which workspace you were last on.

**What is happening right now** is owned by the deck and not persisted: fullscreen, expanded, the
exposé, dialogs, popovers and toasts.

```ts
// Per workspace, persisted.
type StoredDeck = {
  plankSizing: Record<string, number>; // rem widths, by URL segment
  companionPlanks: string[]; // planks showing their companion
  details?: Record<string, string>; // owner plank id → detail plank id
};

// Per workspace, never persisted.
type OpenDeck = {
  active: string[]; // derived from the URL, never written by hand
  inactive: string[]; // planks that were closed
};

type EphemeralDeckState = {
  open: Record<string, OpenDeck>; // what is open, by workspace
  segments?: Record<string, string>; // plank id → the URL segment it came from
  fullscreen?: string;
  expanded?: string;
  expose?: boolean;
  // ...dialog / popover / toast fields
};
```

`DeckCapabilities.getDeck` merges the two for the active workspace, so everything downstream reads one
deck and never has to know which atom a field came from.

### Two representations of what is open

**Layer 1 is the pair chain**, `/w/<workspace>/<key>/<id>/…`. It is synchronous, always readable, and
cannot go stale, because reading it means parsing `window.location.pathname` rather than a copy of it.
A cached parse would be wrong the first time the user presses Back.

**Layer 2 is `deck.active`**, the graph node ids those pairs resolved to. Resolution is asynchronous,
so layer 2 always trails layer 1.

### One direction

```
operation ─┐
           ├─→ address bar ─→ projection ─→ deck state ─→ plank
external ──┘     (layer 1)                   (layer 2)
```

An operation reads layer 1, computes the chain it wants, and pushes it. Boot, a history traversal and
a deep link arrive at the same place, so a click and a Back press are the same event. Nothing writes
layer 2 except the projection, and nothing flows back up, so there is no reconciliation to get wrong.

Exactly three functions write anything:

- `Navigation.push` — the only write to layer 1.
- `applyActive` — the only write to layer 2.
- The operations that write a preference, which is not a claim about what is open.

### The projection runs twice

`projectUrl` applies the URL by pair first, so every plank the URL names renders its chrome
immediately; a plank with no node yet renders a loading shell, and says not found once resolution's
own deadline passes, since past it no node is still coming. A loader that proves the target absent
says so sooner; one that could not form a question at all never would. It then resolves the pairs and applies
them again by node id. A plank the deck already holds keeps the id it has, and an in-app navigation
hands the projection the node ids it navigated with (`Navigation.known`), so only a plank arriving
from outside — a deep link, a reload, a history entry the deck no longer holds — changes identity.
An identity change re-keys the plank's tile and remounts everything in it, its companion included,
which is why a click must never go through the placeholder.

That identity change is why per-plank preferences are keyed by URL segment rather than plank id: a
segment is stable across the refinement and an id is not. `segments` is the lookup between them, and
a plank is closed when its segment leaves the URL, never because its id was refined.

A projection can wait out its deadlines, so starting one interrupts whatever was running: the deck
holds the projection in flight (`DeckCapabilities.Projection`) and `FiberHandle.run` replaces it.
The interrupted caller returns no plank to attend rather than failing, since a navigation that has
been overtaken is moot rather than broken.

The URL only records the workspace you are in, so the other workspaces' open planks are remembered
for the session and no longer. A reload arrives with none, and a workspace you switch to seeds itself
from its first child exactly as it does on a first visit.

The selected companion _variant_ lives in `react-ui-attention` view state, not here
(`util/companion-view-state.ts`).

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

- `LayoutOperation.Open({ subject, disposition?, pivotId? })` — `'solo'` (default) navigates,
  `'add'` inserts after `pivotId` or at the end, `'auto'` follows the deck, `'detail'` opens the
  subject as `pivotId`'s detail (§5).
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

### Navigation

Every navigation operation computes the chain it wants and calls `navigateDeck`, which pushes the URL
and projects it (§6). None of them writes `active`. Attention is never in the URL; an external URL
lands it on the last plank in the chain, while an operation attends whatever it acted on.

---

## 9. Keyboard

- `meta+;` — toggle the exposé; `Escape` leaves it.
- `←` / `→` — step to the previous/next plank and attend it, without wrapping. Gated on
  `isPlankLevelFocus()`: the focused element must be the attendable container itself, so a caret in an
  editor, a list or a toolbar keeps its own arrows. Reaching that level is tabster's groupper ladder —
  Escape leaves the editor, Escape again lands on the plank. In the exposé the gate is dropped, since
  the miniatures are inert, and attention moves by focusing the target plank with `preventScroll` so
  the row stays parked and the exposé stays open.

  The step is computed from the _focused_ plank read out of the DOM, not from `attendedPlankId`:
  attention arrives with a render, so held-down key repeat outruns it and every event in a burst would
  step from the same stale plank — measured as eight rapid presses moving one plank.

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

- `util/*.test.ts` — pure geometry and state helpers (`companion-anchor`, `layout`).
- `url/*.test.ts` — the URL vocabulary and the close diff (`navigation`, `set-active`).
- `Deck.stories.tsx` — one `DefaultStory` plus args; play-tested variants are tagged `test`, and
  numbered manual scripts hang off play-free `*Manual` variants.

A green build is not a tested deck: the geometry lives in layout effects reading real rects, so
anything touching §3 or §7 wants a browser. Frame-level assertions (sampling `getComputedStyle` and
rects across `requestAnimationFrame`) are what caught the exposé's scroll clamping, the fold crossfade
and the FLIP ordering — none of which typecheck differently when broken.

---

## 12. Plugin-declared decks (removed)

A type could once declare its deck (`DeckSpec` via `AppAnnotation.DeckAnnotation`): a chain of levels
(`mailbox / message / attachment`) and `initial: 'children'` for collections. Both are gone. A chain is
one-step links that belong to the middle type (task → attachment is a property of `Task`, under a
project or a task set alike), and the caller already knows when an open is one of those steps, so §5
replaced it. Seeding never ran under flatten, and without plugin-stack a collection row is not
selectable, so it was unreachable from the navtree.
