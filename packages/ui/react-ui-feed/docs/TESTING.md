# react-ui-feed — manual testing

What a person has to check, because a machine here cannot. Everything else is covered by
`placement.test.ts`, `placement/*`, `bridge/*` and `baseline/*` — 46 unit tests and 55 story tests,
all green, and mutation-checked: each has been seen to fail when the thing it tests is broken.

Three reasons a check is on this list rather than in a test:

- **Smoothness cannot be measured from an agent's browser.** A pane that is not displayed does not
  composite, and `requestAnimationFrame` is throttled to about 1fps. Every frame-rate number I could
  produce describes the harness.
- **Synthetic pointers are not pointers.** React synthesises enter and leave from `pointerover` /
  `pointerout` pairs, and dispatched events do not reach the handlers. Three attempts at driving a
  hover this way reported the same result whether the component was right or wrong.
- **"Does this look wrong" has no assertion.** Some of what follows is a judgement.

Start the storybook, then take the sections in order. **Report by section and step number** —
"3.2 fails, it jumps about a row" is enough.

```bash
moon run storybook-react:serve
```

If a story shows an error about indexing, or a change of mine appears to have no effect, the dev
server's module graph has gone stale — this happened repeatedly while the work was being done:

```bash
rm -rf .cache/storybook
```

---

## 1. Smoothness — the deciding criterion

http://localhost:9009/?path=/story/ui-react-ui-feed-baseline--varied

The whole spike exists to answer this. The readouts are in the floating stats panel, bottom right.

1. Click the record button (⏺) in the stats panel to start a pass.
2. Fling-scroll from the bottom to the top and back, twice, as fast as the trackpad allows.
3. Click ⏺ again to end the pass. The summary goes to the clipboard and the console.
4. Read `fps` while scrolling — it should hold near your display's rate.
5. Read `worst` and `hitches` after it settles. **These matter more than the average**: one 200ms
   stall reads as smooth in a mean and as broken to a person.
6. Watch the scrollbar thumb during the fling: it must not jump backwards as rows measure.

**Report:** the four numbers, and whether it _felt_ smooth — that judgement is the actual criterion,
and the numbers are only evidence for it.

Then the same on `--uniform` and `--plain` for comparison: `plain` has no editors at all, so it is
the floor. If `plain` is smooth and `varied` is not, the cost is in the item.

## 2. Streaming — where everything runs at once

http://localhost:9009/?path=/story/ui-react-ui-feed-messagelist--streaming

The follow changed with the swap, and this is where it shows. It is now an intent withdrawn by one
thing only — a scroll that moves **backwards**. Measuring the tail grows the document under a reader
who has not moved, and the old rule (are we near the end?) read that as the reader leaving.

1. Press play (▶) in the toolbar and let three or four turns arrive.
2. Read `fps` while the tail grows.
3. Scroll away mid-answer. **The follow must stop and stay stopped.**
4. Scroll back to the tail. It must resume following without a jump.
5. Watch a turn's status block disappear as the answer starts: everything shifts down by one block's
   height. That is correct — the document shrank and the tail is pinned — but tell me if it reads as
   a glitch rather than as the feed working.
6. **The follow no longer glides.** It corrects instantly instead of travelling. `ScrollFollower` and
   its tests are untouched and can be wired back — tell me whether the instant version reads as
   abrupt, because that is the only thing that decides it.

**Report:** whether 3 and 4 hold, how 5 reads, and your verdict on 6.

## 3. The outline rail — the parts I could not verify

http://localhost:9009/?path=/story/ui-react-ui-feed-placement--static

The rail is on the left. Its state is published as `data-pointer` and `data-navigated` on the
`[role="navigation"]` element, so if something is stuck you can see which of the two is holding it.

1. Hover a tick. A card appears, centred on that tick. Move slowly down several ticks — **the card
   must track the tick under the pointer**, not lag behind or drift.
2. Move the pointer off the rail entirely. **The card must disappear.**
3. **Click** a tick, then move the pointer off the rail. **The card must disappear.** I could only
   confirm this by dispatching an event, never by moving a mouse — it is the single most likely thing
   on this page to still be wrong.
4. Click a tick, then press ArrowUp / ArrowDown **without moving the mouse**. The feed should step
   **one message per press**, and the card should follow to the tick nearest where you now are.
   (Fixed since the last pass: the pointer resting on the clicked tick used to win over the keyboard
   and pin the card there. `data-shown` now publishes which of the two is being obeyed.)
5. Press the arrows several times in a row, quickly. Every press should move the feed by about a row;
   none should do nothing.
6. Then move the pointer back onto a different tick. The card should follow the pointer again.

**Report:** which of 1–6 fail, and for 2/3 the values of `data-pointer` / `data-navigated` /
`data-shown` when the card is stuck (devtools, or `$0.dataset` with the rail selected).

