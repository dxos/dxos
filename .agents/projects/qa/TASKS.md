# QA — Tasks

_Resume: PR #12418 open with the HTML sandbox, email dialect and dark-mode policy; fixtures m1–m3 captured and scrubbed. Next: Gap A (recover the sender's dark rules past sanitization), then Phase 4's live-app check. Uncommitted: none._

User-reported defects and small UX corrections found while using Composer, tracked
across whichever package owns the fix. Findings and rationale live in
[DESIGN.md](DESIGN.md); this file is the ledger.

## Phase 1: Inbox message article

- [x] **Drop per-message expand/collapse when a conversation has one message**
      — `useMessageExpansion` withholds `onExpandedChange`/`onCollapseAll`/`onExpandAll`
      when `messageIds.length <= 1`, so the header stops being a click target and the
      thread toolbar drops both fold actions
      ([MessageArticle.tsx](../../../packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx),
      [ConversationStack.tsx](../../../packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx)).
- [x] **Auto-open the conversation's latest message on navigation**
      — expansion is now derived (`latest message` + per-message overrides) rather than
      seeded once at mount, so it follows the thread query as it resolves and resets when
      `subject.threadId` changes. Drafts are skipped when picking "latest" so adding a
      reply draft doesn't fold the message it answers.

## Phase 2: HTML rendering + dark mode — SUPERSEDED

Implemented and moved. The component, its dialect seam and the full design write-up now live in
`packages/ui/react-ui-components/src/components/HtmlViewer/` — see its
[DESIGN.md](../../../packages/ui/react-ui-components/src/components/HtmlViewer/DESIGN.md), which is
the current record for everything below.

- [x] **Capture real email fixtures to analyze against** — done in the MailboxSync
      story rather than the shipping app menu; see Phase 5. Still needs a real account
      connected to actually produce fixtures.
  - ~~Add a per-message `Save message` action (dev tier) in
    `ConversationStack/useToolbar.tsx`~~ — download the `text/html` block (or the
    full `.eml`, which `scripts/mbox.ts` can already parse).
  - Store under `src/testing/data/emails/`, loaded via `import.meta.glob` raw.
  - New `HtmlViewer.fixtures.stories.tsx` rendering every fixture as a light/dark
    pair — the analysis harness, and the regression net afterwards.
- [x] **Detect sender-authored dark mode** — `detectColorScheme` reads the raw html pre-sanitize.
- [x] **Recolor undeclared and light-declared bodies** — the table-layout exemption and `isPersonal`
      are gone; only a sender's dark design that actually survived is exempt.
- [ ] **Gap A: recover the sender's dark rules** — DOMPurify strips `<style>`, so
      `applyAuthoredDarkRules` never fires. Extract the `@media (prefers-color-scheme: dark)` blocks
      pre-sanitize and inject that subset. See DESIGN.md §2.
- [ ] **Improve the recolor inversion curve** — `transform-colors.ts` (`l = min(1 - l, inkL)`) flattens
      the authored contrast ladder onto the ink clamp; wants a curve preserving relative lightness plus
      a chroma clamp.

## Phase 3: Factor out the sandbox — DONE (not as `react-ui-html`)

A separate `react-ui-html` package was created and then dropped; everything lives in
`react-ui-components` instead, per direction.

- [x] **`Html` owns the sandbox** — shadow root, sanitization, remote-image blocking, `src` resolution,
      and the generic `color-scheme` handling.
- [x] **Email policy is a dialect** — `emailDialect()` (a plain function, not a hook) supplies CSS,
      transforms and the resolver; `cid:` resolution moved to plugin-inbox's `useCidResolver`, so the
      shared package no longer depends on ECHO.
- [ ] **Move color primitives to `react-ui-theme`** — sRGB↔OKLCH, CSS color parse, contrast. Still
      in `transform-colors.ts`; the original TODO stands.

## Phase 4: Mailbox "Sync" routine shows no Operation

Adding a mailbox creates a `Sync` Routine (cron `*/10 * * * *`) whose Operation field
renders empty in the routine form. Established so far (DESIGN.md §3): the routine is
created deliberately, not a failed attempt.

- [ ] **Find why the operation picker doesn't resolve the runnable**
  - Verified: `Ref.fromURI(op.meta.key).uri` and the picker option id
    (`Entity.getURI(persisted, { prefer: 'named' })`) are both
    `dxn:org.dxos.plugin.inbox.operation.googleMailSync`, and both sync operations are
    `Operation.visible` — so URI matching and the visibility filter are not the cause.
  - Remaining suspect: whether `Scope.registry()` actually returns the operation at the
    time the form renders (`useOperations`, RoutineForm.tsx:280). Needs a live app or a
    harness check, not static analysis.
