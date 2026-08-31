# react-ui-feed — design

One engine for every list of messages in the repo: AI chat, email, human chat, comments,
transcription. A feed is a virtualized list where **each message is its own markdown document**, the
chrome around it belongs to the host, and everything that spans messages — selection, search, copy —
is answered from the model rather than the DOM.

The audit that motivates this, the five call sites it has to serve, and the measured verdict live in
[`plugin-assistant/docs/AUDIT.md`](../../plugins/plugin-assistant/docs/AUDIT.md) §3.3–§3.4.

[`TESTING.md`](./TESTING.md) is the manual plan: what a person has to confirm, and why each item
cannot be a test.

## Principles

What the list is allowed to assume, and what follows from it. Everything below this section
describes what exists today; this describes what it should be built on, and the plan that follows.

Every claim here is either an invariant a test asserts or a measurement taken in a real browser. The
numbers are from `baseline/*` and are quoted so a future change can be checked against them rather
than argued with.

#### 1. Build up from sub-modules, and accept only at the composed level

A list has too many corner cases to be got right in one piece, so it is built from parts that can
each be tested — and the bisection ladder (`uniform-text` → `-bare` → `-themed` → `-markdown` →
`-decorated` → `-item`) is what located a 6× cost that inspection would not have.

**But isolation lies.** The same editor measured 0.37ms built into an offscreen container and 14ms
built into a real row. A sub-module's number is evidence about the sub-module, never about the
system; the acceptance test is always at the composed level.

#### 2. The renderer owns the box; the host owns everything inside it

Container, viewport, rows. What a row _means_ — a prompt, a stop the arrow keys land on, a speaker
change — belongs to layers above. Five call sites (chat, email, human chat, comments, transcription)
differ only in a renderer and a chrome, which is the evidence that the seam is in the right place.

**Therefore the host owns the estimate.** Chrome is the host's, chrome has height, and a height the
renderer cannot see is a height it cannot estimate. Got wrong three times: a 1px separator left out
of the plain estimate, `uniform` declaring 84px against a real 24px, and the assistant's per-message
estimator.

#### 3. Rows are placed relative to an anchor, not from the start of the list

An absolute offset computed by summing every row before it makes the total a fiction that changes
whenever anything measures. Every defect this package has not been able to close descends from that
one fact: the layout has to be rebuilt from index 0 when the average drifts (`resizeItem(0, …)`),
the rebuild moves every offset, and a tail computed at that instant is wrong in both directions —
measured with the element reporting 20,852 settling to 20,412 while the model reported 19,803
settling to 19,576.

Anchor-relative placement does not remove estimation. It **moves it from row placement to scrollbar
geometry**, which is the trade worth making: a placement error is a row jumping under the reader, a
scrollbar error is a thumb that is slightly the wrong size.

#### 4. The anchor is a message, never an index

An index is invalidated by anything that prepends, truncates or reorders — a rewind, a filter, a
space switch. The anchor must survive all of those, so it is identified by message id, and its
offset is the one position in the list that is known exactly.

This is the invariant that makes principle 3 work at all, and it is testable on its own: **the anchor
is always mounted.**

#### 5. Only rows near the anchor need accurate extents

Rows far from the anchor need an extent good enough for the scrollbar and nothing more, because
nothing is placed relative to them. "Near" means near _the anchor_, not near the viewport — during a
scroll the two diverge, and that divergence is where corrections land.

The corollary is the point: **there is no re-base.** The machinery that periodically rebuilds the
layout from index 0 exists only to fix a total that principle 3 stops depending on, and it is the
direct cause of the whole-page jump at ~700ms and of eighteen rows moving 111px on a rebuild.

#### 6. Rows flow; only the window is placed

A row that changes height — a panel opening, an image decoding, an answer growing — re-places every
row after it. With rows positioned absolutely that re-placement is the list's job: opening one
disclosure moved rows on **19 frames and cost 177 individual row re-placements**, about eleven rows a
frame for the whole 250ms animation, each one a React render and a transform write driven from a
`ResizeObserver`. In normal flow the browser does the same work in the same frame, for nothing.

So the mounted window is a **flow container placed as a unit** — one positioned element, not N.

