# QA — Tasks

_Resume: fixture capture is wired in the MailboxSync story (Phase 5) but NOT yet exercised against a real account — connect one, star some mail, save the HTML. Uncommitted: none. Last: stories-inbox message panel + attention fixes._

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

## Phase 2: HtmlViewer dark mode

Email bodies render in a shadow root and are recolored only for personal/non-table
mail. Two gaps, both detailed in DESIGN.md §1.

- [x] **Capture real email fixtures to analyze against** — done in the MailboxSync
      story rather than the shipping app menu; see Phase 5. Still needs a real account
      connected to actually produce fixtures.
  - ~~Add a per-message `Save message` action (dev tier) in
    `ConversationStack/useToolbar.tsx`~~ — download the `text/html` block (or the
    full `.eml`, which `scripts/mbox.ts` can already parse).
  - Store under `src/testing/data/emails/`, loaded via `import.meta.glob` raw.
  - New `HtmlViewer.fixtures.stories.tsx` rendering every fixture as a light/dark
    pair — the analysis harness, and the regression net afterwards.
- [ ] **Detect sender-authored dark mode**
  - Scan the _raw_ html pre-sanitize for `prefers-color-scheme: dark` and
    `<meta name="(supported-)?color-scheme">`; `<meta>` is stripped by DOMPurify
    (`FORBID_TAGS`), so the signal must be read before sanitization.
- [ ] **Honour the app theme instead of the OS for dark-capable email**
  - `<style>` survives sanitization, so an email's own dark rules fire off the OS
    preference — unfixable via `color-scheme`. Rewrite the CSSOM instead: hoist the
    dark block's rules when `themeMode === 'dark'`, delete them when light.
- [ ] **Give un-themed (marketing/table) email an explicit paper sheet in dark mode**
  - Today those bodies keep authored dark text while unpainted regions show the dark
    app surface. Render on `background:#fff; color:#111; color-scheme:light`. Never
    `filter: invert()`.
- [ ] **Improve the personal-mail inversion curve**
  - `transform-colors.ts:69` (`l = min(1 - l, inkL)`) flattens the authored contrast
    ladder onto the ink clamp; replace with a curve preserving relative lightness plus
    a chroma clamp.

## Phase 3: Factor out `react-ui-html`

Decision recorded in DESIGN.md §2 — factor in three layers, keep the email policy in
plugin-inbox. Supersedes the inline TODOs at `HtmlViewer.tsx:19` and
`transform-colors.ts:14`.

- [ ] **Move color primitives to `react-ui-theme`** — sRGB↔OKLCH, CSS color parse,
      contrast. No email content in any of it.
- [ ] **New `react-ui-html`** — shadow-root host + DOMPurify + remote-image blocking +
      theme adoption + async `src` resolution, exposed as
      `<Html html transforms={…} resolveSrc={…} />`.
- [ ] **Keep email policy in plugin-inbox** — quoted-reply collapse, `cid:` attachment
      resolution, the `isPersonal`/table heuristic, the Gmail/Proton/Yahoo selectors.

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
- [ ] **>1s from clicking a message to it displaying** — the scan above was one cause but
      probably not all of it. Unmeasured candidates, in order of suspicion:
  - `processEmailColors` calls `getComputedStyle` per element and again per text-node
    ancestor walk (`transform-colors.ts` 123/144/164/172) — a forced style recalc per node,
    synchronous, for every newly rendered body. Gated by `shouldTheme`, so it hits personal
    mail and any non-table body.
  - Each selection is a new thread query in `MessageArticle` (`threadId` changes the AST, so
    `useQuery` resubscribes) plus per-expanded-message tag/extracted-object queries.
  - Needs instrumenting before any fix — do not guess again.
- [ ] **`StoryRole.Connector` always reports not connected** — NOT fixed; the empty state
      now prints the mailbox count and every cursor's `spec.target` uri so the next run says
      which half of `isCursorForTarget` fails. Leading hypothesis: two Mailbox objects (the
      story seeds one at identity init; connecting without an `existingTarget` materializes
      another) and every module takes `useQuery(...)[0]`, so panels may disagree on which
      mailbox they mean.
- [ ] **Exercise it against a real account** — connect, star, save. Nothing above is
      verified beyond build + lint; the story needs a live mailbox to render.
- [ ] **Decide whether a starred-only archive should still be re-importable** — `Upload`
      calls `replaceFeed`, which swaps the whole feed for the file's contents, so
      round-tripping a starred-only export now discards everything unstarred.

## Open questions for the user

- [ ] **Should `ModuleContainer` support a runtime attendable id for role cells?** — the
      per-module `AttendableContainer` above is a workaround: a role cell's id is fixed at
      story-definition time, but the id that matters (the object path) only exists once the
      object is queried. Every module that scopes attention to an object will need the same
      workaround.

## References

- [DESIGN.md](DESIGN.md) — findings and rationale.
- `packages/plugins/plugin-inbox/src/components/HtmlViewer/`
- `packages/plugins/plugin-connector/src/util/sync-routine.ts`
- `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx`
