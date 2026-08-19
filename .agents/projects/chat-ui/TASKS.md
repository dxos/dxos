# Chat UI — TASKS

Design: [`plugin-assistant/docs/AUDIT.md`](../../../packages/plugins/plugin-assistant/docs/AUDIT.md)
(the audit is the design doc for this project; there is no separate DESIGN.md).
Branch `claude/ai-chat-interface-restructure-bdc043`. PR #12627 merged; PR #12648 open.

Related: `chat` (josiah) owns the data model and the plugin-chat rename; this project owns the
rendering layer. Track B and C touch `react-ui-thread`, so coordinate before moving its internals.

## Phase 2 — packages (PR #12648, 2026-08-18)

- [x] `@dxos/react-ui-virtual` — Placement, useWindow/Window, useFollow, ScrollFollower, ListModel
      extracted from react-ui-feed; feed depends on it, `/virtualizer` endpoint removed.
- [x] `@dxos/react-ui-assistant` — ChatThread composite on the feed engine: view-typed renderer,
      ported XML widgets (tool runs as one `<toolkit>` JSON tag), MessageChrome +
      Prompt/AssistantToolbar, ChatThreadController, `/testing` generator, canonical story.
- [x] plugin-assistant rewired: ChatThread dir deleted, MessageSyncer retired, Chat.tsx inlines the
      package thread, SurfaceWidget injected, ChatView moved to the package.
- [x] Defect: useFollow/useFeedNavigation identities stabilized (controller-in-state loop).
- [ ] Update storybook to show tasks (Chat.TaskList in the assistant stories).
- [ ] Long-document list renumbering: a 100-line ordered list renumbers (36. "Line seventy-six")
      after scrolling — CodeMirror renders a slice of the document and the markdown list numbering
      appears to be assigned from the rendered slice, not source positions (ui-editor
      decorateMarkdown). Reproduce with a single message containing a 100-item ordered list.
- [x] Synthetic context renders inside the prompt bubble — FIXED: the chrome renders synthetic
      text blocks as a dimmed collapsible panel above the bubble (react-ui-assistant MessageChrome
      SyntheticContext); the renderer excludes them from the item's document.
- [ ] plugin-mermaid extension (story `plugins/plugin-mermaid/extensions/mermaid--default`):
      center the diagram in `.cm-mermaid` and fix node labels not rendering (the chip session for
      this was deleted before it ran).
- [ ] Live app re-test: thinking view shows reasoning blocks (AiRequest now parses cot/think/
      reasoning tags into reasoning blocks); typewriter cadence feel (MarkdownBlock drip: min 2
      chars/frame, catch-up divisor 30); awaiting user fixtures for the remaining streaming and
      list-renumbering reports.
- [ ] mosaic VirtualStack rebind onto react-ui-virtual (SPEC F-8.2).
- [ ] npm publish of react-ui-virtual / react-ui-feed / react-ui-assistant (changesets post-merge).

## Phase 0 — audit

- [x] `docs/AUDIT.md`: chat component tree, five plugin coupling points, LOC by subtree.
- [x] Move `DESIGN.md` into `plugin-assistant/docs/` and fix its relative links.
- [x] Five thread scenarios enumerated (AI chat, human chat, comments, transcription, email) with
      per-aspect input/thread mechanism tables (§3.0).
- [x] Eight-aspect matrix — virtualization, search, text selection, message selection, streaming,
      mutability, renderers, chrome (§3.0.1).
- [x] Candidate homes for the engine, six packages compared (§4.0).

## Phase 1 — the engine spike (track 0)

Deciding criterion: **scroll smoothness**. If it is not good, track C is dropped.

- [x] `@dxos/react-ui-feed` package (private), storybook wired.
- [x] `feed-model` — renderer, `searchFeed`, `sliceFeed`; 9 unit tests.
- [x] `MarkdownItem` — per-message CodeMirror, delta-reconciled tail, `editable: false`.
- [x] `HtmlItem` — sanitized non-markdown item (the email case).
- [x] `MessageList` — TanStack virtualizer keyed by message id, chrome render-prop,
      message-set selection, search-hit routing.
