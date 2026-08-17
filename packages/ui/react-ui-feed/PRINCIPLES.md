# react-ui-feed — principles

What the list is allowed to assume, and what follows from it. [`DESIGN.md`](./DESIGN.md) describes
what exists today; this describes what it should be built on, and the plan that follows.

Every claim here is either an invariant a test asserts or a measurement taken in a real browser. The
numbers are from `baseline/*` and are quoted so a future change can be checked against them rather
than argued with.

## The principles

### 1. Build up from sub-modules, and accept only at the composed level

A list has too many corner cases to be got right in one piece, so it is built from parts that can
each be tested — and the bisection ladder (`uniform-text` → `-bare` → `-themed` → `-markdown` →
`-decorated` → `-item`) is what located a 6× cost that inspection would not have.

**But isolation lies.** The same editor measured 0.37ms built into an offscreen container and 14ms
built into a real row. A sub-module's number is evidence about the sub-module, never about the
system; the acceptance test is always at the composed level.

### 2. The renderer owns the box; the host owns everything inside it

Container, viewport, rows. What a row _means_ — a prompt, a stop the arrow keys land on, a speaker
change — belongs to layers above. Five call sites (chat, email, human chat, comments, transcription)
differ only in a renderer and a chrome, which is the evidence that the seam is in the right place.

**Therefore the host owns the estimate.** Chrome is the host's, chrome has height, and a height the
renderer cannot see is a height it cannot estimate. Got wrong three times: a 1px separator left out
of the plain estimate, `uniform` declaring 84px against a real 24px, and the assistant's per-message
estimator.

### 3. Rows are placed relative to an anchor, not from the start of the list

An absolute offset computed by summing every row before it makes the total a fiction that changes
whenever anything measures. Every defect this package has not been able to close descends from that
one fact: the layout has to be rebuilt from index 0 when the average drifts (`resizeItem(0, …)`),
the rebuild moves every offset, and a tail computed at that instant is wrong in both directions —
measured with the element reporting 20,852 settling to 20,412 while the model reported 19,803
settling to 19,576.

Anchor-relative placement does not remove estimation. It **moves it from row placement to scrollbar
geometry**, which is the trade worth making: a placement error is a row jumping under the reader, a
scrollbar error is a thumb that is slightly the wrong size.

### 4. The anchor is a message, never an index

An index is invalidated by anything that prepends, truncates or reorders — a rewind, a filter, a
space switch. The anchor must survive all of those, so it is identified by message id, and its
offset is the one position in the list that is known exactly.

This is the invariant that makes principle 3 work at all, and it is testable on its own: **the anchor
is always mounted.**

### 5. Only rows near the anchor need accurate heights

Rows far from the anchor need a height good enough for the scrollbar and nothing more, because
nothing is placed relative to them. "Near" means near _the anchor_, not near the viewport — during a
scroll the two diverge, and that divergence is where corrections land.

The corollary is the point: **there is no re-base.** The machinery that periodically rebuilds the
layout from index 0 exists only to fix a total that principle 3 stops depending on, and it is the
direct cause of the whole-page jump at ~700ms and of eighteen rows moving 111px on a rebuild.

### 6. A row's height is a subscription, not a measurement

A CodeMirror row cannot be measured before it renders — and it cannot be measured _once_, either.
Its height changes after first paint when a font loads, when portaled widget content arrives a frame
later, when an image decodes. Anything that treats measurement as a one-time event is wrong about
CodeMirror specifically.

This is why a block widget needs a reserved floor (`heightMode: 'min'`) rather than a fixed height:
a fixed height pins the box and clips a disclosure open.

### 7. Rows are moved, never rebuilt

Repositioning a row must not destroy what is inside it. A CodeMirror view removed from the DOM loses
its measurement state, needs `requestMeasure()` on re-attach, and can drop focus and selection.

**Portals are not the mechanism for this.** A portal's node lives wherever its host element is, so
moving it is the same DOM move; what a portal preserves is React tree identity — state and context
survive, which is how widget state now survives virtualization. Moving a row without rebuilding it
is: transform-based placement, stable keys, and a pool.

### 8. Measure out of view, in context

Measuring a row before it is revealed is what stops the reader seeing it settle. The hazard to
respect is that an element measured in a different containing block, width or style context measures
a different element — off-screen must mean _out of view_, not _out of context_.

`content-visibility: auto` with `contain-intrinsic-size` is the alternative worth weighing: it defers
rendering while the row stays in flow, which makes the context question disappear.

### 9. An invariant that cannot be observed from the DOM is not an invariant

Two tests in this package passed while measuring nothing: one compared a field a later edit had
deleted (`undefined !== undefined`), the other streamed into a feed too short to scroll. Both were
green for weeks of work and cited as evidence.

So: every invariant is a property readable from the DOM, and every test carries a known mutation that
breaks it. A test is not trusted because it is green; it is trusted because it has been seen to fail.

## What follows

### What dies

| Today                                      | Why it exists                                      | After                                  |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------------- |
| `resizeItem(0, average)` + the rebase gate | The total is a prefix sum and drifts               | gone (§5)                              |
| The rebase restore + `pendingRebase`       | Repairs the damage the rebase does                 | gone                                   |
| `initialOffset: count * nominalSize`       | Guesses where the tail is before anything measured | gone (§4)                              |
| `trailing` / `scrollPastEnd` special cases | The element's maximum stops meaning the last row   | falls out of anchor-relative placement |
| `ScrollFollower`'s tail-chasing            | Two parties anchoring one end                      | one anchor, held continuously          |

### The order

1. **Anchor as a message id, with the invariant test first.** `baseline/anchor`: the anchor is
   mounted, and survives a prepend, a truncate and a filter. This is testable against the _current_
   engine and is worth having either way.
2. **A headless placement module**, no DOM: given an anchor, its offset, a measurement store and a
   viewport height, produce the mounted window and each row's position. Pure, so it is unit-tested
   like `virtualizer.test.ts` — but this time against the code that actually runs (that test imported
   a version production never used, so its seven conclusions were about something else).
3. **Swap the placement behind `MessageList.Viewport`.** The baselines are the acceptance suite and
   do not change: fill, tail, navigation, streaming, widget-state, mount, construction. A regression
   shows up as a specific number moving.
4. **Delete the rebase and the trailing special cases** once the baselines hold without them.
5. **Pooling and `content-visibility`** last, as optimizations with `baseline/mount` as the judge —
   not before, because the current numbers say construction is not the bottleneck.

### What this is not

Not a rewrite of the whole package. `MessageList.Root`'s API, the chrome seam, the renderers, the
selection group, the widget-state store and the six baselines all survive; the change is confined to
how a row's position is computed. If step 2's module cannot make the baselines pass, the swap is
one file to revert.

### The evidence that this is the right direction

A half-measure was tried and measured: adopting the virtualizer's own end-anchoring (`anchorTo:
'end'`) while keeping the existing follow took `baseline/fill` from 1 failure to 4 and `baseline/tail`
from 0 to 4, because two parties were anchoring the same end. That is not an argument against
anchor-relative placement — it is an argument that there must be exactly one anchor, owned in one
place, which is what §3 and §5 say.