It is also the more correct arrangement. N independent transforms accumulate sub-pixel error where
flow sums exactly; and margins, gaps and separators work normally instead of having to be baked into
an estimate, which is the class the plain feed's missing 1px separator belongs to.

Native CSS scroll anchoring becomes available here too, and should be turned **off**
(`overflow-anchor: none`). Two things anchoring one thing is the defect this package keeps hitting;
the browser doing it silently as well would make it unattributable.

The shape that follows is §7.

#### 7. One contiguous parent, absolutely positioned; corrections move it, never the scroll

The mounted rows are children of a single parent laid out by the browser in flow, and that parent is
absolutely positioned within the scroll container. The scroll thumb is computed from its offset and
the estimates for what lies outside it.

```html
<div class="scroller">
  <!-- overflow-y:auto; position:relative; overflow-anchor:none -->
  <div class="sizer"></div>
  <!-- height only: gives the thumb something to measure -->
  <div class="window">
    <!-- position:absolute; inset-inline:0; top:0; transform:translateY(offset) -->
    <div class="row">…</div>
    <!-- static, in flow, no positioning -->
    <div class="row">…</div>
  </div>
</div>
```

Four things make it work. The **sizer holds no rows**, so changing it can never move content.
**`transform`, not `top`**, because the offset changes on every prepend and correction and transform
skips layout. **Rows are unpositioned**, which is the whole of §6. And the **scroller is the only
scrollable box**, with nothing but the reader writing `scrollTop`.

**One sizer, not two.** A second, top sizer is what the classic in-flow arrangement needs to push the
window down; here the offset does that job, so a top sizer would be a competing way to say the same
thing.

```
sizer.height = offset + window.height + estimateAfter
```

**`offset` is authoritative; the estimate for the region above is derived from it, not the reverse.**
This is the whole reason to position the window rather than use spacers, and it only holds stated
this way. Compute `offset` _from_ an estimate of what is above and revising that estimate moves the
window — the spacer problem, wearing a different hat. Derive it the other way and the offset is
whatever real scrolling and real measurement produced, the region above is merely _described_ by it,
and nothing outside the window can move what is on screen. The thumb drifts slightly from true
instead, which is the trade §3 asks for.

The exception is a jump to a distant index, where there is no measured path and `offset` has to come
from estimates — but a jump is a discontinuity the reader expects.

**Two edge invariants** replace the second sizer, and they are where estimate meets ground truth:

1. When the model's **first** row is mounted, `offset === 0`.
2. When the model's **last** row is mounted, `offset + window.height === sizer.height`.

If the reader scrolls to the top and `offset` is not zero, the region above was shorter than
estimated — and the correction goes to the **sizer**, never the window, so nothing on screen moves. A
negative `offset` is the same discovery arriving as a bug signal. Reserved tail space folds into
`estimateAfter`, which is what stops `scrollPastEnd` being a special case.

**Appending is free.** Scrolling down, or a turn streaming into the tail, adds rows to the end of the
parent: nothing above them moves and nothing needs compensating. That is the common case, and it
costs nothing.

**Prepending is the whole problem.** Scrolling up inserts rows at the start, pushing the rest down by
their height, so the parent's offset must move up by the same amount. The two have to land in one
frame or the reader sees the jump — achievable, but not in one step:

1. Insert the rows in a commit.
2. Measure them in the **parent's** layout effect: parents run after their children, so by then the
   rows exist and nothing left to run writes to the DOM.
3. Set the parent's offset in that same effect, before paint.

The residual is §8 — an estimated extent is a subscription, not a measurement. A newly inserted editor can grow
after that effect, when a font loads or a portaled widget paints, so the offset is re-adjusted
whenever the prepended region's height changes rather than once.

**And this is why the model earns the work:** the correction moves the parent's offset, not
`scrollTop`. The reader's scroll and the list's corrections stop sharing a channel. Every "two things
compensating for one change" defect in this package has been two writers of `scrollTop` — the follow
against the virtualizer's adjustment, an arrow key's smooth scroll against a measurement landing
mid-animation, the tail restore against a rebuild. A correction that never touches the scroll
position cannot have that class of bug.

