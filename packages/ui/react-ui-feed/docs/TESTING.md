# react-ui-feed — manual testing

What a person has to check, because a machine here cannot. Everything else is covered by 40 unit
tests and 67 story tests across the virtualizer, the model, the aspects and the feed — and those
are mutation-checked: each has been seen to fail when the thing it tests is broken.

Three reasons a check is on this list rather than in a test:

- **Smoothness cannot be measured from an agent's browser.** A pane that is not displayed does not
  composite, and `requestAnimationFrame` is throttled to about 1fps. Every frame-rate number I could
  produce describes the harness.
- **Synthetic pointers are not pointers.** React synthesises enter and leave from `pointerover` /
  `pointerout` pairs, and dispatched events do not reach the handlers.
- **Feel has no assertion.** The glide's speed, whether a step reads as a glide or a lag — those
  are judgements, and two of the checks below exist to collect yours.

Start the storybook, then take the sections in order. **Report by section and step number.**

```bash
moon run react-ui-feed:storybook
```

If a story shows an indexing error or a change appears to have no effect, the dev server's module
graph has gone stale:

```bash
rm -rf .cache/storybook
```

---

## 1. The flagship — the assistant loop

The canonical assistant story now lives in `@dxos/react-ui-assistant`
(`moon run react-ui-assistant:storybook -- -p 9010`):

http://localhost:9010/?path=/story/ui-react-ui-assistant-chatthread--default

This is the rewrite, end to end: `FeedModel` + the aspects + the debug endpoint + the real
registry and chrome, on the shipping path. Everything you asked for is on this one page.

1. Type a prompt and press Enter. Your message lands, and the agent answers in **blocks** — a
   status that disappears, reasoning that closes, a tool call and its result, then the answer
   streaming in. The tail must rest on the bottom the whole way.
2. Press ▶ and let the agent talk to itself for three or four turns. Watch the follow **glide** —
   it travels to a moved tail rather than teleporting (decision taken: glide on by default, 8
   rows/s). **Tell me if the speed reads wrong** — too eager, too laggy. It is one number.
3. Scroll up mid-answer. The follow must stop and stay stopped while the answer keeps growing.
4. Scroll back to the tail. It must re-engage — the next chunk keeps the tail at rest.
5. Turn on `debug` (controls panel). The Debug table appears bottom-right: frames (fps, worst),
   model (count, streaming), window (range, mounted, widgets, jumps). `jumps` must stay 0 while
   you scroll; `fps` near your display's rate while streaming.
6. The left rail is the Outline over **prompts** (the model's stops policy). Hover, click, then
   ArrowUp/Down without moving the mouse — the card follows the keyboard; pointing again takes it
   back. Prev/next in the toolbar step the same stops.

**Report:** whether 1–4 hold, the two feel judgements (2 and the glide generally), and the Debug
numbers from 5 during a fast fling.

## 2. Smoothness — the deciding criterion

http://localhost:9009/?path=/story/ui-react-ui-feed-baseline--varied

The whole spike exists to answer this, and it now runs on the rewritten engine. The stats panel is
bottom right.

1. Click ⏺, fling-scroll bottom → top → bottom twice as fast as the trackpad allows, click ⏺.
2. Read `fps`, `worst`, `hitches`. The last two matter more than the average.
3. Watch the scrollbar thumb: it must not jump backwards as rows measure.
4. **Scrolling up from the tail is the case that matters** — rows arriving above are estimates
   being replaced, and nothing may jump (`bridge/Scrolling` pins this at ≤2px; your eyes are the
   check on the test).

Then `--plain` (no editors — the floor) and `--uniform` for comparison.

**Report:** the numbers, and whether it _felt_ smooth — the judgement is the criterion.

## 3. The virtualizer on its own

http://localhost:9009/?path=/story/ui-react-ui-virtual-window--static

Boxes of known size; anything that moves is the placement. The toolbar drives the **model** now —
append/prepend are told to it, nothing is inferred.

1. `--prepend`: press ↰ while mid-list. **Nothing on screen may move.** This is the property the
   anchor + told-model design exists for.
2. `--grow`: the row's extent changes in the model; rows after it move, rows before it must not.
3. `--sticky`: drive to the end, press append. The tail follows with the glide; away from the end,
   append must not drag you.
4. `--past-end` and the reserve control: the reserve is part of the resting view — "bottom" lands
   at the scroll maximum with the reserved space on screen below the tail.
5. `--inline-content`: the horizontal axis with real editors (in scope for the virtualizer only).
   Scroll it; nothing should judder or jump.

**Report:** any step where something moves that should not have.

## 4. The rails

Flagship page (§1) for the Outline; `react-ui-virtual/window/--static` for the window (the rails pair lives in `components/minimap`).

1. Outline: hover tracks, leaving dismisses, **click then leave dismisses**, click then arrows
   steps the feed one stop per press with the card following.
2. Minimap (right, virtualizer page): solid bar (viewport) stays inside the faint bar (mounted);
   click jumps to that fraction.
3. Both rails are 2rem; a test asserts it.

**Report:** which fail, plus `data-pointer` / `data-navigated` / `data-shown` off the rail's
`[role="navigation"]` element if a card sticks.

## 5. What changed underneath (for review, not testing)

- `MessageList.Root` takes a **`FeedModel`**, not messages: stops, streaming, and paging live on
  it; `useFeedModel(messages)` adapts the array case. tanstack is gone entirely.
- The virtualizer is its own package — `@dxos/react-ui-virtual` — placement + `useWindow`
  - `Window`, told about changes by the model (a prepend is never inferred).
- Aspects, each with tests: `useFollow` (glide on by default), `useFeedNavigation` (the one seam),
  `useDecorations` (search left the list's API — it is one producer of decorations), item
  selection via provider + hook, stops as a model policy.
- The debug mechanism is generic and reusable: `@dxos/react-ui-feed/debug` — `DebugModel` of
  pull-based probes, `useDebugProbes`, and the `Debug` table. Values are pulled per frame by the
  table alone; registration is the only event.
- `Outline` moved here from `react-ui-components` (changeset included); `Minimap` was promoted
  from the debug fixtures.
- Dropped: the email/thread/comments/transcript call-site sims. Kept: the baseline ladder, tail,
  fill, mount, navigation, streaming, widget-state, bridge — all green on the rewrite.

---

## What I most want to know, in order

1. **§1.1–1.4** — does the flagship loop feel right? That page is the product.
2. **§2** — is it smooth? Nothing else matters if not.
3. **§1.2** — the glide's speed. One number (`maxSpeed: 8` in react-ui-virtual’s `useFollow.ts`), easily tuned.
4. **§3.1** — does a prepend really move nothing?
