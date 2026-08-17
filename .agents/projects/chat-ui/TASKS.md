# Chat UI — TASKS

Design: [`plugin-assistant/docs/AUDIT.md`](../../../packages/plugins/plugin-assistant/docs/AUDIT.md)
(the audit is the design doc for this project; there is no separate DESIGN.md).
Branch `claude/ai-chat-interface-restructure-bdc043`. No PR yet.

Related: `chat` (josiah) owns the data model and the plugin-chat rename; this project owns the
rendering layer. Track B and C touch `react-ui-thread`, so coordinate before moving its internals.

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
- [ ] Widget state does not survive virtualization — an expanded panel scrolled out of the window
      remounts collapsed, because the open flag is React state inside the widget. Either the state
      moves into the message, or the item keeps a per-widget map.
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
- [ ] Migrate the AI thread (last — most behaviour rides on the current syncer).
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