- [ ] **Decide whether a system-managed routine should be editable at all**
  - The action is bound by registry key on purpose (nothing persisted into the space);
    an empty _editable_ picker invites the user to break the binding.

## Phase 5: MailboxSync story — fixture capture harness

[MailboxSync.stories.tsx](../../../packages/stories/stories-inbox/src/stories/MailboxSync.stories.tsx)
is the story that drives a real sync (persistent client against edge `main`), so it is
where fixtures get captured. Three defects found while wiring that up.

- [x] **Message panel rendered nothing** — `MessageModule` passed the whole thread
      (an array) as the surface `subject`, but the article's filter is
      `AppSurface.subject(AppSurface.Article, isNonDraftMessage)`, which matches a single
      non-draft Message. Now passes the selected message; `MessageArticle` looks the
      conversation up itself from `threadId` + `companionTo`.
- [x] **The mailbox article was never the attended entity** — `ModuleContainer` makes each
      cell attendable under its _positional_ id (`<role>:<col>:<row>`,
      [ModuleContainer.tsx:237](../../../packages/stories/storybook-testing/src/ModuleContainer.tsx:237))
      while `MailboxModule` advertises the mailbox object path to the article, so nothing
      inside it read as attended. `MailboxModule` now wraps the surface in its own
      `AttendableContainer` keyed on that path (`contents`, so the height chain is unaffected).
  - Do NOT reach for `withAttention()` here: it installs a fresh `RegistryContext`, which
    shadows the plugin manager's atom registry and makes every `useCapability` call throw
    (`No capability found for …atomRegistry`). Attention is already provided by
    `AttentionPlugin()` inside `corePlugins()`.
- [x] **Save a single message as a fixture** — `ArchiveModule` gains a save button for the
      selected message: its raw email HTML as `<date>-<sender>.html` when it has an html
      body, else the serialized message as JSON.
- [x] **Export only starred messages** — the feed download now filters to messages
      carrying the `starred` system tag, so starring in the Mailbox panel is how a
      fixture set is curated. Button shows the count and disables at zero.
- [x] **Starred state no longer scans the feed per render** — `ArchiveModule` read
      `getTagsForMessage` for every message on every render (including every selection
      change). Now uses `TagIndex.taggedIdsAtom`, the tag index's reverse lookup.
- [x] **>1s from clicking a message to it displaying** — RESOLVED by the scan fix above,
      user-confirmed. The whole delay was the per-render feed walk: every selection change
      re-rendered `ArchiveModule`, which called `getTagsForMessage` once per message in the
      feed. The other suspects (`processEmailColors`' per-node `getComputedStyle`, the new
      thread query per selection) were not contributors at this feed size.
- [ ] **`StoryRole.Connector` always reports not connected** — NOT fixed; the empty state
      now prints the mailbox count and every cursor's `spec.target` uri so the next run says
      which half of `isCursorForTarget` fails. Leading hypothesis: two Mailbox objects (the
      story seeds one at identity init; connecting without an `existingTarget` materializes
      another) and every module takes `useQuery(...)[0]`, so panels may disagree on which
      mailbox they mean.
- [ ] **Exercise it against a real account** — connect, star, save. Nothing above is
      verified beyond build + lint; the story needs a live mailbox to render.
- [x] **Starred-only archives are safe to re-import** — import now _appends_ via `importMessages`
      rather than swapping the feed, so restoring a curated (starred) export cannot delete the
      unstarred remainder. `replaceFeed` is kept for Reset, the deliberate way to empty a mailbox.

## Phase 6: Deck defects

- [x] **Opening a message from the mailbox should reuse the message plank** — done in PR #12424:
      `LayoutOperation.Open` takes an optional `name`, and opening under a name already taken replaces
      its occupant in place, the way a browser tab is reused. The mailbox passes `<mailbox>/message`, so
      reading down it no longer grows the deck one plank per message. Backed by `DeckState.plankNames`;
      replaced the old `key` option, which matched on an id prefix (`id.split('+')[0]`). Its one call
      site, the navtree, passed `node.properties.key` — which nothing in the repo ever sets, so it was
      always `undefined` and the branch never ran.
- [ ] **Fullscreen: the back button is obscured by the plank's toolbar** — `ExitFullscreenButton` is
      `fixed top-2 right-2 z-[1]` (`DeckViewport.tsx`), which puts it in the same corner as the plank's
      own trailing toolbar controls and only one stacking level up. Either raise it above the plank
      chrome or move it out of that corner; note the plank is supposed to render `headless` in
      fullscreen, so check why its toolbar is showing there at all.