## 4. Placement — the engine on its own, by hand

http://localhost:9009/?path=/story/ui-react-ui-feed-placement--static

Plain boxes of known size, so anything that moves is the placement itself. The toolbar has
prev / next / top / bottom, and `debug` / `scrollPastEnd` are controls.

1. Scroll up and down at several speeds. Rows must not shudder, and none may move _against_ the
   scroll. **Scrolling up from the tail is the case that matters** — that is where rows arriving
   above are estimates being replaced.
2. Press prev / next. The step should **glide**, not snap. (New: the old engine had to make this
   instant, because measurement wrote the scroll and cancelled the animation. Here corrections move
   the window instead, so nothing interrupts it. A step to somewhere not currently mounted is still
   instant, deliberately — a glide across rows that do not exist is a journey over a blank screen.)
   The same glide is now on the arrow keys in the real feed, sections 1 and 2.
3. Click **top**. The first row must sit exactly at the top, with nothing above it.
4. Click **bottom**. The last row must rest on the bottom of the viewport — not at the top of an
   empty screen, and not below the fold.
5. Turn on `scrollPastEnd` and click **bottom** again. Same as 4 — the reserved space is somewhere you
   _may_ scroll, not somewhere the feed sends you.
6. With `scrollPastEnd` still on, scroll past the last row. You should be able to bring it to the top
   of the viewport, and no further.
7. Turn on `debug`: every row is outlined and labelled with its extent. Check a few against the
   right-hand minimap's proportions.
8. `--prepend`: click the prepend button (↰). **Nothing already on screen may move.** This is the
   property the whole anchor-relative design exists for.
9. `--grow`: click the grow button. The rows _after_ the changed one move down; the rows _before_ it
   must not move at all.
10. `--horizontal`: the same list running left-to-right. Scroll it. This axis has never been used in
    anger — I want to know if it is obviously wrong.

**Report:** any step where something moves that should not have.

## 5. The two rails

Same page as section 4.

1. The left rail (`Outline`) is index space — one tick per marker, brighter where you are.
2. The right rail (`Minimap`) is content space — a faint bar for the mounted rows, a solid one for the
   viewport, on a track that is the whole document.
3. Scroll and watch both. **The solid bar must stay inside the faint one**: the viewport showing rows
   that are not mounted would mean the reader is looking at nothing.
4. Click anywhere on the right rail. The feed jumps to roughly that fraction of the list.
5. Both rails should be the same width (2rem). A test asserts this now, because they were 16px and
   32px for a while and each looked deliberate on its own.

**Report:** whether 3 ever fails, and at what kind of scroll speed.

## 6. The two defects from the last pass

Both were reported against `baseline/*`, and neither was fixable where it was found — each was one
document described by two coordinate systems. `MessageList` is placed by the anchor now, so these
are checks on the shipping path rather than on a spike.

**The feed opening in the wrong place** — `baseline--varied` with `scrollPastEnd` on (its default):

1. Open it. The **last message rests on the bottom of the screen**. It used to sit near the top of an
   otherwise empty one. The cause was a single seed offset that could not be reached: the virtualizer
   opened at the content's end with no viewport subtracted, past the element's own maximum, so the
   element clamped and the virtualizer did not — and every measurement afterwards re-wrote the
   element back to its maximum.
2. Scroll down past the last message. The reserved space is still there, and the last message can be
   brought to the top of the viewport and no further.

**Jumping as soon as it scrolls** — same story:

3. Scroll **up** from the tail, slowly, then quickly. Nothing should jump. Up is the direction that
   matters: going down, every row above you has already been measured. There is no re-base any more,
   which is what used to move every offset in the list at once.
4. `baseline--uniform` with `scrollPastEnd` on, and watch the first second. Eighteen rows used to
   travel on the frame the layout was rebuilt. It measures zero now.

**And the same shapes on the engine alone**, if 1–4 disagree with the tests —
`bridge--varied-past-end`, `bridge--scrolling`, `bridge--tail`: same fixtures, no chrome, so a
failure there says the placement and a failure only above says the wiring.

**Report:** anything that jumps, and whether 1 and 3 hold.

---

## What I most want to know, in order

1. **Section 1** — is it smooth? Nothing else matters if it is not, and it is the one thing no test
   here can answer.
2. **Section 6.1 and 6.3** — are the two defects you reported actually gone in front of you? The
   tests say so; you are the check on the tests.
3. **Section 2.6** — does the instant follow read as abrupt? That decides whether the glide comes
   back.
4. **Section 4.8** — does a prepend really move nothing?
5. Everything else.

Everything on this page now runs on the same engine. `baseline/*` is the real feed, `placement/*` is
that engine with boxes instead of editors, and `bridge/*` is the pair meeting — so where a check
fails tells you which of the two is at fault.