Two things to keep honest:

- **The before-estimate must not be revised under a scroll.** It feeds the container's height, so
  changing it changes where the bottom is. Revise on quiet, as the current re-base gate does, or
  accept a thumb that is approximate. This is the one place the old problem could return.
- **`scrollPastEnd` stops being a special case.** Pinned to the tail means the parent's bottom sits at
  the container's bottom less whatever is reserved — an offset, like every other position. The flag
  that could not be stabilised on the current model is not a flag on this one.

#### 8. Extents, not heights — and the host says whether its answer is exact

Placement works in one number per row: its **extent along the scroll axis**. Whether that number was
measured, estimated or declared is the host's business and not the module's, which is §2 seen from
the other side.

Two ways to supply it, and the call site states its intent rather than configuring a mode:

- **`estimateSize`** — a guess. Measurement corrects it, and the machinery of §3–§7 exists for this
  case: an extent that is unknowable until the row renders, and that then changes again.
- **`exactSize`** — a promise. The layout constrains the extent, so it is known before anything
  renders: a horizontal feed of declared-width items, or a feed of fixed-height rows. Offsets are an
  exact prefix sum, there is nothing to correct and nothing to drift, and no `ResizeObserver` is
  attached at all.

`exact` is one flag on one code path, not a second implementation. The arithmetic is identical; it
decides only whether the DOM binding observes.

**`exact` means "do not correct". It does not mean "do not check."** In dev and test the extent is
measured anyway and a mismatch is reported; in production it is trusted. This session is the whole
argument: a declared extent was wrong three times — a 1px separator left out, `uniform` declaring 84px
against a real 24px, the assistant's estimator — and every one of them presented as a mysterious
visual defect rather than as _your callback is wrong_. A drift report turns a day of bisection into a
line naming the index and the delta.

**Where the estimate is a guess, it is a subscription and not a measurement.** A CodeMirror row cannot
be measured before it renders, and it cannot be measured _once_ either: its extent changes after
first paint when a font loads, when portaled widget content arrives a frame later, when an image
decodes. Anything treating measurement as a one-time event is wrong about CodeMirror specifically —
which is why a block widget needs a reserved floor (`heightMode: 'min'`) rather than a fixed height,
a fixed height being what pins the box and clips a disclosure open.

#### 9. One axis, named not assumed

The principles hold whichever way the list runs, so nothing below the call site names a direction.
Placement is scalars — `start`, `extent`, `viewportExtent`, never `top` or `height` — and the DOM
binding takes an axis and maps it to `overflow-y`/`overflow-x`, the sizer's `height`/`width` and the
window's `translateY`/`translateX`. Free in the module, one small style map in the binding.

Horizontal is the **easier** case, not the mirrored one: the layout constrains an item's width, so
extents are `exact` (§8) and the whole correction apparatus stands down. That makes it a useful
control — a feed whose extents cannot lie, exercising the same module, so any movement in it is the
module's own fault. `baseline/plain` is the same control on the vertical axis.

Two cautions. This repo's Tailwind dropped `tailwindcss-logical`, so `is-*` / `bs-*` / `pis-*`
compile to nothing — a `min-bs-[2.125rem]` here was silently inert for weeks — and the axis switch has
to be explicit rather than borrowed from logical properties. And **direction is not axis**: pinning to
the bottom is a reader's expectation about recency, whose horizontal equivalent inverts under RTL, so
the follow needs a direction of its own rather than inheriting one from the axis.

Untested is untested: the axis is neutral in the API from the start, and horizontal is claimed only
where a story proves it.

#### 10. Rows are moved, never rebuilt

Repositioning a row must not destroy what is inside it. A CodeMirror view removed from the DOM loses
its measurement state, needs `requestMeasure()` on re-attach, and can drop focus and selection.

**Portals are not the mechanism for this.** A portal's node lives wherever its host element is, so
moving it is the same DOM move; what a portal preserves is React tree identity — state and context
survive, which is how widget state now survives virtualization. Moving a row without rebuilding it
is: transform-based placement, stable keys, and a pool.

#### 11. Measure out of view, in context

