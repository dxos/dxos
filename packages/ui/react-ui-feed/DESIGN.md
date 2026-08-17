# react-ui-feed — design

One engine for every list of messages in the repo: AI chat, email, human chat, comments,
transcription. A feed is a virtualized list where **each message is its own markdown document**, the
chrome around it belongs to the host, and everything that spans messages — selection, search, copy —
is answered from the model rather than the DOM.

The audit that motivates this, the five call sites it has to serve, and the measured verdict live in
[`plugin-assistant/docs/AUDIT.md`](../../plugins/plugin-assistant/docs/AUDIT.md) §3.3–§3.4.

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

**Reading the invariant correctly matters.** When the reader scrolls 300px, the anchor row moves
300px on screen and `scrollOffset` moves _less_, because compensation deliberately moved it back.
Asserting against the offset asserts that compensation did not happen.

## Following the tail

A chat is pinned to its bottom, and that is a different anchor: the end of the document rather than a
row, so anchoring is suspended while the follow owns the scroll. Following is an intent only the
reader can withdraw — neither distance nor direction can tell a reader apart from the machinery, so
the follow is dropped only when a scroll is preceded by an input gesture, and resumed by returning to
the tail. `ScrollFollower` carries velocity across frames so a tail that keeps growing produces one
continuous travel rather than an animation restarted per chunk.

## Streaming

An item reconciles by **appending** when the new text extends the old, and replaces the document
otherwise. A real assistant turn does both: a status block appears and is removed, reasoning streams
inside an unclosed tag and is closed on completion, a tool call lands whole and its result follows.
Pending blocks are therefore emitted **unclosed** — a closing tag written before the content is
complete would have to be rewritten on every chunk, and rewriting the document discards decorations
and widget state.

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

- An expanded widget scrolled out of the window comes back collapsed: the open flag is React state
  inside the widget, which dies with the item.
- Chrome sees only its own message and index, so it cannot group consecutive turns from one speaker.
- `HtmlItem` has no prose styling — an email's `blockquote` and `ul` render flat.
- Item pooling is deliberately not done: the measurements say the editors are not the bottleneck.
