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

### Scroll anchoring

- Pick an **anchor**: the topmost row still visible.
- Remember its layout offset (`item.start`); its distance from `scrollTop` is where it sits on screen.
- After every layout, look the anchor up again and compute `delta = newStart − oldStart`.
- Write `scrollTop += delta`. The anchor lands on the same pixel, and every row below it with it.
- In a **layout effect**, before paint: a correction applied after the frame is drawn is the flicker.
- Ignore the scroll event our own write produces, or it reads as the reader moving.
- Re-pick on a real scroll: the reader's gesture decides what should stay put next.

**Why the topmost _visible_ row and not the topmost _rendered_ row.** Overscan renders rows above the
viewport, and they are exactly the rows being measured for the first time when scrolling up. An
anchor is only useful if its own offset is settled: anchoring to a row that is itself being corrected
compensates by that row's delta and moves the visible content by the difference. The topmost visible
row has been rendered and measured, so corrections above it are precisely what we want to absorb, and
corrections below it move nothing the reader can see. In code that is the first item satisfying
`start + size > scrollTop` — not `items[0]`, which is the first _overscanned_ row.

`shouldAdjustScrollPositionOnItemSizeChange` is the virtualizer's own attempt at this. It fires per
resize against a scroll offset that trails the element's real one; forcing it on made the jumping
worse (8.8% → 11.3% of frames), so anchoring is done here instead, once per layout, against the
offsets that layout actually used.

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