Measuring a row before it is revealed is what stops the reader seeing it settle. The hazard to
respect is that an element measured in a different containing block, width or style context measures
a different element — off-screen must mean _out of view_, not _out of context_.

`content-visibility: auto` with `contain-intrinsic-size` is the alternative worth weighing: it defers
rendering while the row stays in flow, which makes the context question disappear.

#### 12. An invariant that cannot be observed from the DOM is not an invariant

Two tests in this package passed while measuring nothing: one compared a field a later edit had
deleted (`undefined !== undefined`), the other streamed into a feed too short to scroll. Both were
green for weeks of work and cited as evidence.

So: every invariant is a property readable from the DOM, and every test carries a known mutation that
breaks it. A test is not trusted because it is green; it is trusted because it has been seen to fail.

### What follows

#### What dies

| Today                                      | Why it exists                                      | After                                  |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------------- |
| `resizeItem(0, average)` + the rebase gate | The total is a prefix sum and drifts               | gone (§5)                              |
| The rebase restore + `pendingRebase`       | Repairs the damage the rebase does                 | gone                                   |
| `initialOffset: count * nominalSize`       | Guesses where the tail is before anything measured | gone (§4)                              |
| `trailing` / `scrollPastEnd` special cases | The element's maximum stops meaning the last row   | falls out of anchor-relative placement |
| `ScrollFollower`'s tail-chasing            | Two parties anchoring one end                      | one anchor, held continuously          |
| `scrollTop` writes in the correction path  | Corrections and the reader share one channel       | the parent's offset moves instead (§7) |
| Per-row `transform: translateY(start)`     | Rows are placed individually                       | rows flow; the window is placed (§6)   |

#### The order

Three layers, each able to fail on its own, which is what says where a defect is.

1. **`placement.ts` — pure, no DOM.** `place({ anchor, extents, viewport, overscan, count })` →
   `{ first, last, offset, sizerExtent }`, with `measure`, `prepend`, `append`, `jumpTo`. Extents
   keyed by **message id**, not index, so a prepend cannot invalidate them (§4); scalars only, so the
   axis is never baked in (§9). Unit-tested in node, and it replaces `virtualizer.test.ts` — which
   tested a library this would no longer place with, in a version production never ran.
2. **`Window` — the DOM shape, no CodeMirror.** Sizer, window, plain rows of declared extent. Content
   that cannot lie about its size, so anything that fails here is the shape and not the item.
3. **The swap.** `MessageList.Viewport` renders `Window`. `baseline/*` is the acceptance suite and
   **does not change** — that is what makes it evidence rather than decoration.
4. **The deletions**, once the baselines hold without them: everything in _What dies_.
5. **Pooling and `content-visibility`** last, judged by `baseline/mount` — not before, because the
   current numbers say construction is not the bottleneck.

#### The storybooks

`ui/react-ui-feed/placement/*`, against `Window` alone:

| Story        | Asserts                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `Static`     | `offset === 0` at the top; `offset + window === sizer` at the bottom; the arithmetic               |
| `Append`     | rows added at the end move nothing above them, and `offset` does not change                        |
| `Prepend`    | no mounted row moves on the frame the insert lands — including under a scroll in flight            |
| `Grow`       | a row changing extent moves those after it and none before, with **no re-placement written by us** |
| `Jump`       | a far `jumpTo` lands, and both edge invariants hold afterwards                                     |
| `Horizontal` | `Static` and `Grow` on the other axis, where extents are `exact` (§9)                              |
| `Drift`      | a deliberately wrong `exactSize` is **reported**, not silently absorbed (§8)                       |

`baseline/*` stays as it is: fill, tail, navigation, streaming, widget-state, mount, construction.
`baseline/widget-state` carries §6's target — it counts the row re-placements one disclosure costs and
holds them under a ceiling of 260 (177 today), which the move to flow should take to approximately
zero.

#### What could kill it

1. **Prepend atomicity with late extents.** Plain divs cannot catch a CodeMirror row that grows after
   the layout effect (§8); only `baseline/*` will.
2. **A reader scrolling during a prepend.** The claim is that never writing `scrollTop` makes this
   safe. It is a claim, and `placement/Prepend` is where it is tested.