- [ ] **Decide the fate of the story's fold-animation harness** — `Deck.stories.tsx` injects
      `FOLD_ANIMATION_CSS` scoped by a `data-fold-anim` ancestor to A/B two fold transitions, selected by
      the `foldAnimation` arg (it carries a `TODO(burdon): Why in story?`). `crossfade` is the deck's
      shipped behaviour and adds no CSS at all; `slide` additionally translates the spine 10px along the
      plank's direction of travel. Either promote `slide` into `FoldSpine` and delete the harness, or move
      it behind a `Settings` flag beside `overscroll` — but it should not stay as story-only CSS.
- [ ] **Resizing a plank should leave the trailing spines pinned to the viewport edge** — the right-hand
      pile only holds position because each tile's sticky `insetInlineEnd` is derived from its own width
      (`DeckViewport`'s tile style), and dragging a plank's width changes the natural offsets of every
      tile after it. While the drag is in flight the trailing spines drift instead of staying against the
      right edge. Note `useMaxPlankWidth` caps a plank to exactly the gap the two piles leave it, so the
      end state is correct — this is the during-drag behaviour.

## Phase 7: Deck layout experiments

Shapes being tried behind flags rather than committed to; see `Settings` in plugin-deck.

- [x] **`overscroll`** — trailing runway so the last plank can be brought fully forward.
- [x] **`expand`** — plank toolbar toggle filling the space between the two spine piles.
- [x] **Exposé (`meta+;`)** — every plank at once, shrunk to fit; click one to return focused on it. Not a
      second copy of the deck: the mounted `Mosaic.Stack` is scaled in place (`--deck-expose-scale`), so no
      plank remounts and no editor is instantiated twice. Escape or a background click exits. Four traps,
      all measured rather than guessed:
  - Scaling does **not** shrink scrollable overflow, so the scroll has to be zeroed on the way in and
    restored on the way out (`useExposeScroll`) — otherwise the shrunken row sits off the leading edge.
  - Sticky is dropped for `relative` while exposed; it resolves against the scrollport in the scaled
    coordinate space and would re-pile the tiles the exposé means to lay out flat.
  - The fold is a 200ms crossfade, so refolding the whole deck at once paints the planks over the spines
    replacing them. `data-fold-instant` suppresses the transition for that one frame.
  - `useExposeScroll` must run _before_ `useFoldedPlanks` (hooks run in declaration order), and neither the
    hysteresis nor the collapse may fire across the crossing — every trailing plank reads as off-screen at
    the zeroed scroll, which walks attention onto whatever sits near the start.
  - The transition is FLIP (`useExposeFlip`), not a transition on the stack's own transform. The two
    layouts — sticky/folded/scrolled versus flat/unfolded/scaled — have no CSS interpolation between them,
    so animating the transform alone left the rearrangement to snap on frame one: the deck jumped and
    _then_ grew. Two consequences to preserve:
    - `capture()` runs in the toggle handler, never an effect. By the time an effect runs React has
      committed the new layout and the previous geometry is gone.
    - The scale is written onto the host element imperatively rather than held in React state. As state it
      arrived a commit later, so the FLIP measured the deck at full size and the zoom _in_ stopped
      animating. For the same reason the natural width is summed from tile `offsetWidth` and never
      `stack.scrollWidth`, which counts transformed overflow and mid-FLIP reports a far wider stack.
- [ ] **Drag planks in the exposé to reorder** — the exposé is where the whole deck is visible, so it is
      the natural place to reorder. The plumbing exists (`incrementPlank` in layout.ts, the
      `increment-start`/`increment-end` adjustments) and `PlankControls` still has those buttons
      commented out pending exactly this UX; the exposé tiles would drive it instead.
- [ ] **Plank snapping** — mobile already snaps (`snap-x snap-mandatory` + `snap-start`); desktop wants
      the snap points to be the pile positions (`index * SPINE_PX`) so planks land where the fold
      geometry expects them.

## Open questions for the user

- [ ] **Should `ModuleContainer` support a runtime attendable id for role cells?** — the
      per-module `AttendableContainer` above is a workaround: a role cell's id is fixed at
      story-definition time, but the id that matters (the object path) only exists once the
      object is queried. Every module that scopes attention to an object will need the same
      workaround.

## References

- [DESIGN.md](DESIGN.md) — findings and rationale.
- `packages/ui/react-ui-components/src/components/HtmlViewer/` — the HTML sandbox, email dialect and
  its own DESIGN.md.
- `packages/plugins/plugin-connector/src/util/sync-routine.ts`
- `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx`