- [x] Stories: Default (200), Large (2,000), BadEstimate, Streaming.
- [x] Fix: hover chrome must not change row height (absolute + opacity).
- [x] Fix: build each item's `EditorView` in the layout phase, not a passive effect.
- [x] `SelectionGroup` — one selection across many editors.
- [x] Range readout moved to `Panel.Statusbar`.
- [x] Frame meter — `useFrameMeter` (testing) sampling animation frames; the statusbar's right-hand
      readout is `fps · p95 · worst · hitches`, click to record the pass (clipboard + console) and
      start a fresh one. Averages hide the defect, so the percentiles, the worst frame and the count
      over 32ms are reported beside the live rate, and each hitch is traced to the console.
- [x] **Frame-rate measurement** — all three passes taken on a 120Hz Chrome via the extension (a
      pane that is not displayed does not composite, so an agent's own browser reports ~1fps). Table
      in AUDIT.md §3.3. Verdict: cost 1 (N `EditorView`s) is not the bottleneck — p50 is the display
      rate in every pass; cost 2 (measurement) is real but paid as a 950ms stall at mount, not as
      drift while scrolling.
- [x] Kill the mount stall — 950ms → 567ms, 13 hitches → 5, and the remaining cost is the cold load
      (216ms for 100 messages before anything scrolls), not the list. Three changes: tail-anchored
      `initialOffset` so rows are not mounted at both ends; `estimateSize` as the running average of
      measured rows; and an anchored re-base (`resizeItem(0, average)`) so the rebuild reaches the
      rows above the reader. Total height now honest from the first frame (328,796 vs 55,245).
- [ ] Cover the re-base in tests — it is verified by hand in Chrome only. Needs a jsdom harness with
      stubbed heights, or a story that asserts total size against a known row height.
- [ ] Non-sticky anchoring — the re-base restores `currentIndex` for a list that is not following the
      tail, but every story sets `stickyBottom`, so that branch has never run.
- [ ] Scroll to button — an affordance that jumps to the tail (the controller already exposes
      `scrollToBottom`; it needs a control, and a rule for when it shows).
- [ ] Fade transition on a slow jump — a far `scrollToIndex` goes instantly (the offset is an
      estimate beyond a few rows, so an animation travels to the wrong place), which lands the
      reader somewhere new with no sense of having moved. Cross-fade the viewport over the jump
      instead, so the discontinuity is expressed rather than hidden.
- [x] Five call-site approximations — `MessageList/{Assistant,Email,Thread,Comments,Transcript}` from
      `testing/scenarios.tsx`: renderer + chrome + follow per scenario, one engine underneath. Two
      engine gaps found and fixed (per-item React widget portal host; the registry must reach the
      parser via `extendedMarkdown`), one design error fixed (`<prompt>` moved out of the default
      renderer into `chatRenderer`). Aspect table in AUDIT.md §3.4.
- [x] Streaming content — `streamTurn` (testing) emits a turn as the blocks a model actually sends:
      a status that is later removed, reasoning inside an unclosed tag that is closed on completion,
      a tool call, its result, the answer, then suggestions. The Assistant scenario streams it.
- [x] Widget resize must re-measure the document — CodeMirror measures a block widget once, at mount,
      so a portal whose React content grows later (a disclosure opening) left the editor with a stale
      height and the lines below drew **over** the widget. `MarkdownItem` now observes the portal
      roots and calls `view.requestMeasure()`; the row follows through the virtualizer's observer.
      The floor for a portal that paints late is a CSS `min-block-size` on the widget's own content,
      NOT `estimatedHeight` in the registry: that sets `height` + `overflow: hidden` on the widget
      root, which pins the panel shut — it is for blocks whose height is known up front, like images.
- [ ] **Upward-scroll flicker — measured, not fixed.** A per-frame probe (read the scroll and every
      row's `getBoundingClientRect().top` in the same rAF, and compare each row's travel against the
      scroll's) shows the whole window jumping on ~9% of frames, median 67px, worst 91px, every row
      by the same amount. So it is one uncompensated layout correction per first-time measurement,
      not per-row noise. Ruled out: `heightMode: 'min'` on widgets (fixed the pinned panel, reduced
      but did not remove it); a per-message `estimateSize` (deltas 197 → 88); forcing
      `shouldAdjustScrollPositionOnItemSizeChange` true (made it worse: 8.8% → 11.3%). Scroll
      anchoring (`useScrollAnchor`, anchored on the topmost VISIBLE row — an overscanned row above is
      itself being measured and cannot anchor anything) halves it: 8.8% → 5.0% of frames. The
      remainder are full-size (88px) jumps, so they are corrections applied a frame late: the
      measurement lands in a `ResizeObserver`, the virtualizer notifies, React re-renders, and our
      layout effect compensates only on that next render. TRIED AND REVERTED: compensating inside a
      custom `measureElement` made it worse (5.0% → 13.2%), since it double-corrects against the
      virtualizer's own adjustment. Next candidates: suppress TanStack's adjustment while our anchor
      is active, or a directional `rangeExtractor` so rows are measured before they enter from above.
      NOTE the follow suspends anchoring, so a probe must dispatch a gesture first or it measures
      nothing.
      MEASURED FROM A SCREEN RECORDING (the strongest evidence yet, since it is what was painted):
      extract frames with `ffmpeg -vsync 0`, reduce each to a 1px-wide grey column
      (`crop=…,scale=1:H,format=gray`), and cross-correlate consecutive columns for the vertical
      shift. An upward glide read 148/118/110/104/96/90px per frame, then **−92 and −100** (against
      the scroll), then 70/64/60 — two frames of reversal, residual 0.02, so a rigid shift rather
      than a mis-match. Size matches the in-page residual (median 67, worst 91). ALSO TRIED AND
      REVERTED: `shouldAdjustScrollPositionOnItemSizeChange = () => false` (leave compensation to the
      anchor alone) — the feed then opens with a large blank area below the content, because the
      tail positioning depends on that adjustment.
- [ ] **If TanStack is replaced, keep its API.** The swap must be drop-in — same `useVirtualizer`
      options and the same `Virtualizer` surface (`getVirtualItems`, `measureElement`, `scrollToIndex`,
      `measurementsCache`, …) — so our implementation and theirs can be exchanged without touching
      `MessageList`, and so any fix can be offered upstream as a patch rather than stranded here.
      `virtualizer.test.ts` drives the real `Virtualizer` through that surface, so it doubles as the
      conformance test for a replacement.
- [x] **The upward-scroll jump was ours, not TanStack's.** A headless harness driving the real
      `Virtualizer` (`virtualizer.test.ts`, 3 tests) asserts the contract — a row the reader is on
      does not move because another row was measured — and the virtualizer **meets** it: measuring a
      row above, below, or a whole batch while scrolling up all keep the row exactly where the
      gesture put it. Every earlier "reproduction" was a fault in the harness or the assertion:
      a `scrollToFn` that dropped the `adjustments` argument (the compensation itself), a scroll
      element stub too thin to be recognised as an element (3.17 then took the window path), a stub
      window without `requestAnimationFrame` (3.17 reconciles the scroll on a frame), and an
      invariant that asserted against the net change in `scrollOffset` — which compensation moves on
      purpose — rather than against the gesture. So `useScrollAnchor` was correcting a correction,
      which is why forcing compensation on made it worse, turning it off broke tail positioning, and
      anchoring on screen position was worse still. REMOVED; the browser behaviour needs re-measuring
      against the video method, and the jump should be gone.
- [ ] **Flicker is a paint-order problem, not a layout one.** Four headless tests now cover every
      suspected case including measure-empty-then-correct, and the layout holds the reader's row in
      all of them. The remaining cause is that the intermediate state between two measurements is
      painted. Fix applied: rows are measured in a layout effect on a `MessageListRow` component
      instead of the element's ref callback (refs run before any layout effect, so a ref-measured row
      is measured before its item builds anything). NEEDS A VISIBLE TAB TO VERIFY — a backgrounded
      tab does not run the virtualizer's update loop at all, so no browser measurement is possible
      there; `MessageList/{Plain,Uniform}` are the ladder for localizing whatever is left.
- [x] **The slow first fill was the item rebuilding its extension set per row.** `EditorView.theme()`
      mints a new `StyleModule` and generated class on every call, so a set built per item injects a
      stylesheet per row and invalidates the whole document's style each time. `createItemExtensions`
      now caches on `(registry, editable, themeMode)`; only `setWidgets` is per-item. `baseline/mount`:
      `uniform` 628ms → 102ms (14.28 → 2.31 ms/row), `assistant` 591ms → 137ms (53.7 → 12.46).
      Found by bisection, each rung ruling out the last one's explanation. Ruled out along the way:
      the layout (seven headless tests — one pass covers the viewport, the tail settles in ≤3 passes
      in both directions, 22 rows built to show 22); construction cost (0.37ms per editor offscreen,
      so ~8ms for a viewport — the earlier "45ms each" estimate was wrong by 100×); the number of
      frames (`baseline/fill` settles in 1–2, so no cascade); batching the row measurement into one
      parent-level pass (14.6 → 14.2, no effect); an empty highlight dispatch on mount (14.19 → 13.88,
      kept anyway — it is a pointless transaction); and `setView` state in the layout effect
      (13.83 → 13.51, reverted). The rule: **an extension set is built once per configuration, never
      per item**, and `baseline/mount` is what catches a regression — a row costing ten times a
      probe's row is a set being rebuilt somewhere.
- [x] **Arrow navigation scrolled the wrong way, or not at all.** The cursor was set by
      `scrollToIndex` as well as derived from the mounted range, so the two disagreed: a feed opened
      at its tail aligns to its _last_ row while its first visible row is several earlier, and the
      presses closing that gap stepped through rows already on screen — then `getOffsetForIndex`
      answered with an offset _below_ the current one and ArrowUp scrolled **down**. Confirmed in the
      browser at `baseline/plain`: cursor 499 → 498 → 497 with `scrollTop` unmoved at 70751, and
      `getOffsetForIndex(497,'start')` = 70816. The cursor is now `range.startIndex` and nothing else
      writes it; a step is taken from the row containing the offset rather than by comparing
      positions, which is immune to the few pixels of drift left after a landing settles.
      `baseline/navigation` covers it and fails without the fix.
- [x] **The whole page jumped half a second after it settled.** The re-base rebuilds the layout from
      index 0 when the measured average leaves the estimate behind, and it restored the reader in the
      same effect that requested the rebuild — before the document had grown, so the scroll was
      clamped against a height the element did not have yet and the correction arrived frames later
      as a second jump. Measured in `baseline/fill`: `scrollHeight` 12576 → 18218 at 692ms with
      `scrollTop` not corrected until 748ms. The restore now runs in a layout effect keyed on the
      total size, so it happens in the commit that applied the rebuild, before paint — `uniform` is
      one frame with `firstTop` unchanged. Ruled out: restoring by raw `scrollTop` (69–96 of 150
      frames changing afterwards, because the element and the virtualizer's own offset disagree) and
      `scrollToOffset` (same). `baseline/fill` now asserts the invariant that matters — a frame that
      changes the document's height must not change where the rows are.
- [x] **`scrollPastEnd` walked off the end of the conversation.** `ScrollFollower` targeted
      `scrollHeight - clientHeight`, and with space reserved below the last row that is the bottom of
      the _reserved space_ — so a feed opened near the tail then scrolled steadily into the blank
      area below the last message. The follower now takes a `trailing` accessor and stops at the last
      row's bottom. `baseline/fill`'s `UniformPastEnd` covers it: the feed opens at the tail
      (scrollTop 11605 against a tail of 11716 while rows are still measuring, then exactly 17352).
- [x] **A feed opened at the tail the estimate predicted, not the tail it had.** The opening jump is
      computed from estimates, so it landed 60,000px into a document that measures 71,565 — and the
      feed was marked positioned there, leaving the follow to close ten thousand pixels at two rows a
      second (measured as a 1px-per-frame creep that never arrived). The follow is for content
      arriving at a tail the reader is watching; a gap the estimate opened is a correction, so
      anything more than a screen behind now jumps. `baseline/fill`'s `PlainPastEnd` settles in one
      frame at exactly the tail, and this also took `Varied`'s rebuild frame to zero.
- [x] **`baseline/fill` was measuring nothing.** Its movement reading was the viewport-relative top
      of _the first mounted row_ — and a rebuild changes which row that is, so the number said
      nothing about whether anything moved. Worse, the assertion still read a `firstTop` field that a
      later edit had removed, so it compared `undefined !== undefined` and counted zero for every
      story. It now records every mounted row's position **by index** and counts rows that are not
      where they were, which is the reader's invariant: nothing in these stories scrolls the feed, so
      a mounted row that moves is a defect. Under the corrected metric five of six stories are 0.
- [x] **The headless virtualizer tests were testing a version that never ran.** `virtualizer.test.ts`
      imports `@tanstack/virtual-core` directly, which the catalog pinned at `^3.17.7`, while the
      component imports `useVirtualizer` from `@tanstack/react-virtual` pinned at `^3.13.18` — which
      bundles core `3.13.18`. Every conclusion those seven tests reached was about a version
      production does not run. `react-virtual` has no 3.17 line; its latest, `3.14.9`, depends on
      core `3.17.7`, so bumping the pin to `^3.14.9` aligns runtime, types and tests on one version.
      Verified against the other consumers: `react-ui` 29, `react-ui-mosaic` 3 + 18 storybook, all
      passing.
- [ ] **`UniformPastEnd`: eighteen rows move by 111px on the frame the layout is rebuilt.** The only
      remaining movement in `baseline/fill`, on an opt-in flag that is off by default.
      **Diagnosed, and the fix is a redesign rather than a patch.** Logged from inside the restore:
      the element reports a height of 20,852 that settles at 20,412, and the model one of 19,803 that
      settles at 19,576 — at the instant the layout is rebuilt _neither_ has its final size, so any
      tail computed from either is wrong, painted, and corrected. Attempts, all measured and all
      reverted: computing from the model (overshoot 377), from the element (overshoot 227), jumping
      instead of following outside a stream (overshoot 227, worse than the single 111), and
      `scrollToOffset` in place of a raw `scrollTop` write (no change; kept anyway on principle).
      **The only correct approach is to hold the anchor continuously rather than aim at it once**,
      which is `anchorTo: 'end'` — now reachable after the version alignment. Adopting it means
      removing `ScrollFollower`'s tail role, the re-base restore's following branch, and the sticky
      snap on measurement, because two parties anchoring the same end oscillate: enabling it while
      ours remained took `baseline/fill` from 1 failure to 4 and `baseline/tail` from 0 to 4. That is
      the next piece of work, and it is a redesign of the follow subsystem, not a fix to it. The only story
      that moves, and it is the _combination_ — `Uniform` rebuilds and holds still, `PlainPastEnd`
      reserves space but never rebuilds (a per-row estimator skips the re-base). Ruled out: routing
      the reserved-space scroll through `virtualizer.scrollToOffset` instead of writing `scrollTop`
      (no change — kept anyway, since writing the element behind the virtualizer's back is wrong
      regardless). Next: log what the restore computes against where the element actually lands, on
      the rebuild commit, to tell a wrong target from a target applied too late. Pinned at 20. Restoring by index makes the
      virtualizer retry while the offsets around the landing point are estimates. Allowance of 1 is
      pinned in the story so a regression past it fails.
- [x] **Every other arrow press travelled ~2px instead of a row.** The step was smooth, and a smooth
      scroll is a promise the list cannot keep: measurements keep landing while it travels, and each
      one writes `scrollTop` to the offset it has compensated, cancelling the animation wherever it
      had reached. Logged from inside `stepAnchor` on `baseline/plain`: press four targeted 6890 and
      the element came to rest at 7008, two pixels from where it started, so press five recomputed
      from the same row and asked for the same target again — `[224, 2, 119, 2, 63]`. Anchor steps
      are now instant, which a discrete move between two stops should be anyway; the glide belongs to
      the follow. `baseline/navigation` asserts the distance now, not only the direction.
- [ ] **`scrollPastEnd` reverted — it never settles.** Reserving the viewport less the last row so
      the tail can be brought to the top is right in principle and was implemented twice: once from
      the last row's measured size, once from the nominal. Both feed back — the reserved space is
      part of the scroll container's height, so anything it depends on it also changes, and
      `baseline/fill` showed `plain 50` taking 230 frames with 237 of 240 changing something. The
      measured-size version also broke the tail outright: `getOffsetForIndex(last, 'end')` returns
      the element's maximum, which the reserved space had moved past the last row, so a chat opened
      with its last message at the top of an empty screen. Needs the reserved space to be an input
      to the layout rather than an output of it.
- [x] **Widget state now survives virtualization** — the blocker on retrofitting `plugin-assistant`,
      whose tool panels are exactly this. `useWidgetState(key, initial)` reads and writes a map owned
      by `MessageList.Root`, scoped to the message automatically, and degrades to plain `useState`
      outside a feed. Not stored on the message: whether a panel is open is the reader's business and
      not part of what was said. `baseline/widget-state` opens a panel, scrolls until the row is
      **verifiably unmounted**, returns, and asserts it is still open.
- [ ] Reconcile a document that shrinks — `MarkdownItem` appends when the new text extends the old
      and otherwise **replaces the whole document**, which the block turn now triggers twice per
      turn (status removed, reasoning tag closed). A replace discards decorations and widget state;
      measure whether it is visible, and diff rather than replace if it is.
- [ ] Email item needs prose styling — `blockquote` and `ul` render flat in `HtmlItem`.
- [ ] Chrome cannot see its neighbours — human chat groups consecutive turns from one speaker, and
      chrome receives only its own message and index.
- [ ] In-place item mutation — a transcript utterance is rewritten as recognition improves; the
      delta path assumes a growing tail and falls back to replacing the document.
- [ ] Multi-item selection — `selectedIds` + `onSelect` exist, but only as an additive toggle
      driven by the story's checkbox. Needs the list-shaped gestures (click, shift-range,
      cmd-toggle, keyboard) and a decision on whether to adopt `react-ui-list`'s
      `useListSelection` / `useListNavigation` rather than reimplement them.
- [ ] Item pooling / view recycling — deliberately not done, so the unoptimized number is
      measured first.
- [ ] Wire the `custom` item kind (typed, currently returns `null`).
- [ ] Confirm `EditorView.editable.of(false)` lets native selection span items in Chrome AND
      Firefox (verified in the in-app browser only).
- [ ] Decide what the clipboard carries: native copy yields rendered text, the model interceptor
      yields markdown source. Two paths producing different content is a defect waiting to happen.
- [ ] Record the findings back into AUDIT.md §3.3.

## Tracked follow-ups

- [ ] (2026-08-18) **Pin block (chapter)** — pin a block/message as a chapter marker in the feed
      (outline/navigation integration TBD).
- [ ] (2026-08-18) **Make the feed UI closer to Claude** — widget styling, spacing, chrome
      (avatar/timestamp treatment), etc. Reference: claude.ai's chat rendering; applies to the
      Block widgets (reasoning/toolCall panels), Column gutters, and the assistant Chrome in
      `react-ui-feed`.
- [ ] New project idea (2026-08-18): **structured message hub with AI — open-weight models on
      Cloudflare.** Parked here from the rewrite session; not part of chat-ui's scope. Candidate
      for `/dxos:project new` when picked up.

## Rewrite plan (2026-08-17, approved; user offline until morning)

Decisions: MessageList name kept; @effect/atom with plain-subscribe fallback; PR at the end;
call-site sim stories dropped; flagship story = plugin-assistant simulation (typed prompts,
streamed multi-block answers, follow) — first thing reviewed.

- [x] **A. Virtualizer entry point** — move placement + Window/useWindow + tests + stories to
      `src/virtualizer/`, export `@dxos/react-ui-feed/virtualizer`; inline-axis acceptance story
      with real content (axis in scope for virtualizer only).
- [x] **B. Model** — `ListModel` (@effect/atom; fallback plain subscribe) + `fromMessages` +
      `FeedModel` (stops, streamingId, loadBefore/After); virtualizer consumes the model — a
      prepend is told, never inferred.
- [x] **C. Aspects** (each own tests) — useFollow (glide default on, ScrollFollower wired),
      useFeedNavigation (one seam: toolbar/arrows/rails), useStops (model policy; isAnchor sugar),
      useDecorations (hits leave the API; search = one producer), useItemSelection (over
      react-ui-list useListSelection).
- [x] **D. Recomposition** — MessageList.Root = model + aspects; Outline moves here from
      react-ui-components (plugin-assistant Chat.tsx import updated); Minimap promoted from
      testing/debug.
- [x] **E. Debug** — generic DebugModel + useDebug + Debug table at `./debug` endpoint; fold
      frame-meter/stats; pluggable probes per aspect (placement, follow, jumps).
- [x] **F. Stories** — drop email/thread/comments/transcript sims; flagship `Assistant` story
      (prompt entry, multi-block streaming, follow) with play test; baseline ladder stays green
      throughout.
- [ ] **G. Finish** — full build/lint/test, rewrite TESTING.md, update SPEC, submit PR (changeset
      for react-ui-components Outline removal if it is published), CI green, preview URL.

## Placement engine — open defects

Reported from a manual pass on 2026-08-17, against `TESTING.md`.

- [x] **`bridge/Tail` renders nothing** — two defects, neither in the tail arithmetic. `Window` held
      the `getId` closure it was constructed with, so an appended row's measurement was filed under
      one id and read back under another; the row disagreed with itself every commit and React ended
      it by exceeding the update limit. And the follow was re-derived from proximity, which its own
      corrections disengage. Fixed by `Placement.setGetId` + `endOffset` + a `following` intent.
- [x] **Outline card does not move on ArrowUp/Down** (§3.4) — the pointer rests on the tick the
      reader clicked, and "the pointer always wins" pinned the card there. The keyboard now holds it
      while it is being used; `data-shown` publishes which won.
- [x] **Stepping snapped rather than glided** (§4.2) — the old engine had to make it instant because
      measurement wrote `scrollTop`; here corrections move the window, so a glide survives. Only over
      mounted rows.
- [ ] **The feed opens at the document's end, not the content's** (§1) — old engine, and not fixable
      there: the reserve is a DOM spacer, so it is in the element's `scrollHeight` and not in the
      virtualizer's total, and an offset inside it is beyond the virtualizer's own maximum, where
      `scrollToOffset` silently declines to move (verified — the element stayed exactly where it
      was). `baseline/tail` stops at what that engine can do; `bridge/VariedPastEnd` states the whole
      requirement against the replacement. **Closed by the swap.**
- [ ] **Jumps as soon as it starts to scroll** (§2) — old engine, the re-base. `bridge/Scrolling`
      pins the invariant on the replacement: the row under the top of the viewport moves by exactly
      what was scrolled. Scrolls _up_ from the tail, which is the only direction that discriminates.
      Mutation-checked at 8–16px per step under a prefix sum. **Closed by the swap.**

- [x] **`Window` could not tell an append from a prepend.** It compared the first row's id to the
      anchor's, which says "prepended" for every append made while the reader is anywhere but the
      top — shifting the anchor and moving the feed under them. It now finds where the previous first
      row has moved to, which is the number prepended by definition. Found by a sticky test that
      passed with no sticky implementation at all, because the wrong shift happened to land the tail
      where the test looked for it.
- [x] **Sticky tail.** At the end, appending keeps you at the end; away from it, appending does not
      move you. `placement/Sticky` asserts both, and mutation-checked: disabling it fails.

Found while building the replacement placement layer (`DESIGN.md` §Principles). None block stage 3.

- [x] **`Window` held the extents it was given at construction.** `extents` is a function the host
      may replace — a row edited, a panel opened, a story flipping a fixture — and `Placement` kept
      the first one for ever, so the layout stayed true to whatever was the case at mount. It is now
      told on every render. This was `placement/Prepend`'s failure, and mutation-checked: removing
      the call fails that story.
- [x] **`placement/Grow` was asking about a row that was never there.** It scrolled to a fixed offset
      and named row 30, but the extent function averages 145px, so that offset mounts rows 6–29 — and
      the story read "the grow did nothing". It now grows a row near the top and asserts the row is
      mounted before touching it. The code was right; the story's assumption was not.
- [x] **The end is reachable, in more than one move.** `bridge/Uniform` and `bridge/Assistant` sent
      the scroll to the end once and landed short — measuring the rows a scroll reveals grows the
      document under it, so the end was not yet as far away as it turned out to be. Driving it until
      it settles is what a reader dragging a scrollbar does, and the property that matters is that
      the end is reachable and that it stops moving. Mutation-checked: disabling measurement fails
      both.
- [x] **The outline's card would not dismiss when the pointer left.** Two causes, both found with a
      real pointer after synthetic ones proved useless. The shown tick was wrapped in
      `Popover.Anchor`, which changes the element type at that position — so React unmounted and
      remounted that button, and a destroyed element never receives `pointerleave`. A separate
      zero-height anchor moved to the tick's offset keeps every tick stable, and the popover is keyed
      to the marker so it still re-measures. And after a _click_ the opened popover's focus guards sit
      over the page, so the tick never sees the pointer go at all: a document-level `pointerover`
      backstop, live only while a card is up, clears it wherever the pointer lands. Verified in the
      browser — hovering away clears it, and dispatching a document `pointerover` clears it after a
      click. The rail publishes `data-pointer` / `data-navigated` so this is inspectable rather than
      inferred.
- [x] **A click left a position asserted behind it.** Clicking a tick focuses it, and the card was
      gated on focus, so the reader clicked, moved away, and a keyboard position they never asked for
      kept it up. The gate is now "the keyboard has navigated", which a click is not. Covered by
      `Outline/Dismissal`.
- [ ] **Outline arrow stepping is unconfirmed.** It calls the host's `onNavigate` and the index does
      change (`placement/Chrome` asserts it), but nobody has watched it end to end.
- [ ] **The popover anchoring fix is unverified.** Anchoring to the hovered row and keying the
      content is principled, but the probe that "showed" the old drift was faulty — React synthesises
      `pointerenter` from `pointerover`/`pointerout` pairs, so dispatching enter alone never moved the
      hover and the measurement was of one stationary card. Needs a real pointer.

## Phase 2 — the mock-processor loop (track A)

Independent of phase 1's outcome.

- [ ] `ChatProcessor` port in plugin-assistant + `AiChatProcessor implements ChatProcessor` +
      `MockChatProcessor` in `#testing`. Prove it by rewriting `Chat/Error.stories.tsx`.
- [ ] Extract the prompt's actions slot — `ChatOptions` / `ChatReferences` / `ChatActions` move to
      a prop. This is what keeps `AiContext` out of the lower package.
- [ ] Move `ChatThread` + `sync/` + `registry.tsx` + widgets (minus `SurfaceWidget`) with
      `createComponentRegistry({ extensions })`.
- [ ] Move `Chat` + `ChatPrompt` + `TaskList` onto the port and the slot.
- [ ] Repoint consumers (plugin containers, `stories-assistant`). No compatibility re-exports.

## Phase 3 — composer unification (track B)

Independent of everything else; three consumers, no AI involvement.

- [ ] Re-base `Message.Textbox` (react-ui-thread) and plugin-inbox's `Editor` on `ChatEditor`.
- [ ] Move `command` (slash/mention) alongside `commands` (sentinel) as peer extension packs.

## Phase 4 — engine adoption (track C, gated on phase 1)

- [ ] Migrate email (`ConversationStack`) — gains virtualization it lacks today.
- [ ] Migrate human chat + comments (`react-ui-thread` keeps its chrome).
- [ ] Migrate transcription.
- [ ] Migrate the AI thread (last — most behaviour rides on the current syncer). Plan and seam map
      in [`DESIGN.md`](DESIGN.md); blocked on widget state surviving virtualization.
- [ ] Retire `MessageSyncer`, the second tile stack, `TranscriptModel`'s document half.

## Then

- [ ] Thread-tree UI in the feed package: lineage/soft-fork within one feed
      (`Feed.history` already supports it), then the multi-feed case.

## Open questions

Numbered list in AUDIT.md §5. The ones that block work rather than inform it:

- [ ] Engine home — new `@dxos/react-ui-feed` (current), or fold into `react-ui-markdown`?
- [ ] Which selection symptom was observed (stale drawn selections vs native spanning)? The
      read-only config paints no `.cm-selectionBackground`, so it was not reproducible.
- [ ] Tree-of-threads scope — single feed settled enough to build, or does multi-feed need a
      design pass first? It changes the component's input from a chat to a set of feeds, so it
      should land before phase 2 fixes the composite's props.