3. **Thumb drift** on long feeds, since `offset` is authoritative and the region above is derived
   from it rather than the other way round (§7).

#### What this is not

Not a rewrite of the whole package. `MessageList.Root`'s API, the chrome seam, the renderers, the
selection group, the widget-state store and the six baselines all survive; the change is confined to
how a row's position is computed. If step 2's module cannot make the baselines pass, the swap is
one file to revert.

#### The evidence that this is the right direction

A half-measure was tried and measured: adopting the virtualizer's own end-anchoring (`anchorTo:
'end'`) while keeping the existing follow took `baseline/fill` from 1 failure to 4 and `baseline/tail`
from 0 to 4, because two parties were anchoring the same end. That is not an argument against
anchor-relative placement — it is an argument that there must be exactly one anchor, owned in one
place, which is what §3 and §5 say.

## Shape

| Part                   | Role                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MessageList.Root`     | Headless: owns the virtualizer, the selection group, the cursor. Renders no DOM, so a toolbar or statusbar can read its state from outside the scroll container. |
| `MessageList.Viewport` | The scroll container (`ScrollArea`) and the mounted window of rows.                                                                                              |
| `MessageList.Item`     | One message, rendered by the kind its renderer resolves — markdown, HTML, or a host component.                                                                   |
| `MessageRenderer`      | Message → item content. `defaultRenderer` for prose feeds, `chatRenderer` where the reader's turns are marked `<prompt>`.                                        |
| `Chrome`               | Host-supplied wrapper per row: avatars, timestamps, fork/rewind/reply, resolve.                                                                                  |
| `feed-model`           | `searchFeed`, `sliceFeed`, `messageText` — the projection both search and copy read.                                                                             |

Blocks that are not prose become XML tags (`<reasoning>`, `<toolCall>`, `<suggestion>`) which
`@dxos/ui-editor`'s `xmlTags` turns into widgets. A registry changes how the document is **parsed**,
not only how it is decorated, so an item with widgets must use `extendedMarkdown({ registry })`.

## Measurement is the whole problem

Everything hard here follows from one fact: **a row's height is unknowable until it has rendered**.
The virtualizer places rows from estimates, replaces each estimate with a measurement as the row
mounts, and every correction moves the offset of that row and all the rows after it.

- Scrolling **down**, corrections happen above rows that have already been measured — invisible.
- Scrolling **up**, rows are measured for the first time exactly as they enter — and the whole window
  jumps by the size of the correction. Measured at ~9% of frames, median 67px, before anchoring.

Four mechanisms address it, in the order the correction is made smaller:

1. **A per-message estimate.** `estimateSize` accepts a function, so a host that knows its content
   can estimate from it — a one-line prompt and a long answer share no useful average. Cut the
   correction from 197px to 88px in the assistant feed.
2. **A running average** as the fallback estimate, re-based on measured rows when the caller supplies
   only a number. The re-base rebuilds the layout from the top (`resizeItem(0, average)` — the one
   supported way to make the virtualizer start again from index 0) and is deliberately never run
   under a scroll, only after 400ms of quiet and at most three times.
3. **Reserved widget height.** A block widget's React content is portaled and paints a frame after
   CodeMirror places the box, so the row would be measured empty and grow. `estimatedHeight` +
   `heightMode: 'min'` gives the box a floor. Not `fixed`, which pins the box shut and clips a
   disclosure.
4. **Scroll anchoring** — what remains after the estimate is as good as it can be.

### Scroll anchoring — the virtualizer's, not ours

Measuring a row changes the offsets of everything after it, and the only thing that keeps the screen
still is moving `scrollTop` by the same distance. **The virtualizer already does this**
(`resizeItem` → `_scrollToOffset(offset, { adjustments })`, with the DOM adapter adding the
adjustment to the target), and `virtualizer.test.ts` asserts it holds: a row the reader is on does
not move when a row above it, below it, or a batch of rows entering during an upward scroll are
measured.

A second layer of anchoring was written here and then removed, because two things compensating for
one correction produce a jump of exactly the correction's size — the signature seen in a screen
recording (a clean glide, then two frames moving against the scroll). If a fix ever seems to need
anchoring above the virtualizer, add the case to `virtualizer.test.ts` first: three earlier
"reproductions" were faults in the harness, not the library.

