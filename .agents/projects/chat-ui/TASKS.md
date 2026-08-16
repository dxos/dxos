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
      readout is `fps · worst · hitches`, click to reset. Averages hide the defect, so the worst
      frame and the count over 32ms are reported beside the rate.
- [ ] **Frame-rate measurement by a human** — rAF is throttled in the headless pane (it reports
      ~13fps there, and 89s "worst" for a backgrounded tab), so the readout has to be read at the
      keyboard. Three passes, scripted as numbered `Test:` blocks on the stories: Large
      (fling-scroll, watch drift), BadEstimate (`estimateSize: 24`), Streaming (tail growth).
      Record the numbers in AUDIT.md §3.3 — they are the phase-1 verdict.
- [ ] Scroll to button — an affordance that jumps to the tail (the controller already exposes
      `scrollToBottom`; it needs a control, and a rule for when it shows).
- [ ] Streaming content — the Streaming story only extends a text block by whole tokens. Real
      streaming arrives as `ContentBlock`s (reasoning, toolCall, status) appearing and completing
      mid-message, so the item's delta reconciliation is only exercised on the easy case.
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
