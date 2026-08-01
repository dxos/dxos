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

## Phases 6-7: Deck — MOVED

The deck work outgrew this ledger and is now its own project. Defects, layout experiments and the
design record live in [`packages/plugins/plugin-deck/TASKS.md`](../../../packages/plugins/plugin-deck/TASKS.md)
and its [DESIGN.md](../../../packages/plugins/plugin-deck/DESIGN.md).

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