**The layout is not where the flicker lives.** `virtualizer.test.ts` drives the real `Virtualizer`
through every case that was suspected — a row measured above the reader, below, a batch entering
during an upward scroll, and a row measured empty and then corrected (what a ref callback does to an
item that builds its content in a layout effect) — and in all of them the reader's row ends exactly
where the gesture put it. The arithmetic is self-consistent at every step.

What remains is **paint order**: between two measurements there is a frame in which the DOM holds the
intermediate offsets, and that frame is painted. So the cure is not better arithmetic but fewer
measurements — measure once, correctly, before the frame is drawn. Rows are therefore measured in a
layout effect on the row component rather than in its element's ref callback: refs run before any
layout effect, so a ref-measured row is measured before its own item has built anything.

`MessageList/Plain` (fixed-height divs, no editor) and `MessageList/Uniform` (one editor per row, all
identical) exist to localize what is left: if `Plain` is still, the list is sound and the fault is in
what an item builds after it mounts.

## What a row costs

The first fill mounts a viewport of rows in one frame, so its wall-clock cost is the per-row cost
times the rows on screen. Three instruments, each ruling out an explanation the one before it
suggested — all under `baseline/*`, all needing a real browser:

| Instrument              | Answers                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `baseline/construction` | What one editor costs to build offscreen, by extension set.          |
| `baseline/fill`         | How many frames the list takes to settle, and how long they blocked. |
| `baseline/mount`        | What a whole feed costs to mount, fixtures already built, per rung.  |

What they established, in order:

1. **The layout is not the cost.** The fill settles in one or two frames, so there is no cascade of
   corrections — but each of those frames blocked for hundreds of milliseconds.
2. **Construction is not the cost either.** One editor offscreen is 0.37ms (uniform) / 1.48ms (long
   prose), so a viewport of them is ~8ms, not a second.
3. **Nor is the extension set.** The bisection rungs (`uniform-text` → `-bare` → `-themed` →
   `-markdown` → `-decorated`) all sit at 0.6–2.5ms per row, with the _same_ extensions the item
   uses. Only the real item was slow, at 14ms.
4. **It was building the extensions per item.** `EditorView.theme()` mints a new `StyleModule` and a
   new generated class on every call, so a set built per row injects one stylesheet per row and
   invalidates the whole document's style each time. Sharing the set — everything except the
   `setWidgets` callback, which is genuinely per-item — took `uniform` from 628ms to 102ms and
   `assistant` from 591ms to 137ms.

The rule that follows: **an extension set is built once per (registry, editable, themeMode), never
per item.** `createBlockExtensions` caches on exactly that, and `baseline/mount` is what would catch a
regression — a row that costs ten times a probe's row is a set being rebuilt somewhere.

**Reading the invariant correctly matters.** When the reader scrolls 300px, the anchor row moves
300px on screen and `scrollOffset` moves _less_, because compensation deliberately moved it back.
Asserting against the offset asserts that compensation did not happen.

## Navigating between stops

Arrow keys step between the stops a host names with `isAnchor` — prompts in a chat, speakers in a
transcript — rather than by line or by message, so the position readout always names the thing the
reader is on.

Two rules make a press move, and both were defects first:

- **The cursor is derived from the scroll, never set alongside it.** It is `range.startIndex`: the
  row the scroll offset falls inside. Setting it separately lets the two disagree — a feed opened at
  its tail is aligned to its _last_ row while its first visible row is several earlier, so the
  presses closing that gap stepped through rows already on screen and scrolled nothing, and
  `getOffsetForIndex` then answered with an offset _below_ the current one, scrolling **down** in
  response to ArrowUp.
- **A step is taken from the row containing the offset**, not by comparing positions. Landing on a
  stop leaves the offset a few pixels into that row once measurement settles, and any tolerance
  small enough to be honest reads that as "not there yet" and re-scrolls those few pixels.

Still open (`chat-ui/TASKS.md`): roughly every other press travels ~2px where it should travel a
row. `baseline/navigation` therefore asserts direction — every press moves towards the top, never
nowhere and never backwards — and deliberately not distance.

## Following the tail

A chat is pinned to its bottom, and that is a different anchor: the end of the document rather than a
row, so anchoring is suspended while the follow owns the scroll. Following is an intent only the
reader can withdraw — neither distance nor direction can tell a reader apart from the machinery, so
the follow is dropped only when a scroll is preceded by an input gesture, and resumed by returning to
the tail. `ScrollFollower` carries velocity across frames so a tail that keeps growing produces one
continuous travel rather than an animation restarted per chunk.

## Opening at the tail

A chat opens showing its last message, and does not then travel. Both halves have been broken, and
`baseline/tail` guards them at six points — plain, uniform and assistant, each with and without
`scrollPastEnd`.

It reads the **last row's own bottom edge** against the viewport's, never the scroll offset. An
offset can be at the document's end while the last message is nowhere near the screen, which is
exactly what both defects looked like:

- The opening jump is computed from estimates, so it lands where the estimate put the tail. Marking
  the feed positioned there left the rest — ten thousand pixels — to the follow, at two rows a
  second. Anything more than a screen behind therefore jumps rather than travels: the follow is for
  content arriving at a tail the reader is watching, not for closing a gap the estimate opened.
- With space reserved past the end, the element's maximum is no longer the last row, so everything
  that opens or follows has to stop short of it: the follow's target, the tail test, the opening
  offset. Chasing the maximum walks the feed off the end of the conversation and keeps going.

## Streaming

An item reconciles by **appending** when the new text extends the old, and replaces the document
otherwise. A real assistant turn does both: a status block appears and is removed, reasoning streams
inside an unclosed tag and is closed on completion, a tool call lands whole and its result follows.
Pending blocks are therefore emitted **unclosed** — a closing tag written before the content is
complete would have to be rewritten on every chunk, and rewriting the document discards decorations
and widget state.

## What the baselines assert

Six of them, each a rung, and each verified by mutation rather than trusted because it is green — a
test written against a moving target is as likely to measure nothing as to measure the wrong thing,
and two here did (`baseline/fill` compared a field that had been deleted; `baseline/streaming`
watched a feed too short to scroll).

| Story                   | Asserts                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `baseline/construction` | Per-editor build cost, by extension set.                                                 |
| `baseline/mount`        | Per-row mount cost, fixtures pre-built, up the ladder.                                   |
| `baseline/fill`         | No mounted row moves while the feed settles.                                             |
| `baseline/tail`         | The last row's bottom meets the viewport's, and holds — with and without reserved space. |
| `baseline/navigation`   | Every arrow press moves, by a whole stop, in the right direction.                        |
| `baseline/streaming`    | While a turn streams, no row moves _down_ except when the document shrinks.              |

The streaming exception is the interesting one: a turn removes blocks as well as adding them — the
status goes when the answer starts — and a feed pinned to its tail keeps the tail pinned by moving
everything down. Measured as thirteen rows moving together by exactly 65px, landing the tail at zero.
Counting it would be counting the feed doing its job.

## Instruments

Both live in `#testing` and exist because the deciding criterion — smoothness — cannot be judged from
code:

- `useFrameMeter` — fps, p50/p95, worst frame, hitch count; click to record a pass to the clipboard
  and console. `sweepScroll` runs a repeatable gesture (3,000px/s for 5s each way) so passes can be
  compared between stories.
- `usePositionLog` — every row's position, viewport-relative, with a count of rows that moved after
  being laid out. Exposed on the scroll element as `$0.__feed` alongside the follow state and the
  measured average.

Neither can be read by an agent: a browser pane that is not displayed does not composite, and
`requestAnimationFrame` is throttled to about 1fps. The honest probe reads the scroll and the rows'
`getBoundingClientRect().top` in the **same** animation frame and compares each row's travel against
the scroll's — anything else measures sampling skew.

## Open

- Chrome sees only its own message and index, so it cannot group consecutive turns from one speaker.
- `HtmlBlock` has no prose styling — an email's `blockquote` and `ul` render flat.
- Item pooling is deliberately not done: the measurements say the editors are not the bottleneck.
