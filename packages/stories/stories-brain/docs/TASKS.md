# stories-brain research tasks

_Resume: **This is the umbrella work-stream; the inbox SURFACE work lives in the child ledger**
`packages/plugins/plugin-inbox/docs/TASKS.md` (registry project `mailbox-pipeline`) — see the MOVED note
below, and do not add surface work here. THIS file keeps the model-ladder / FINDINGS / Topics research
it was created for: 42 open items.

Child-ledger status as of 2026-08-14: **PR #12555 is in the merge queue** (auto-merge, squash, 84
commits) carrying Phases 0-5 — virtual folders, archive, sender enrichment, and the processor topology
(contributed passes, DAG ordering, per-processor cursor tags, `AnalyzeMailbox`/`GenerateReply` moved to
plugin-brain). Two ECHO changes are spawned and awaiting review, and they gate the rest: computed
aggregate group keys, and annotation-constrained refs.

NOTHING in those 84 commits has been verified in a running app. The 27-step plan in
`packages/plugins/plugin-inbox/docs/TESTING.md` needs a WARM browser — an automation browser starts
with an empty OPFS and trips the fixed 30s startup budget at `useApp.tsx:236`, which is a cold-profile
problem, not a worktree or code one. Uncommitted: none._

## MOVED: the inbox surface work now lives in `packages/plugins/plugin-inbox/docs/TASKS.md`

Split 2026-08-13. That ledger (registry project `mailbox-pipeline`) owns the mailbox pipeline and the surface over it —
folders, message actions, contact affordances, summarization UI — structured as PHASES THAT MAP ONTO
PRs, plus a manual test plan. THIS file keeps the model-ladder / FINDINGS / Topics research it was
created for. Do not add inbox surface work here.

## Priorities (triaged with the user 2026-08-13)

Work this order. Items not listed are P2 — real, but not this push.

**P0 — next:** RecordArticle toolbar + menu (`plugin-space/src/containers/RecordArticle/`) built on the
menu idiom, with injected enrich actions (contact, organization).

**P1 — this push,** in the user's stated order: ConversationStack contact affordance → conversation menu
actions (create Project + composite sender enrichment) → gate the Enrich button on configured
connections → plugin-crm `EnrichImages` story → delete `ProcessMailbox` → **open the PR** → attachment
in its own plank. Also P1: the `useContactLookup` defect; `useCardHover` regression test; avatar/name
alignment (both surfaces); whole-conversation summarization incl. `dx-anchor` links and task extraction;
investor-log LLM summaries; messages without `threadId` never rendering; mailbox-card inbox counts;
live verification in the app (AFTER the PR).

**Resolved by triage — do not re-open as separate work:**

- `ProcessMailbox` deletion CLOSES "real stages behind the `log-title` seam" — the seam is
  `ProcessMailbox`, so it goes with it.
- Conversation-menu create-Project ABSORBS the create-project-from-message form.
- The two single-flight items are ONE item, P2.
- The ConversationStack story item is part of the contact-affordance item.
- DROPPED: hover-driven LLM enrichment (the menu action covers it); regenerating a summary with extra
  instructions.
- Syncing tags back to Gmail is P2 — so archive is LOCAL-ONLY for now, and a Gmail sync will restore an
  archived message. Accepted deliberately, not an oversight.

**Structural:** this ledger moves to `packages/plugins/plugin-inbox/docs/TASKS.md` as its own registry
project; `stories-brain` keeps the model-ladder/FINDINGS research it was created for.

**The inbox items below are marked `MOVED`** — they are owned by the new ledger (several already
shipped in PR #12555) and are recorded here only so the history stays readable. Do not work them from
this file.

Outstanding work for the mailbox-feed research harness (`src/test/harness/*`, tests in `src/test/*`).
Results/fixtures are local-only under the git-ignored `fixtures/local/`.

## Mailbox pipeline routine (2026-08-10) — REMOVED 2026-08-13

**`InboxOperation.ProcessMailbox` and its routine template were deleted.** The checked items below
describe work that no longer exists; they are kept as a record of what was learned, not as shipped
features. Do not treat them as available functionality.

What SURVIVED the deletion, because it turned out not to be process-specific:

- The feed-cursor helpers, now `plugin-inbox/src/operations/cursor.ts` (out of the deleted `process/`
  directory). `ClassifyMailbox` depends on them. `PROCESS_CURSOR_KEY_SOURCE` became
  `FEED_CURSOR_KEY_SOURCE`, and `id` is now REQUIRED — it used to default to the process pipeline's
  tag, so a caller that forgot one silently shared that pipeline's cursor.
- The cursor-reset operation, renamed `ResetFeedCursor` with a required `cursorId`. Deleting it would
  have removed the only way to reset the classify cursor, which its test relies on.
- `CrmOperation.ProcessMailbox` is a DIFFERENT operation in plugin-crm and is untouched.

Spec: `agents/superpowers/specs/2026-08-10-mailbox-pipeline-routine-design.md`. A manually
triggerable routine driving a **cursored** pipeline over the Mailbox feed — the cursor machinery
(incremental + reset) is the thing under test; the pipeline body is a log-title walking skeleton.

### Tasks

- [x] **`InboxOperation.ProcessMailbox`** — cursored log-title pipeline over the feed
      (`plugin-inbox/src/operations/process/`): tagged feed cursor (`org.dxos.plugin.inbox` /
      `processMailbox`, DXN-conformant — the CRM precedent's hyphenated tags are not), per-page
      `Cursor.advance`, strictly-greater skip, sync-style `#process` progress (title as status
      text), `Cancellation.signal` via `Pipeline.abortWith`.
- [x] **`InboxOperation.ResetProcessCursor`** — clears max/min/lastTick/lastError; `reset: false`
      when no cursor exists; cursor object reused (found by tag), never recreated.
- [x] **Toolbar start/stop + reset** — app-graph `processMailbox` extension: Process/Stop primary
      toolbar toggle (`Operation.schedule` so the run is a cancellable process; stop =
      `ProgressRegistry.cancel`), reset as a context-menu action disabled mid-run.
- [x] **`MailboxArticle` statusbar** — shows whichever of `#sync` / `#process` is active.
- [x] **Routine template** — plugin-inbox contributes `org.dxos.routine.processMailbox`
      (Automations companion, Mailbox subjects, disabled hourly timer, runnable = the operation).
- [x] **Tests** — node unit tests (`process-mailbox.test.ts`: cursor tag + advance, incremental,
      reset cycle, malformed `created` skip, foreign-cursor isolation) + stories-inbox
      `ProcessPipeline.stories.tsx` play test (`run N → rerun 0 → reset → run N`, `N` = seeded
      message count) green.
- [x] **Storybook driven from the `@dxos/fixtures` mailbox corpus** — `.storybook/main.mts` vite
      middleware serves `/fixtures/<name>.json` (node-side `fixturePath`, `DX_FIXTURES_DIR`
      override); the story seeds from it (391 real messages) with a demo fallback so CI stays
      green; play test made count-agnostic + load-stabilized. Verified live on :9016 and headless
      with/without the fixture.
- [x] **Progress monitor in the story** — ProgressPlugin + `useProgressMonitors` meters (with
      cancel) in the harness statusbar; verified live (meter + cancel → interrupted run, committed
      facts + cursor survive).
- [x] **Fact-pipeline variant** — Analyze button runs `AnalyzeMailbox` against local Ollama
      (`StoryAiPlugin`, strict:false, pageSize 1); `runFactPipeline` gained an `onProgress` seam and
      `AnalyzeMailbox` now emits `#analyze` progress. Live-verified: meter ticks, facts committed.
      Found + fixed TWO real bugs en route: (1) `AnalyzeMailbox` adopted other consumers' tagged
      cursors on the same feed (it resumed from the process pipeline's position) — its finder now
      matches only untagged cursors; (2) `runFactPipeline` streamed in feed order, so a newest-first
      feed (archive import) advanced the cursor past everything after one message — messages are now
      sorted ascending. Regression tests for both.
- [x] **No progress meter in the app for `#sync` or `#enrich`** — ROOT CAUSE, found by driving the
      live app over the debug port: the process-manager runtime SNAPSHOTTED `Capabilities.TraceSink`
      when it was built (`process-manager-capability.ts`), and plugin-progress contributes its
      progress adapter from an on-demand module with no activation event, so that sink landed after
      the snapshot and was silently dropped. Instrumentation proved both halves: the operation wrote
      `status.update` (386 of them for one `ExtractSubscriptions` run) and the progress sink's `write`
      was never called, so `ProgressRegistry.register` never ran and NO monitor existed for any UI to
      read — nothing to do with plugin-inbox or the keys. FIX: sinks are resolved per write (instances
      cached per factory, since the progress adapter holds monitor + tombstone state); regression test
      in `process-manager-capability.test.ts` fails without it. Verified live: the same run then wrote
      386 messages into the sink and registered `echo://…#subscriptions`. NOTE the sibling gotcha
      found en route: plugin-debug's "Start test progress" registers DIRECTLY on the registry, so it
      always worked but was only visible in the R0 popover — never as a meter in the panel itself.
      `ProgressGenerator` now renders its own `ProgressMeter` while running, with a `Progress` play
      test in `SpaceGenerator.stories.tsx` (start → meter appears, cancel → meter goes).
- [x] **One pipeline trigger** (user decision 2026-08-12) — `Enrich` is now the only pipeline button
      on the mailbox toolbar. `ProcessMailbox` (the `log-title` walking skeleton from #12538) moved to
      `disposition: ['list-item']` — context menu only, kept alongside `resetProcessCursor` because
      that pair is how the cursor machinery is verified; delete both once the cascade has been
      verified live end-to-end.
- [x] **AI-unavailability is a skip, not a cascade failure** — `EnrichMailbox` now recognises both
      flavours ("no `AiService` in the stack" and "no resolver serves this model", the app's actual
      case) via `ai-gate.ts#isAiUnavailableCause` and reports that tier as SKIPPED with
      `ai unavailable (assistant not ready)`, continuing rather than blaming every later tier on it.
      `SummarizeMailbox` no longer swallows an unavailable model either: per-message generation
      failures are still skipped, but an unavailable model propagates, since it fails identically for
      every message and used to report a successful run that summarized nothing. Corrected a WRONG
      comment in the old tests while doing it: `AssistantTestLayer` DOES provide an `AiService` — the
      classify tier fails there on a 401, not on a missing service, which is why the genuine-failure
      test still holds. `analyze` cannot be exercised in that layer at all (no `FactStore`).
- [x] **Mailbox article showed only one page of messages** (regression) — ROOT CAUSE: the next-page
      triggers all required a scrollable window (and a non-zero scroll offset once the window was no
      larger than `paginationThreshold`), so a first page whose rows happened to FIT the plank left
      the list unscrollable — the user could never produce the offset the trigger waited on, and the
      window never grew. Found by probing the live app: the article's list was not scrollable at all
      (the one scrollable element in the document was the navtree), which is why the storybook
      repro passed — there the first page overflowed. FIX: `useVirtualizerPagination` treats an
      UNDERFILLED window (total size <= viewport) as its own trigger, bounded by `usePagination`'s
      exhaustion check so an exhausted short list does not spin. Unit test
      (`extends an underfilled window that cannot be scrolled`) fails without the fix; `Paging` +
      `PagingGrouped` play tests cover the scrollable path. STILL TO DO: confirm in the app.
- [x] **Contact extraction created a Person for every machine sender** (reported 2026-08-12: 101
      Persons in a real mailbox, incl. `no-reply@grafana.com`,
      `invoice+statements+acct_1ika5ja3kz32dpo1@stripe.com`) — TWO defects. (1) The shared
      `extractContact` (the `Contact` ObjectExtractor, run over a whole mailbox from the toolbar menu)
      called `buildContactGraph(sender, db)` with NO signals, and the gate in `buildContactFromActor`
      only applies `if (signals)` — so the bulk path was completely ungated. (2) `selection.ts`'s role
      pattern was an EXACT match (`^(billing|invoice|…)$`), so every qualified bulk address
      (`invoice+statements+acct_…`, `payments-noreply@`, `no.reply@`) slipped past it. FIX: split the
      deny half out as `isAutomatedSender` (address + header signals) and call it from
      `extractContact` — a per-message extraction has no outbound evidence to satisfy the full
      allow-list, but it must still refuse machines; role pattern is now a prefix+separator match;
      `senderSignals` moved into extractor-lib and the two duplicate copies (EmailStage, CRM
      process-mailbox) deleted. Tests: `selection.test.ts` (real junk addresses, individuals incl.
      plus-addressing, header-only denial, prefix-vs-equality) and a new `contact-extractor.test.ts`
      at the actual bug site; 6 of them fail without the fix.
- [x] **Whole-conversation summarization (thread-scoped input)** — `SummarizeMailbox` now summarizes a
      THREAD per LLM call, not a message: `groupThreads` groups by `threadId` (a message without one is
      its own conversation, NOT part of a `null` group), the prompt carries the exchange as a
      transcript oldest-first (trimmed from the FRONT when over budget, since a summary states where
      things now stand), and the annotation is filed under the thread's NEWEST message — which is what
      makes a later reply invalidate it and trigger re-summarization. Contact gate now qualifies the
      whole thread if any message's sender is known. Deterministic tests in `summarize-threads.test.ts`
      (5); the model-fixture test is tagged `model-fixture` and SKIPPED here, so its recordings still
      need regenerating for the new prompt (`regenerate-model-fixture` skill, needs a key).
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **`dx-anchor` DXN links + task extraction in summaries** — the remaining two parts of the
      summarization work (entity links to Person/Organization, and a markdown task list at the foot of
      the summary). Not started.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **List-level contact lookup does not resolve** (open, found 2026-08-12) — `InboxStack` gained a
      `db` prop → `useContactLookup` (ONE `Person` query for the whole list, passed to tiles as
      `getContact`, so a list costs one query rather than a hook per row) and `ContactAvatar` was
      factored out of `Row.Person` so list tiles share the hover/create treatment. In the
      `InboxStack` `Spec` story the seeds ARE created (18 senders, every other one seeded, flushed with
      `{ indexes: true }`) but every avatar still renders as unknown, so `getContact` returns undefined
      for all of them. Suspects: the URI→`EID.tryParse` of a freshly added object, or the story's
      `useQuery` not seeing the seeds. The story's play test therefore asserts only that the list
      renders. NEXT: log the lookup map inside `useContactLookup`.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Toolbar Clear does not clear the filter** (reported 2026-08-13) — `MailboxArticle`'s
      `handleClear` (around `MailboxArticle.tsx:232`) resets only React state (`setFilterText` /
      `setFilter`), but the filter box is an UNCONTROLLED CodeMirror `QueryEditor`, so its text
      survives and the box still reads as filtered. Fix: also drive the editor, which the container
      already holds a ref to — `filterEditorRef.current?.setText(filterProp ?? '')` — the same pattern
      `EventEditor` uses for its attendee editor (`actorListRef.current?.setText(...)`). Cover it in
      the `MailboxArticle` `SearchFilter` play test: type a term, press Clear, assert both the editor
      text and the tile count return to their pre-filter state.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Open an attachment in a new plank** (requested 2026-08-13) — the attachments row in the
      message header (`ConversationStack.tsx`'s `Row.Attachments`, fed from `message.attachments`)
      lists them but does not open them. Clicking one should open it as its own plank via
      `LayoutOperation.Open` with the attachment's object path (the same call the message tile's
      `onOpen` uses for a message), so a PDF/image gets the deck's own surface rather than an inline
      preview. Needs: a click handler on `Row.Attachments` (react-ui-card, currently presentational),
      the attachment ref resolved to its Blob/object DXN, and a surface that renders that type.
- [x] **Inbox + Starred virtual folders in the navtree** (requested 2026-08-13) — `Inbox`
      (`systemTag: 'inbox'`) and `Starred` (`systemTag: 'starred'`) mailbox child nodes in
      `app-graph-builder.ts`, `getInboxId`/`getStarredId` in `paths.ts`, `inbox.label`/`starred.label`
      translations. No new query machinery: the siblings' `properties.filter`/`systemTag` path that
      `MailboxArticle` reads already resolves membership through the mailbox tag index. `All Mail`
      moved to `ph--stack--regular` because `Inbox` takes the tray icon. FOUND: `inbox.label` already
      existed as a DEAD key (nothing referenced it) — removed the orphan instead of duplicating it.
      NOTE: the mailbox ROOT node already carried `filter: '#inbox'` + `systemTag: 'inbox'` as a
      placeholder, so the root and the new child resolve to the same view — which is what Gmail does
      (the account row _is_ the inbox).
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **`InboxOperation.ArchiveMessage` — Gmail semantics** (decided 2026-08-13) — archive REMOVES the
      `inbox` system tag. There is no `archived` tag and the filter language needs no complement
      operator: Gmail's INBOX is a label and JMAP's inbox is a mailbox role, so both providers already
      map onto `SystemTags` (`plugin-google/…/sync/system-tags.ts:14`, `plugin-jmap/…/sync/system-tags.ts:13`)
      and un-archiving is simply re-adding the tag. This is why "Inbox = non-archived" needs no
      negation — modelling an `archived` tag _and_ a complement would be a second, divergent model of
      the same fact. SURFACE (requested 2026-08-13): **Archive / Unarchive message menu items.** One
      operation with the tag toggle behind it, surfaced as two labels chosen from the message's
      current `inbox` membership — the same `useMessageActions` menu in `ConversationStack` that the
      conversation-menu item below extends, so build them together. `translations.ts` already carries
      an orphan `'action-archive.menu': 'Archive'` referenced by nothing (an archive affordance was
      started and abandoned) — wire that key rather than adding a second, and add the unarchive
      counterpart beside it. Membership is readable per-message via the existing
      `SystemTags.tagAtom` family, which is what `Row.Star` already uses for starred, so the label
      flips reactively without a query per row.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **ConversationStack avatar has no contact affordance** (reported 2026-08-13) — the message tile
      renders a bare `Avatar`, so the popover/create mechanism the `Row.Person` surfaces got is absent
      in `MessageArticle`. Swap it for the exported `ContactAvatar` and host `ContactPreview` in the
      story.
- [x] **`Row` story star was not reactive** (reported 2026-08-13) — the Default story passed
      `<Row.Star starred onToggle={() => {}} />`: hardcoded on, no-op handler, so the toggle rendered
      but never moved. `Row.Star` itself is fine (controlled, and it does fire `onToggle`) — the story
      now owns the state. Verified in the browser on :9013: `unstar.label` → `star.label` →
      `unstar.label` across two clicks.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **`useCardHover` target-change regression test** — the cleanup now also runs when `open`/
      `enabled` change (a timer armed for the previous contact could fire a stale `open`), but the test
      CodeRabbit asked for is not written; it needs the hook exported from `Row.tsx` or a story-level
      driver.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **MessageArticle conversation menu actions** (requested 2026-08-12) — add per-message menu items
      to (a) create a Project from the message, and (b) run enhanced extraction on the sender (image +
      Organization). (a) reuses `ProjectOperation.CreateTrackingProject` (the operation exists; PLAN.md
      deliverable 3's form is still unbuilt); (b) is the same research + `EnrichImages` path as the
      hover-enrichment item below. Menu is built in `ConversationStack`'s `useMessageActions`.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Hide the Enrich button when no connections are configured** (requested 2026-08-13) — the
      mailbox toolbar's `enrich` action is contributed unconditionally in `app-graph-builder.ts` (the
      pipeline action with `disposition: ['toolbar', …]`, made the SINGLE pipeline trigger in
      `31b1192d89`). With no connection there is nothing to enrich against, so it is a dead primary
      affordance on a fresh mailbox. Gate the CONTRIBUTION rather than rendering it disabled — a
      disabled primary button still reads as the main call to action. `translations.ts` already carries
      `'no-connections.label': 'No connections configured'`, so an empty state for this condition
      exists; check whether the same predicate can drive both. Settle the scope: Enrich only, or every
      connection-dependent pipeline action. Verify with a mailbox that has no connection — that state
      is also what catches a regression.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Filter box: caret lands BEFORE an existing chip** (reported 2026-08-13) — with a chip present
      (e.g. the `#sent` / `#starred` system-tag filter), placing the cursor and typing inserts ahead of
      the chip; it should land after. Same uncontrolled CodeMirror `QueryEditor` as the "Toolbar Clear"
      item above — fix them in one pass, both being the editor's state not matching what is displayed.
      HYPOTHESIS (unverified): the chip is a widget decoration and the caret resolves to its left,
      governed by the decoration's `side` (and by `atomicRanges` if the chip is atomic). But default
      focus placing the caret at offset 0 produces the SAME symptom with a different fix, so separate
      click-to-place from focus-with-no-selection before changing anything. Cover both entry paths with
      a play test asserting where inserted text lands.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Sync tags back to Gmail** (requested 2026-08-13) — tag changes are currently one-way: the
      providers map their vocabulary onto `SystemTags` on the way IN
      (`plugin-google/…/sync/system-tags.ts`, `plugin-jmap/…/sync/system-tags.ts`), but a locally
      toggled star/archive never reaches the provider. Needs the inverse mapping plus a write path on
      the Gmail connector (label add/remove), and a decision on conflict handling when both sides moved
      since the last sync. Directly gates the archive work above: archiving locally without pushing the
      `inbox` label removal means the message returns on the next sync.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **plugin-crm story driving `CrmOperation.EnrichImages`** (requested 2026-08-13) — a story
      proximate to the operation showing a Person and an Organization and driving enrichment. plugin-crm
      has NO stories today, so this is the package's first storybook setup (config, deps, moon target).
      Seed a Person and an Organization with no `image`, render their cards, and a button invoking the
      operation and showing the result. The image service must be reachable from the storybook —
      establish that empirically and report it rather than faking a result.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Delete `ProcessMailbox`** (decided 2026-08-13) — remove the operation, `ResetProcessCursor`,
      its routine template, the cursor helpers, tests and translations. It is context-menu-only today
      (`disposition: ['list-item']`). NOTE: the "Mailbox pipeline routine (2026-08-10)" phase at the top
      of this file is a full ledger of BUILDING it — that phase has to be rewritten as removed, not left
      standing as completed work, or the ledger will claim shipped features that no longer exist.
- [ ] **Split this work-stream out of `stories-brain`** (requested 2026-08-13) — this ledger is the
      mailbox/inbox stream but lives in a research-harness package, and the registry summary still
      describes only model routing. The code it tracks is overwhelmingly `plugin-inbox` +
      `react-ui-card`. Decide the split: (a) move the ledger to `packages/plugins/plugin-inbox/docs/TASKS.md`
      and register a new project, leaving `stories-brain` with the model-ladder/FINDINGS research it was
      created for; or (b) keep one project and just relocate the file. Either way the ~40 older Topics /
      FINDINGS / model-routing items should not follow the inbox work into a new home. Broader question
      the user raised: how projects should be structured in general — one per package, per work-stream,
      or per branch — since the registry currently mixes all three.
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Mailbox card: rows showing the inbox message count** (requested 2026-08-13) — the mailbox card
      should carry rows reporting how many messages are in the inbox. Counts come from the same
      `inbox`-tag membership the new folder filters use (`SystemTags`/`TagIndex`), so this reads the
      tag index rather than scanning the feed. Settle which counts earn a row — total vs unread vs
      inbox-only — and keep it reactive (a tag-index atom, not a query per render).
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Record when each subscription was last unsubscribed** (requested 2026-08-13) — `ExtractSubscriptions`
      re-detects subscriptions from old messages after the user has already unsubscribed, so the same
      ones keep reappearing. The mailbox needs per-subscription state (the unsubscribe timestamp) that
      extraction consults, skipping any subscription whose evidence predates its last unsubscribe.
      Note the corpus is immutable: the old messages remain and will always match, so suppression has to
      live in the mailbox's own state rather than in message filtering.
- [ ] **(part of the contact-affordance item above) ConversationStack story: popovers + unknown actors** (requested 2026-08-12) — the
      `ConversationStack` `Default` story should (a) host `ContactPreview` so DXN links in message
      content open popovers, (b) give the message avatar the same hover/create mechanism as
      `Row.Person` (use the extracted `ContactAvatar`), and (c) seed only 50% of actors as Persons.
- [x] **DROPPED (2026-08-13) — Enhanced (LLM) enrichment from the hover affordance** — superseded by the
      composite sender-enrichment MENU action; the hover path is not wanted. Originally (2026-08-12) — hovering a
      Person/Organization icon should also offer the AGENTIC enrichment, not just the deterministic
      create: run the research operation to create/update the object's researched fields AND fetch its
      image. The pieces exist — `CrmOperation.ResearchPerson` / `ResearchOrganization`
      (`plugin-crm/src/types/CrmOperation.ts:105,136`, which fill the object's own sections rather than
      writing a separate document) and `CrmOperation.EnrichImages` / `AttachImage` (Gravatar/Clearbit +
      favicon fallback through the SSRF/size/type-hardened path). Open questions to settle when
      building: (1) one composite operation vs. invoking research + image separately from the UI;
      (2) hover should not fire an LLM call on its own — the affordance appears on hover, the run is a
      click; (3) progress/failure surfacing, since research is slow and `AiModelNotAvailable` must read
      as "assistant not ready" (see the enrich-cascade gate). Builds on the hover affordance below and
      shares its storybook.
- [x] **Avatar hover: contact card, or create-the-contact** — `Row.Person`'s `avatar` variant now has
      an interactive form, chosen by whether the caller passes `db` (the hook-free one stays for
      virtualized list tiles, where a contact query per row would be too costly). Hovering resolves to
      one of two states: a Person exists → after 400ms the avatar opens that contact's card (the same
      `DxAnchorActivate` path a `dx-anchor` link takes; PreviewPlugin listens on `window` with
      `capture`, since the event does not bubble); no Person → the avatar gives way to a
      `ph--user-circle-plus--regular` button, and CREATION is a click, never the hover. The anchor
      variant opens its card on hover too. Demonstrated in `Header.stories.tsx` (`Default` +
      `Contact`), whose `onContactCreate` runs the extractor's own `buildContactFromActor`; play tests
      cover both states, including that no create button exists until hover. `Default` is also live
      now (star owns its state, avatar resolves its contact).
- [x] MOVED → `packages/plugins/plugin-inbox/docs/TASKS.md` — **Conversation-view avatar is not centered on the actor's name** (reported 2026-08-12) — in
      `MailboxArticle` grouped/conversation mode (story `Default`) the avatar sits low, centered
      against the whole tile instead of the sender line; the flat view (`Flat`) is correct. Look at
      the conversation tile's grid row alignment in `InboxStack` (the flat tile aligns its avatar to
      the first row; the conversation tile appears to center across both rows).
- [ ] **Live verification in the app** — run from the mailbox toolbar against a synced mailbox:
      meter appears with titles, Stop mid-run keeps the committed cursor, reset re-processes.
- [x] **CLOSED (2026-08-13) — Real stages behind the `log-title` seam** — the seam IS `ProcessMailbox`,
      which is being deleted, so there is nothing left to put stages behind. Was: — facts/tag/summarize (see the model-policy /
      triage work above) once the skeleton is proven live.
- [ ] **Operation-level single-flight per mailbox** (from PR #12538 review) — nothing serializes a
      routine-triggered run against a manual one, and a reset issued mid-run (UI-guarded only) could
      be overwritten by a later page commit. Needs a mailbox-keyed guard at the operation layer (no
      such primitive exists in the repo today); benign for the log-title body, matters once real
      stages land. Documented as a v1 limitation in the spec's error-handling section.

## Mailbox pipeline suite (2026-08-12, autonomous session)

Six pipelines over the MailboxAnalyze workbench plus a summarization tier and the orchestrator that
cascades them, shipped on **PR #12546** (branch `claude/mailbox-research-1e4396`, opened
after #12538 landed). Test index: `packages/stories/stories-inbox/AUDIT.md`; product plan:
`packages/plugins/plugin-inbox/docs/PLAN.md` § "Mailbox pipelines → product".

### Tasks

- [x] **`InboxOperation.ExtractCorrespondents`** — Persons (+ derived Organizations) for anyone the
      user has sent or replied to; outbound signal recovered from an inbox-only corpus (replies
      addressed directly to `me`); idempotent via the shared identity index. Live on the fixture:
      391 scanned → 16 correspondents → 12 Persons, reruns 0.
- [x] **`InboxOperation.ExtractSubscriptions`** — unsubscribe affordances (header + body links)
      aggregated per sender onto the new `mailbox.subscriptions` field (wholesale replace). Live:
      135 matched messages → 45 subscriptions.
- [x] **`InboxOperation.ClassifyMailbox`** — LLM spam + category labeling (canonical system tags,
      new `spam` tag), cursored ≤100-message batches, known-Person senders short-circuited (never
      spam, never billed); strict structured output with lenient JSON-salvage fallback. Model-fixture
      unit tests (recorded on Haiku) + opt-in live harness (`stories-inbox/src/test/classify-fixture.test.ts`).
      Full-corpus run 2026-08-12: 391/391 — Updates 219, Promotions 58, Personal 52, Forums 34,
      Social 15, Spam 13; 23 known-person shortcuts. Spend well under $1.
- [x] **`buildContactGraph` (extractor-lib)** — contact extraction now derives an Organization from
      a corporate sender domain (free-mail deny list; gate evaluated before the org exists so it
      never admits its own sender); Extract/CRM/correspondents paths all converge on it.
- [x] **`CrmOperation.EnrichImages`** — avatars (Gravatar SHA-256, `d=404`) + logos (Clearbit,
      favicon fallback) through the hardened `AttachImage` path (refactored to a shared core).
- [x] **`ProjectOperation.{UpdateProjectTasks, UpdateTravelLog, UpdateInvestorLog,
CreateTrackingProject}`** — the routine→operation→artifact pattern: mailbox pipelines that
      contribute to a Project (task set requests, regenerated Travel Bookings / Investor
      Conversations documents, contact extraction), plus project-from-a-message (sender's corporate
      domain defines the tracked group; feed-triggered runnable routine + backfill). The
      kirkconsult admin example verified in unit tests and live (project + task + investor contact
      created in-browser via the Projects button).
- [x] **`InboxOperation.SummarizeMailbox`** — per-message summaries for mail from known contacts
      (the correspondent gate), hard-capped per run (≤50) and idempotent by parent id rather than by
      cursor, so a reset never re-bills a summary already in the feed. A failed generation skips its
      message instead of failing the run.
- [x] **Summary storage = a second feed** (user's design, adopted) — `Mailbox.annotations` holds
      immutable `Message`s whose `parentMessage` names the subject and whose text block carries
      `disposition: 'summary'` + `mimeType: 'text/markdown'`; `Mailbox.mergeAnnotations` merges the
      two feeds on read (newest annotation wins) and `summaryIndex` gives a flat lookup. Feed
      messages are immutable, so re-derivation appends and supersedes. Tests: `Mailbox.test.ts` →
      "Mailbox annotations" (22 green).
- [x] **`InboxOperation.EnrichMailbox`** — the orchestrator: spawns the tiers in cascade order
      (`deterministic → classify → summarize`, `analyze` opt-in) via `Operation.Service`, reporting
      per-stage progress. Failure handling had to use `Effect.exit` + `Cause.isInterruptedOnly`:
      AI layers `Layer.orDie`, so a model failure arrives as a **defect** and `Effect.either` let it
      escape the cascade. Cancellation stops the remaining stages; an error marks them `skipped`.
- [x] **Tier taxonomy + product plan** — `MailboxTier` (`deterministic | classify | summarize |
analyze`) with a mailbox-global default and per-project overrides (user chose option 3), plus
      PLAN.md's three product deliverables (toolbar trigger, summaries in the message article,
      create-project-from-message) and the layering recommendation (node unit tests = logic,
      storybook = runtime wiring, product = the user contract).
- [x] **Story workbench** — `MailboxArticle.stories.tsx` is now a three-panel harness (article /
      message JSON / content blocks) with the article cell attended and selection read through
      `useSelection`; `TestGrid` moved to `@dxos/react-ui/testing`; `seedSummaries` seeds mock
      summaries for 50% of messages so the annotation merge is exercised without an LLM. The blocks
      panel merges the message's own blocks with its annotations' — a view reading only
      `message.blocks` never shows a summary.

### Follow-ups

- [x] **CodeRabbit review on #12546 (8 comments)** — all fixed, replied per thread, resolved
      (`bc19f424a1`). The two that were more than mechanical: `tiers` is now documented and enforced
      as a SET flattened through `InboxOperation.MAILBOX_TIER_ORDER` (honoring a caller's order would
      let classification run before the contact gate it consumes — test:
      `runs the tiers in cascade order however the caller lists them`), and `withMailboxLock`
      (`operations/mailbox-lock.ts`) serializes `SummarizeMailbox` per mailbox URI so overlapping
      runs cannot double-summarize or double-provision the annotation feed.
- [ ] **Operation-layer single-flight (still open)** — the lock above is in-process and deliberately
      NOT taken by `EnrichMailbox`, which spawns `SummarizeMailbox` and would deadlock on its own
      child. A re-entrant or durable lease at the operation layer would close both this and the
      `ProcessMailbox` gap above.
- [ ] **(absorbed by the conversation-menu item) Create-project-from-message UI** — the operation side is done; the message-context form is
      not built (PLAN.md deliverable 3).
- [x] **Conversation summary tile** — the summary renders once, as the last tile under the messages
      (`ConversationStack.SummaryTile`), aligned to the message column template via the shared avatar
      gutter; the duplicate inside each expanded message is gone. `Mailbox.conversationSummary` picks
      the newest summarized message in the thread (a seam for a future thread-level annotation).
      `MessageArticle.stories` now seeds summaries and the Spec play test asserts the tile.
- [ ] **Whole-conversation summarization** (IN PROGRESS 2026-08-12) — three parts, in this order:
  - Thread-scoped input: summarize the whole conversation (every message in the `threadId`), not each
    message in isolation. The annotation still names a parent, so the read model keeps working.
  - `dx-anchor` links (ECHO DXNs) to entities the summary references — Person, Organization, etc.
  - Task extraction, rendered as a markdown task list with those links at the foot of the summary.
- [x] **DROPPED (2026-08-13) — Regenerate a summary with extra instructions** — the user re-runs summarization for a
      conversation while adding guidance ("focus on the contract terms", "who owes what?"), either
      from the MessageArticle UI or the companion chat. Re-derivation already appends and supersedes,
      so the storage model needs nothing; the missing pieces are the instruction input surface and an
      operation input for it.
- [ ] **Summarization eval** — score thread summaries (coverage/faithfulness/task-extraction
      precision) so a prompt change is measurable; reuses `judge.ts` per the model-ladder work below.
- [x] **Summary provenance in the article** — the summary tile's header carries `model · age`
      (`summary-provenance.label`), the full model id as its `title`, and the age is the ANNOTATION's
      `created`, not the message's, so a summary that predates the newest replies reads as stale.
      `Mailbox.conversationSummary` now takes the annotations rather than a `summaryIndex` map, since
      the map discards provenance; `modelLabel` shortens `com.anthropic.model.claude-haiku-4-5.default`
      for display.
- [ ] **Story invoker wedge (env)** — in the dev storybook, an operation's FIRST invocation after a
      server restart often hangs (lazy-handler vite load?) and `invokePromise` results render `{}`
      even when the operation completes (ECHO side-effects land). Unit tests unaffected. Needs an
      OperationInvoker-side look.
- [ ] **One-shot index queries time out (20s) during indexing backlog** — `getIdentityIndex` /
      `Feed.query` against a freshly imported 391-message space; settles after ~2 min. Retry or
      backoff at the query layer would unblock pipelines run right after a big import.
- [ ] **Investor-log LLM summaries live** — `summarize: true` path is implemented + degrades to the
      digest; run against the fixture with the real key and eyeball quality.
- [ ] **Travel/investor project templates** — register `ProjectCapabilities.Template`s wrapping the
      new operations (scaffold + routine), mirroring `inboxResearch` / `crmProject`.
- [ ] **Messages without `threadId` never render** in the mailbox conversation view
      (`buildThreadSemiJoin`) — product edge found while seeding; decide fallback grouping.

## Overnight model-ladder experiment

**Goal:** per task, find the smallest open-weight model that matches a cheap premier model (haiku) —
measuring **size × latency × accuracy**. Hypothesis (H0, capability ladder): model tier required
rises with task complexity; open weights ≤ ~20B match haiku on extractive tasks (labeling,
categorization) but fall below on synthetic tasks (thread/topic summaries, drafts).

**Setup:** contestants = llama-3.2-3b · qwen3-8b · gemma-4-12b · gpt-oss-20b · qwen3-30b ·
**haiku (bar)**; **grader = opus** (summaries/drafts only, never a contestant). Scope-B tasks:
(a) labeling, (b) categorization, (c) summaries [message/thread], (d1) drafts-from-knowledge.

### Tasks

- [x] Update `pipeline-email/scripts/pull-models.sh` to the modern ladder.
- [x] **Catalog + ladder** — added `qwen3-8b` / `qwen3-30b` to `Model.ts`; wired the 5-tier
      `LOCAL_VARIANTS` in `models.ts`. Validated via `ladder-probe.test.ts`: all 5 local models
      resolve + parse JSON. Warm latency (trivial prompt): llama-3b 192ms, gpt-oss-20b 1.4s,
      gemma-12b 2.4s, qwen3-30b 3.4s, qwen3-8b 4.2s (reasoning tax is non-monotonic in size).
- [x] **Timing capture** — `internal/ladder.ts` `runLadder`: warms each model (excludes cold load),
      runs items serially model-by-model (no VRAM thrash), reports p50/p95/mean + throughput.
- [x] **Grading layer** (`internal/grade.ts`): labeling → deterministic agreement vs the reference
      (spam F1, tag Jaccard); summaries → coverage + faithfulness (reuses `judge.ts`); drafts →
      0–5 rubric (relevance/correctness/completeness/tone). Bench: `model-ladder.bench.test.ts`.
- [ ] **Categorization bench** — DEFERRED (labeling/summaries/drafts landed). Group messages/threads
      into topics; cluster agreement vs haiku. (The topics _artifact_ now uses the corpus pipeline.)
- [x] **`overnight.mjs` driver** + `overnight` moon task — non-interactive, reuses `bench --stats`.
      `generateText` gained retry+backoff, a generous `LLM_TIMEOUT`, and `catchAllCause` (a defect —
      @effect/ai ParseError while constructing its own AiError — was crashing the run mid-way).
- [x] **RAN** (2026-07-11, N=25, opus judge). Results: `results/model-ladder.md` +
      `topics.md` / `profiles.md` / `drafts-sample.md`. **Analysis + audit → `fixtures/REPORT.md`.**
      Headline: **H0 inverted** — open weights strongest on _drafts_ (gemma-12b/qwen3-30b clear the
      bar), weakest on _labeling_; faithfulness universally high; gpt-oss-20b best all-rounder.

## Next experiment: Active Topics (overnight)

Spec: `agents/superpowers/specs/2026-07-13-active-topics-experiment-design.md`. Build fully-populated
topic structures from the private fixture + a confidence-ranked active/suggested split, for morning
human review. Harness-only (informs the product `Topic` schema). Prereqs: Ollama + `.env` (opus/haiku).

### Tasks

- [x] **`ActiveTopic` type + assembly (pure, tested)** — `harness/internal/active-topics.ts`:
      `ActiveTopic`/`SuggestedTopic`/`ScoredCandidate` + `assembleActiveTopic` / `toSuggestedTopic` /
      `populatedChecklist` / `topicSlug`. Unit-tested.
- [x] **`activityScore` (deterministic, tested)** — recency (exp decay) + `awaiting-mine` + person-linked + open-item count, weighted → `[0,1]`. Unit-tested (recent+awaiting+person+items → ~1; stale/org → <0.05).
- [x] **Confidence combine + split (pure, tested)** — `combineConfidence` (w·llm + (1−w)·activity, clamped) + `classifyTopics` (≥ threshold, capped at top, highest-first). Unit-tested.
- [x] **Action-items → `Outline`** — `renderTasksMarkdown` (nested `- [ ]`) + `makeTasksOutline`
      (`Outline.make`); `@dxos/plugin-outliner` workspace dep added. Render unit-tested. 10/10 node tests green.
- [x] **Populate stage** — `pipelines/active-topics.ts` `makeActiveTopicsDeps`: model-backed
      confidence/status/tasks (via `generateText` + policy), facts (`extractDocFacts` per message,
      rendered), drafts (`draftReply` per thread, skips bulk). Build-verified (runs under models).
- [x] **Reports + JSON writer** — `internal/active-topics-report.ts` `renderIndex` / `renderTopicReport`
      / `serializeActiveTopics` / `writeActiveTopicsReports`. Renderers unit-tested.
- [x] **`active-topics.mjs` driver + `stories-brain:active-topics` moon task** — non-interactive; env
      `ACTIVE_N` / `ACTIVE_TOP` / `ACTIVE_THRESHOLD` / `MODEL_POLICY`. Runs `active-topics.bench.test.ts`
      (guarded by `fixtureExists()` → CI skips; 13 unit tests + skip verified).
- [x] **Shakedown (smoke, LIMIT=15)** — found + fixed: wall-clock recency (fixture is historical →
      anchor "now" to the corpus's latest message) and multi-alias owner support in `buildThreads`
      (`string | string[]` + test). Smoke: 2 active + 6 suggested, status/facts/tasks populated; drafts
      correctly skipped for automated senders (e.g. `noreply@safesendreturns.com`).
- [x] **RUN full** (`ACTIVE_TOP=8`, both aliases, all 495) — done (run1 + run2). Findings in
      `fixtures/REPORT.md §6`. Run1: active list dominated by automated notices; run2 (post-intervention):
      real person/team topics, 5/8 with drafts.
- [x] **Intervention: automated/no-reply down-weight** — `activityScore` down-weights (×0.35) topics whose
      every non-owner sender is a no-reply/role address (`isAutomatedAddress` + `computeClusterSignals.automated`).
      Re-ran; clear win (REPORT §6). 16 unit tests.
- [ ] **Active Topics v2 (next iteration)** — LLM labels (replace keyword-salad); wire `personEmails`
      (contacts) so the person signal fires; fact extraction on short person threads. See ROADMAP C2.

## ⚠️ CI BLOCKER (PR #12178) — decide in the morning

`assistant-e2e:test` is red — 5 tests (`crm-mailbox`/`database`/`markdown`) fail with **"No memoized
conversation found for the given prompt."** Root cause: `Mailbox.topicSuggestions` (Phase B) is
serialized into the agents' JSON-schema prompt, invalidating the committed `*.conversations.json`
fixtures. Surfaced now because a `pipeline-email` edit pulled `assistant-e2e` into the affected set.
`FormInputAnnotation.set(false)` does NOT drop a field from the serialized schema (no annotation
shortcut). Two resolutions (NOT done autonomously — ~18 MB paid, non-deterministic fixture rewrite in
another package):

1. Regenerate: `ALLOW_LLM_GENERATION=1 moon run assistant-e2e:test` → commit the updated
   `crm-mailbox`/`database`/`markdown` `.conversations.json`. (`regenerate-memoized-llm` skill; needs
   `DX_ANTHROPIC_API_KEY`.)
2. Move topic suggestions off the `Mailbox` schema (separate object — one of the original design forks)
   so the Mailbox schema stops changing and no regen is needed.

Diagnosis posted as a PR comment. Everything else on the PR is green/verified.

## Triage v3 + live framework (2026-07-13 pivot)

Feedback: auto "active topics" still surfaces marketing/bulk; pivot to manual curation + triage.
Only invoices (crabnebula, kirk) matter → action tags, not topics. `unsubscribe` is a deterministic
bulk tell.

- [x] **Deterministic unsubscribe ⇒ bulk** — `classifyBulk` returns bulk when a `List-Unsubscribe`
      header (real mail) or an unsubscribe link in the body (fixture) is present, outranking action
      subjects. `tagMessage` passes `properties.listUnsubscribe` + body. 14 tests. (`70820f4b`)
- [x] **Subscription helpers** — `Mailbox.deriveSubscriptions` + `parseUnsubscribe` (one-click http +
      mailto), 10 tests. (`ad9d2543`)
- [x] **`UnsubscribeSender` operation** — skip-sender filter + RFC 8058 one-click POST (best-effort;
      mailto-only → filter only). (`2222f4ce`)
- [x] **Subscriptions view** — `SubscriptionsArticle` (bulk senders + checkboxes → Remove), folder node
      (peer of Topics) + surface + translations. Build-verified; live verification via the framework
      below (feed can't be seeded headlessly). (`d799497a`)
- [ ] **Priority 1 — manual topics + management + task tracking** — `CreateTopicFromMessage` seeds;
      build out topic management + task tracking surfaces. (Auto active-topics ranking deprioritized.)
- [~] **Priority 2 — live-space test framework (extend the CLI)** — decided: extend `@dxos/cli`
  (already has ClientService + `spaceLayer`→Database.Service + registered inbox types). Shipped
  (`ad52e31`): `dx identity join <invitation>` (headless device join via `client.halo.join`) +
  `dx mailbox subscriptions` (spaceLayer + mailbox feed → `deriveSubscriptions` over live data).
  Build-verified; RUNTIME needs the user to device-join + run. NEXT: more `dx mailbox` subcommands
  (topics/tag/active-topics over live data), then promote to the edge service (same substrate).

## Roadmap, CRM spec & parallel-experiment plan (asks 2026-07-13)

**Direction:** the north star is an **AI-assisted, Topic-anchored CRM** — analyze personal/team email,
discover Topics, and drive custom workflows off them. The Active Topics experiment is the first probe.
These deliverables come AFTER the full experiment run + review.

### Tasks

- [x] **`ROADMAP.md`** (`packages/stories/stories-brain/ROADMAP.md`) — done. Part A technique survey
      (N3/EYE reasoning, GraphRAG-vs-vectorRAG, KG hallucination eval/GraphEval, relationship-intelligence
      CRM) with cited web research; Part B the FactStore question + 5 concrete validation experiments
      (B1 fact-vs-thread QA is the decisive test, B3 N3 rules, B4 faithfulness gate, B5 facts-as-memory);
      Part C the parallelizable experiment roadmap; Part D near-term follow-ups.
- [x] **CRM product spec** (`agents/superpowers/specs/2026-07-13-crm-workflow-design.md`) — drafted:
      vision (Topic as the organizing primitive), 7-layer architecture, the 7 features + 6 proposed
      additions (workflow engine, triage/two-tier, relationship graph, provenance layer, team mode,
      digest), tests per feature, cross-cutting eval/model-routing/FactStore, open questions. For morning refinement.
- [x] **Experimental roadmap for parallel agents** — `ROADMAP.md` Part C: 8 self-contained briefs
      (C1 FactStore validation, C2 Active Topics v2, C3 N3 workflow rules, C4 contact entity-resolution,
      C5 task extraction, C6 draft re-score, C7 research agent, C8 two-tier latency) with parallelization
      notes (C1/C4/C5/C6/C8 independent today). Refineable in the morning.
- [x] **Track everything here** — kept current.

Follow-ups (deferred): automated judge scoring; held-out incoming-mail contextualization; promote the
validated `ActiveTopic` fields into the product `Topic`.

## Next — model routing & sender-type triage (from REPORT §5)

**Direction:** triage by sender type first, spend LLM effort only where it pays off. Sync is 100%
deterministic (no LLM) → foreground stays fast; all LLM cost is batchable enrichment.

- [x] **`classify-sender` (person/org) stage + ground-truth eval** — shipped. Stage
      (`pipelines/classify-sender.ts`): `uniqueSenders` (per-sender dedup), `classifySenderHeuristic`
      (deterministic role-address/company/person-name signals + confidence), `classifySender` (LLM),
      `classifySenderHybrid` (heuristic-when-confident-else-LLM). Scorer `scoreSenders` in `grade.ts`
      (accuracy + per-class/macro F1 + directional confusion). Eval `classify-sender.bench.test.ts`:
      a bootstrap test seeds a candidate gold set via the strong model → human reviews + promotes to
      `fixtures/local/sender-labels.json` → the eval scores heuristic / hybrid / each model vs gold.
      Deterministic unit test (`classify-sender.test.ts`, 8 cases) passes in CI; build+lint+fmt clean.
      **To run the measurement:** bootstrap over the private corpus, review labels, re-run the eval.
- [x] **`Mailbox.isReplyable` → person-only** — extended in `plugin-inbox/types/Mailbox.ts`: added
      `isOrgSender` (deterministic strong-signal role-localpart / org-name check, errs toward person so
      real individuals aren't suppressed); `isReplyable` now returns false for no-reply/unsubscribe/
      mailer-daemon OR an org sender, and accepts an optional `{ senderClass }` so the background
      classify-sender result overrides the heuristic (no-reply gate still wins). 4 tests in
      `Mailbox.test.ts`; full plugin-inbox suite green. FOLLOW-UP: pass the classify-sender class into
      `isReplyable({ senderClass })` at the product draft-creation call site.
- [x] **Minimize non-people summarization** — `pipelines/summarize.ts`: `labelMessage` (one-line
      category label, cheaper prompt), `summaryKindFor` (pure routing, reuses `Mailbox.isReplyable` so
      summarize + reply agree on "person"), and `summarizeTriaged` (full summary for people, label for
      org/bulk). `SummaryResult` gains `kind: 'summary' | 'label'`; `senderClass` overrides the
      heuristic. 3 routing tests (`summarize-triage.test.ts`); build/lint/fmt clean.
- [x] **Default draft `Instructions`** — shipped `DEFAULT_DRAFT_INSTRUCTIONS` (plain/direct, no
      obsequious hedging) in `pipelines/draft.ts`; `draftReply` applies it by default (omit → default;
      `''` opts out; a custom string overrides). Extracted a pure `buildDraftPrompt` + unit test
      (`draft-instructions.test.ts`). `DRAFT_INSTRUCTIONS` env still overrides. **Re-score** = run
      `draft-responses.bench.test.ts` over the corpus (needs models).
- [x] **Model-policy map** — `harness/model-policy.ts`: `StageId` (the 7 LLM stages), `ModelPolicy`
      (`stage → variant name`), `DEFAULT_MODEL_POLICY` seeded from §4/§5, `resolveModel`/`resolveModelName`
      (default ← per-run policy ← `MODEL_POLICY` env; substring match vs `ALL_VARIANTS`; throws on typo).
      Unit test (`model-policy.test.ts`, 8 cases: every default resolves, override precedence, env parse).
      FOLLOW-UP: migrate single-run tests off `OLLAMA_MODEL`/`ARTIFACT_MODEL` onto `resolveModel(stage)` —
      deferred because it changes those tests' default model (deliberate step, not silent).
- [ ] **Two-tier latency** — foreground (sync + classify + tag) vs background prioritized batching of
      summarize/facts/draft, gated by labels.
- [x] **Single per-message LLM pass** — `pipelines/enrich.ts`: `enrichMessage` folds tag + spam +
      triage-appropriate summary/label + salient facts into ONE model call (message read once).
      Pure `buildEnrichPrompt` (summary vs label by triage `kind`) + `parseEnrichResponse` (lenient
      JSON, spam inference/dedup, degrades to empty) are unit-tested (`enrich.test.ts`, 7 cases). The
      structured RDF fact pipeline stays separate. Latency/token comparison vs 3 passes = a bench run.
- [x] **Topics clustering fix** (`corpus/topics.ts`) — `tokenize` now drops id tokens (pure numbers,
      hex hashes, digit-heavy codes) via `isIdToken`, gated by a `dropIdTokens` option (default true);
      short version tokens (`q4`, `v2`) are kept. Subjects are already reply-prefix/whitespace-
      normalized at threading time (`internal/threading.ts` `normalizeSubject`), so the per-message
      invoice/order ids were the remaining fragmenter. Tests: automated invoices with unique hashes
      now collapse to one topic; ids no longer leak into keywords. Full pipeline-email suite green.
- [x] **eval-only cleanup** — `analyze-results.mjs` now counts graded-row schemas (`model-ladder`,
      `classify-sender`): `primaryCount` falls back to `r.n ?? r.scored ?? rows.length` (was summing
      only `facts`/`processed` → false EMPTY), and both are added to `NON_FEED_TESTS` (capped/unique-
      sender corpora, so `< feedCount` isn't PARTIAL). Verified end-to-end on synthetic results → OK.

Risks: reasoning models (qwen3, gpt-oss) → higher latency + may break strict JSON (parse leniently).
Ollama up during runs; opus/haiku need `.env` (`moon run stories-brain:env` renders it via 1Password).

## Next phase: Topics pipeline (productization)

**Direction:** turn the research topics work into a product feature — tag messages, cluster into
`Topic` objects with summaries, run it from the mailbox UI with a progress meter, and browse the
result. Reuses `@dxos/pipeline-email` corpus (`buildThreads`→`clusterThreads`→`summarizeTopics`→
`materializeTopics`), the #12171 progress-monitor capability, and the `InboxCapabilities.MailboxAction`
toolbar-injection seam. First real consumer of the incremental design (`DESIGN.md`) — one-shot v1 will
hit the operation max-run-time on large mailboxes; bound it now, generalize later.

### Decisions (locked)

1. **Orchestration** — a headless **`@dxos/pipeline-email` runnable**; the plugin-inbox operation wraps it.
2. **Tagger** — **promote the research tagger** (free-form multi-tag + spam) into pipeline-email; the
   runnable returns per-message tag results, the operation applies them via `Mailbox.applyTag`.
3. **Progress key** — distinct **`${mailboxUri}#topics`** via an exported `createTopicsProgressKey(mailbox)`
   helper (following `createSyncProgressKey` in `sync.ts` — one factory ties producer + consumer +
   tests together); `MailboxArticle` also subscribes so the inline statusbar meter shows the run.
4. **Model routing** — **promote the `model-policy` map to a product package** (prerequisite; move it
   out of the stories-brain harness with product-appropriate variants) and resolve stage→model there.
5. **Scale** — **one-shot, resumable-lite**: idempotent, skip messages/threads already tagged /
   materialized so re-invoking the toolbar action resumes. Full trigger/cursor incremental (`DESIGN.md`)
   is a later phase.

### Tasks

- [x] **(prereq) Promote `model-policy` map** — `pipeline-email/model-policy.ts` (Anthropic tiers,
      `resolveModel`); unit-tested.
- [x] **(prereq) Promote the tagger** — `pipeline-email/stages/tag.ts` (`tagMessage` + pure
      `parseTagResult`, model via the policy); unit-tested.
- [x] **Topics runnable** — `pipeline-email/topics-pipeline.ts` `runTopicsPipeline`: tag → buildThreads
      → clusterThreads → summarizeTopics → materializeTopics; LLM steps injected (pure/testable);
      idempotent (limit / skipMessage / skipTopic) + progress hook. Unit-tested with stubs.
- [x] **`AnalyzeTopics` operation** — `plugin-inbox/operations/analyze/analyze-topics.ts`: wires the
      runnable to AiService, applies tags via `Mailbox.applyTag`, persists Topics, registers the
      `${mailboxUri}#topics` monitor (`createTopicsProgressKey`). Registered in the handler set.
- [x] **Mailbox → Topic `Relation`** — each Topic persisted with an `AnchoredTo` relation (source=Topic,
      target=Mailbox). ⚠️ REVIEW: idiomatic AnchoredTo direction (Topic anchored to Mailbox), not the
      literal "Mailbox ⇒ Topic".
- [x] **Toolbar menu option** — `InboxCapabilities.MailboxAction` "Analyze Topics" contributed from
      `InboxPlugin` (auto-renders in the extract dropdown).
- [x] **`MailboxArticle` inline meter** — subscribes to `${mailboxUri}#topics` too; shows whichever
      run (sync/topics) is active.
- [x] **App-graph node** — Topics node under the mailbox (peer of Drafts) in `app-graph-builder.ts`.
- [x] **`TopicsArticle`** — `react-ui-mosaic` stack of Topic cards (label, summary, thread/participant
      count); wired via a react-surface. `Topic` schema registered in the plugin.
- [x] **`TopicsModule`** (stories-inbox) — renders the Topics article surface; registered in
      `testing/modules.tsx` + a column in `MailboxSync.stories.tsx`.

**All 9 tasks landed (build/lint/fmt/tests green).** Verified to build + unit-test level; end-to-end
(running AnalyzeTopics to see real topics) needs models + the storybook. Follow-ups: scope the Topics
query to the mailbox via the AnchoredTo relation; confirm the relation direction.

### Follow-ups (open)

- [ ] **Re-sync creates duplicate messages after deleting the connection.** Deleting the connection
      and syncing again re-imports every message as a duplicate. The mailbox must retain the previous
      sync state (cursor / seen-message set) independent of the connection lifecycle, and the sync
      operation must dedup so re-syncing never creates duplicates. (plugin-inbox Gmail sync + cursor.)

## Next phase: Topics quality + triage v2 (from live review 2026-07-12)

**Direction:** first pass shipped Topics but quality/utility is low — most mail is _bulk_ (receipts,
login notices) that needs no action, and topics get created for senders with no relationship. Tighten
triage, make topics opt-in suggestions rather than eager objects, and finish the master/detail UI.

### Tagging & triage

- [x] **`bulk` tag for no-action mail** — `pipeline-email/stages/tag.ts`: `classifyBulk` (pure —
      subject + sender local part; `'action'` for invoices/payment-requests wins over any bulk signal,
      so they're never bulk) + `applyBulkTag` (adds `bulk` the model missed, strips it from action
      mail). `tagMessage` folds the deterministic gate over the LLM tags; `TagResult` gains `bulk`.
      Prompt updated. 13 tests in `tag.test.ts` (incl. the user's examples). Build clean.
- [x] **Only topic Person senders** — `runTopicsPipeline` gains a `keepTopic?(draft)` predicate
      (applied to fresh clusters before summarization); `analyze-topics.ts` queries `Person` records,
      builds a lowercased email set, and keeps a topic only when a participant matches (bulk/org-only
      threads dropped). Tagging is unaffected. Test in `topics-pipeline.test.ts`; both packages build.

### Topic suggestions (opt-in)

- [x] **Lightweight topic suggestions on Mailbox** → shipped as **Phase B** in the Topics UX v2 plan
      below (spec `agents/superpowers/specs/2026-07-12-topics-ux-v2-design.md`).
- [x] **Message → "Create Topic" menu** → shipped as **Phase C** in the Topics UX v2 plan below
      (single-thread seed in v1).

### UI

- [x] **Fix "Ignore sender" menu item** — root cause: `DraftsArticle` (and any consumer not handling
      `ignore-sender`) still rendered the item, so it no-oped there. `MessageStack` now gates the item
      behind an `enableIgnoreSender` prop (default off); only `MailboxArticle` — which handles the
      action and DOES add the `messageFilters` filter (verified) — sets it. Added a `ph--prohibit`
      icon. `Card.Menu` / `TileMenuItem` / `ToolbarMenuItem` gained an optional `icon` field.
- [x] **Delete option on topic card** — `TopicsArticle` `TopicTile` gains a `Card.Menu` "Delete topic"
      item (`ph--trash` icon) → `space.db.remove(topic)`. New `topics.delete.label` translation. Verified
      by a storybook play test (`Topics.stories.tsx` — seeds two topics, deletes one, asserts removal).
      FOLLOW-UP: also remove the `AnchoredTo` relation when deleting (currently orphaned).
- [x] **`TopicArticle` + master/detail** → shipped as **Phase A** in the Topics UX v2 plan below.

## Topics UX v2 — implementation plan

> Spec: `agents/superpowers/specs/2026-07-12-topics-ux-v2-design.md`. Build order **A → B → C**; each
> phase is a separate commit, build/lint/fmt clean with its storybook play test green. TDD where a pure
> unit exists. Single-file test runs: `pnpm --filter <pkg> exec vitest run --project=node <file>`;
> storybook: `pnpm --filter @dxos/stories-inbox exec vitest run --project=storybook <file>`.

### Phase 0 — shared model (prereq for A/B)

- [x] **Extract `TopicProps`** — done in `pipeline-email/src/types/Topic.ts`; `Topic` extends it.
      `deriveThreadId`/`normalizeSubject` now exported from the package index too. Tests green.
- [x] **Add `Mailbox.topicSuggestions`** — `Schema.optional(Schema.Array(TopicProps))` added; builds green.

### Phase A — `TopicArticle` master/detail

- [x] **`resolveTopicThreads` helper (pure, tested)** — `TopicArticle/resolve-threads.ts`: groups
      messages by `deriveThreadId`, returns only the topic's referenced threads in order, omits threads
      with no messages. 2 unit tests green. (Wired into the live feed = the follow-up below.)
- [x] **`TopicArticle` container** — `TopicArticle/TopicArticle.tsx`: renders the topic's stored fields
      (summary, keyword chips via `Row.Tags`, participants, questions/tasks/thread-subject list
      sections). Self-contained (no cross-object resolution in v1).
- [x] **react-surface + master→detail wiring** — added `AppSurface.object(Article, Topic)` → `TopicArticle`;
      `TopicsArticle` card current-change calls `useShowItem` with `linkedSegment('topic')` (companion in
      simple mode; deck-peer path is a follow-up).
- [x] **Storybook play test** — `Topics.stories.tsx` `Detail` + `DetailTest`: renders `TopicArticle` for a
      seeded topic and asserts summary, keyword chip, participants, question, task. 4/4 storybook tests green.
- [x] **Commit** `feat(inbox): TopicArticle master/detail`.
- [ ] **FOLLOW-UP (A)**: wire `resolveTopicThreads` to live feed messages + click a thread → open it in
      the mailbox; add a deck-peer topic path so multi-mode opens a plank. Needs the running deck to verify.

### Phase B — topic suggestions

- [x] **Suggestion classify/order (pure, tested)** — `analyze/suggestions.ts` `orderSuggestions`:
      drops bulk-majority clusters (`isBulkCluster`), flags person-linked (`isPersonLinked`), sorts
      person-first (stable), dedups by label vs existing. 3 unit tests.
- [x] **`AnalyzeTopics` writes suggestions** — pipeline now returns `topicDrafts` (not materialized);
      the operation computes bulk-thread ids from this run's tags + person emails, calls `orderSuggestions`,
      appends to `mailbox.topicSuggestions` (deduped vs existing Topics + suggestions). `keepTopic` hard
      gate dropped. Output schema `{ tagged, suggestions }`. Builds green.
- [x] **`TopicsArticle` "Suggested" section** — `SuggestionCard` (Accept/Dismiss menu) above the topics;
      Accept → `Obj.make(Topic, …)` + `AnchoredTo` + splice; Dismiss → splice. New translations
      `topics.suggested.title` / `accept` / `dismiss`.
- [x] **Storybook play test** — `Topics.stories.tsx` `SuggestionsTest`: Accept one (→ Topic, suggestion
      gone), Dismiss the other (section gone). 5/5 storybook tests green.
- [x] **Commit** `feat(inbox): opt-in topic suggestions`.

### Phase C — Create Topic from message

- [x] **`enableCreateTopic` gate + menu item** — `MessageStack.tsx`: prop + "Create Topic" tile menu
      item (`ph--stack`) emitting `create-topic`; `MailboxArticle` sets the prop and handles it
      (invokes the op with `{ spaceId }`, then opens the topic via `useShowItem`).
- [x] **`CreateTopicFromMessage` operation** — `analyze/create-topic-from-message.ts`: gathers the
      message's thread (siblings by `deriveThreadId`), `clusterThreads` → one draft, LLM `summary`
      (`resolveModel('summarize-topic')`), persists `Topic` + `AnchoredTo`, returns `{ topicId }`.
      Registered in the handler set; output schema `{ topicId }`. FACT EXTRACTION deferred (follow-up).
- [x] **Storybook play test** — `CreateTopic.stories.tsx` (mock `AiService`): click "Create Topic" →
      operation runs → a Topic card appears. Caught + fixed a missing `{ spaceId }` on the invoke.
- [x] **Commit** `feat(inbox): create topic from message`.
- [ ] **FOLLOW-UP (C)**: run fact extraction on the thread's messages inside the operation (reuse the
      fact stage) once the product fact pipeline is wired.

### Follow-ups (landed)

- [x] **Questions + tasks per topic** — `Topic` gains `questions` / `tasks`; `clusterThreads` rolls
      them up (deduped) from each member thread's `openQuestions` / `actionItems`; `TopicsArticle` shows
      the counts. (Threads carry the fields but aren't populated until thread-level extraction runs, so
      topics inherit whatever the threads have.)
- [x] **Mailbox sync filters** — `Mailbox.syncFilters.skipSenders` (email/domain substrings) + a
      `shouldSkipSender` helper; the Gmail sync `map-to-message` stage drops matching senders before the
      attachment fetch (never committed to the feed). Unit-tested. FOLLOW-UP: a settings/toolbar UI to
      edit the skip list (currently set programmatically on the Mailbox).

## plugin-inbox article surface pattern (ObjectArticleProps)

**Direction (2026-07-14):** converge every inbox folder article on the `ObjectArticleProps<Mailbox>`
pattern — the article receives the mailbox as `subject` and derives its db via `Obj.getDatabase(subject)`,
never a `space` prop (reference: `SubscriptionsArticle`). Folder graph nodes now carry `data: mailbox`
(sentinels dropped), so the plank passes the mailbox as `subject`; surface filters narrow by the node's
trailing path segment + `Mailbox.instanceOf(data.subject)`. Props types live next to the component.

- [x] **`TopicsArticle` → `ObjectArticleProps<Mailbox>`** (secured the pattern) — `subject: mailbox`,
      `db = Obj.getDatabase(mailbox)`, `useQuery` from `@dxos/echo-react` (accepts an `EchoDatabase`;
      `react-client/echo` `useQuery` expects a Space and threw on the raw db). Guards on `db`.
- [x] **`DraftsArticle` → `ObjectArticleProps<Mailbox>`** — same conversion; `useQuery` from echo-react.
- [x] **Graph nodes carry the mailbox** — drafts/topics/subscriptions folder nodes set `data: mailbox`
      (dropped the `MAILBOX_*_NODE_DATA` sentinels + constants); surface filters match
      `Mailbox.instanceOf(data.subject)` + `lastSegment === getXId()`. Folder surfaces precede the generic
      `mailbox` object surface and the plank uses `limit={1}`, so no match collision. `useActiveSpace`
      dropped from `react-surface`.
- [x] **`SubscriptionsArticle` unsubscribe removes on success** — `removeSelected` awaits each
      `UnsubscribeSender`; a returned `{ filtered: true }` adds the sender to a local `removed` set that the
      subscriptions `useMemo` excludes. Needed because `mailbox.messageFilters` is a stable proxy ref
      (contents mutate in place) so the `isFiltered` filter alone never recomputes reactively.
- [x] **Stories/modules updated** — `TopicsModule`, `TopicsArticle.stories`, `CreateTopic.stories` pass
      `subject={mailbox}`. Build/lint/fmt clean; 167 inbox unit tests green.
- [ ] **Pre-existing storybook play-test failures (NOT this change).** `TopicsArticle.stories` "Delete Test"
      and `CreateTopic.stories` "Test" fail identically on the committed baseline (`6dd1aa8a1e`) in this
      headless env — the topic `useQuery` returns empty so no topic card renders (Default + "Suggestions
      Test" pass). Verified by stashing all edits and re-running. Investigate the indexing/timing the topic
      query needs headlessly.

## Topics → plugin-brain / Project refactor (2026-07-14 asks)

**Direction:** promote `Topic` from the inbox stack into a first-class, reusable domain object. The type
moves to `@dxos/types` (Project-style class), the UI moves to `plugin-brain`, and Topics get their own
app-graph subtree (virtual root + a node per Topic) rendered via a regular object/article surface. Longer
term Topic may be renamed `Project` and generalized beyond email (threads, task lists).

- [ ] **track: Fix companions and master/detail for topics.** (`TopicsArticle` → `TopicArticle`
      master/detail; companion vs deck-peer opening across layout modes.)
- [ ] **track: Break `Topic` out into plugin-brain; consider renaming to `Project`; track threads (not
      just email); add a task list, etc.**
- [ ] **track: Reconcile `Project` + `Task`; make a primary "nexus" type that brings together analysis —
      Threads, Contacts, Summaries, Tasks, Agent.** Design captured in `plugin-brain/DESIGN.md`.
- [x] **Audit current `Topic` usages → `plugin-brain/AUDIT.md`** — inventory of every importer + component
      (type def, operations, surfaces, app-graph, stories) + the existing `@dxos/types` `Project` model. (#8)
- [x] **Move `Topic` type → `@dxos/types`, Project-style class** (#6/#7) — class with inline title/label/icon
      annotations + `make` factory; shared `Topic.Props` kept annotation-free (Mailbox serialization
      unchanged); DXN preserved. All ~20 importers moved to `@dxos/types` (`Topic.Topic`/`Topic.Props`), no
      compat shim. DECISION: kept the shared props struct (option A). Type test moved to `@dxos/types`.
      Verified: types/pipeline-email/plugin-inbox builds + tests green (`6f904da7d3`).
- [x] **2A — Move `TopicArticle` → plugin-brain** (#5, part 1) — detail view now in plugin-brain, rendered
      via a regular `AppSurface.object(Article, Topic.Topic)` surface (keyword chips inlined, no inbox `Row`
      dep). Topic schema reg + typename/detail translations moved to BrainPlugin; `./containers` export
      added. Removed from inbox. Builds + inbox(167)/brain(13) tests green (`2b92f80605`). DECISION: suggestions
      stay in inbox (brain TopicsArticle will list accepted Topics only).
- [x] **2B — Topics as a space-level type section (plugin-brain)** — used
      `TypeSection.createTypeSectionExtension(Topic.Topic)` (idiomatic; no new deps) → a per-space Topics
      section (root + a child per Topic, icon/label from the schema annotations), each opening via the
      regular object/article surface (`TopicArticle`). Added the matching nav path resolver; registered in
      BrainPlugin (`fa13dc315e`). Chose the type-section nav over a bespoke mosaic list-panel (consistent
      with Chats/Calendars); a standalone Topics list-panel is optional follow-up.
- [x] **2C — plugin-inbox cleanup** — inbox `TopicsArticle` → `TopicSuggestionsArticle` (suggestions +
      Accept/Dismiss + Analyze only; accepted topics now live in the space-level section). Removed the
      redundant `mailboxTopics` companion; relabeled the mailbox Topics node → "Topic Suggestions"
      (lightbulb). Reworked `CreateTopic` + new `TopicSuggestions` stories. Builds + inbox(167)/brain(13)
      tests + lint + fmt green. Kept a mailbox nav node for suggestions (repurposed, not a companion) —
      full companion-ization is the companions/master-detail track. Headless storybook Topic play-tests
      stay stuck at Loading in this env (pre-existing; CI-green through Phase 1/2A/2B) — verify in CI/app.
- [x] **`TopicArticle` storybook** (#3) — existing `TopicArticle.stories.tsx` now targets the brain
      component (`Default`/`Minimal` render; `Test` hits the known headless topic-query issue). Relocating
      it into a brain-owned stories package is optional polish.

### Nexus Phase 1 — instructions + nav-create + storybooks (2026-07-16)

- [x] **`Topic.instructions` ref (agent config)** — added `instructions: Ref<Obj.Unknown>` to `Topic.Props`
      (untyped to avoid a `types → compute → ai → types` cycle; FLAGGED in Topic.ts + here). The typed
      `Instructions` object is created + linked at the plugin layer.
- [ ] **FLAG: type `Topic.instructions` as `Ref<Instructions>`** — blocked by the layering cycle; needs
      Topic to move to its nexus home (a package that can depend on `@dxos/compute`, below the plugins).
      Deferred with the `Topic`↔`Project` reconciliation.
- [ ] **FactStore ref on Topic — DEFERRED** (no FactStore ECHO type today; per-space registry). Revisit
      with the nexus schema.
- [x] **Create Topic from the nav menu** — plugin-brain `CreateObject` capability (`SpaceCapabilities.CreateObjectEntry`
      for `Topic.Topic`) creates the Topic + an `Instructions` (seeded default brief, drives the agent) and
      links them; wired the `+` action into the Topics type-section (`OpenObjectForm`). Registered via
      `addCreateObjectModule`. Added `@dxos/plugin-space` dep.
- [x] **Storybooks in plugin-brain** — co-located `TopicArticle.stories.tsx` + `FactsCompanion.stories.tsx`
      (contributes a seeded `FactStoreRegistry`); added the `storybook`/`ts-test-storybook` tags,
      `.storybook/main.mts`, `vitest storybook: true`, and story dev-deps. Removed the stories-inbox
      `TopicArticle.stories.tsx`. `Default`/`Minimal` render; `Test` plays hit the known headless
      space/query Loading limitation (CI/real storybook exercise them).

### Nexus Phase 2 — decouple inbox, Topic as ECHO class (2026-07-16)

- [x] **Removed `topicSuggestions` from `Mailbox` + all suggestions functionality from plugin-inbox** —
      dropped the `Mailbox.topicSuggestions` field, `TopicSuggestionsArticle` + its surface, the mailbox
      "Topic Suggestions" folder node + Analyze toolbar action, the `AnalyzeTopics` operation (its only
      output was suggestions), `suggestions.ts` (+ test), the topic-suggestions/analyze translations, and
      the `#topics` progress meter in `MailboxArticle`. `MAILBOX_TOPICS_TYPE`/`getTopicsId` removed. Topics
      are now created via the nav menu (`CreateObject`) and from a message (`CreateTopicFromMessage`).
- [x] **`Topic` → standard ECHO class** — now that nothing imports `Topic.Props`, inlined the struct into
      the `Type.makeObject` class (dropped the separate `Props` export), matching the `Project.ts` standard.
      Builds green across types/pipeline-email/inbox/brain/stories (364 tasks); types(12)/brain(13)/inbox(193)
      tests pass.
- [x] **Top-level Topics virtual node + per-Topic children** — provided by the plugin-brain
      `TypeSection.createTypeSectionExtension(Topic.Topic)` (per-space root node + a child per `Topic`, each
      opening via the object/article `TopicArticle` surface) with the `+` create action. With the inbox
      folder removed, this is now the sole Topics nav presence. (Suppressed when empty; the first Topic is
      created via the space's global create menu — Topic is registered — or the section `+` once ≥1 exists.
      An always-visible bespoke node is an option if wanted.)

## Contact extraction — recipients of sent mail (from object-deduplication 4.5a)

Contact extraction is now an allow-list (`shouldExtractContact`,
`@dxos/extractor-lib/selection.ts`): a sender earns a `Person` only when

1. `signals.outbound === true` — we sent or replied to the address, or
2. its domain matches an `Organization` the space already knows,

and never when the address or message is automated. **Nothing sets `outbound`**, so in practice only
rule 2 fires and a real human who mails you from an unknown domain gets no contact — stricter than
intended, and stricter than the pre-existing "extract every sender" behaviour.

It was left unwired because it is a new code path, not a missing field: extraction reads
`message.sender`, but "we replied to this address" is a fact about a _recipient_. On a sent message
the sender is the mailbox owner, so the people who matter are in `to`/`cc`, and recipients are not
extracted at all today. This belongs here rather than in the dedup project — it is a question about
which correspondents matter, which is what this research stream is about.

- [ ] **Extract recipients of sent mail.** When a message carries the `sent` system tag, build
      contacts from `properties.to` / `properties.cc` (the Gmail mapper already records both).
      Wrinkles: they are raw header strings needing address parsing, and `pipeline-email` is
      provider-agnostic so the sent-tag URI has to arrive as a stage option from `plugin-inbox`.
      Preferred over the alternative below: same coverage, no new index, and it also captures people
      you have mailed who never replied.
- [ ] **Alternative — correspondence check on inbound senders.** Keep extracting only senders, but
      set `outbound` by asking "have we ever sent to this address?". Fits the current shape better,
      but needs an index of sent-to addresses that does not exist.
- [ ] **Decide the default for an unknown human sender** once one of the above lands: allow-list only
      (today), or extract on first reply. Relevant to the sender-type triage in REPORT §5 — the
      person/org classifier is the other input to this decision.

## Bugs

- [ ] **MailboxArticle search/filtering isn't working.** The filter/query editor in
      `plugin-inbox` `MailboxArticle` doesn't filter the message list. Fix the filter wiring;
      follow-up: back search with the Fact index rather than the current query builder.
- [x] **`subject-facts` returned 0 for Nicole.** Fixed: the subject index now matches by
      token-substring over entity slug + label (e.g. `gudmand` ⊂ `ngudmand`) instead of exact slug,
      and reports `exactSlugFacts` so the mismatch is surfaced. (factCount 7 for Nicole.)
- [x] **No-clobber convention.** `LIMIT`-ed iteration runs now write to `results/partial/`, so
      canonical full-feed results are never overwritten. (Restore of `tags`/`summarize-messages`
      full-feed re-runs separately.)

## Analysis

- [x] **Results-analyzer** (`scripts/analyze-results.mjs`) — reads `results/*.json` + `.md` +
      `progress.json`, prints a status table, and flags EMPTY / ERROR / PARTIAL; exits non-zero on
      problems. Wired into `run-suite.mjs`. (Quality scoring is still the separate LLM-judge task.)

## Requested follow-ups

- [x] **Use `@dxos/markdown` `htmlToMarkdown` in `pickBody`** — already satisfied: harness `pickBody`
      (`fixture.ts`) calls `@dxos/markdown` `normalizeText` (turndown), not a regex `stripHtml` (the
      remaining `stripHtml` lives only in the unrelated plugin-feed/plugin-magazine). No change needed.
      Benchmark (`html-to-markdown.bench.test.ts`) confirms it's ~free (99 msgs, ~4.1 ms/msg, HTML→15%).
- [ ] **Summary prompt tweak** — drop the "The email…" preamble, make summaries terser, use bullet
      lists (`summarize-messages` + `summarize-threads`).
- [ ] **New "draft responses" test** — generate draft replies to messages.
- [ ] **Speech-act axis in `@dxos/pipeline-rdf`** — add illocutionary `force`
      (assertive/directive/commissive) + deontic modality (reified `sx:` predicates; reuse `Uu`
      factuality for questions), and reshape `extract-questions` to distinguish **questions/requests
      vs notifications**. Retire the lexical `owes` convention in `pipeline-email/corpus/ledger.ts`.
- [x] **Benchmark native `text/html` vs `text/plain` email input** — `html-vs-text.bench.test.ts`
      (fact extraction, one model, messages carrying both MIME parts). Result (qwen, N=10): the html
      part is 8.08× larger, 2.25× slower, and yields slightly fewer facts (33 vs 36). Prefer the
      native plain part; strip HTML only as fallback (`pickBody` / `body: 'auto'`).
- [x] **Benchmark html→markdown throughput** — `html-to-markdown.bench.test.ts` over `@dxos/markdown`
      `htmlToMarkdown`. Result: 99 msgs, ~4.1 ms/msg, ~9.8M chars/sec, HTML→15% (structured markdown,
      negligible cost).

## Deferred / tracked

- [ ] **Reactive Progress browser panel + EDGE sink** — build the subscribable React panel + EDGE
      sink on the core `@dxos/pipeline` `Progress` service. (Spawned task chip `task_96c8b142`.)
- [ ] **`tags` → `.md`** via `renderResponse` (tags are JSON-only today).
- [ ] **Fix `text/plain` capture bug.** ~7 messages have a degenerate plain block (literal `"False"`)
      — a serialization bug in the ArchiveModule download or the Gmail→Message mapper for messages
      lacking a plain part. Fix upstream so `body: 'plain'` isn't silently empty for them.

## FINDINGS next-steps (`fixtures/local/results/FINDINGS.md`)

- [ ] **LLM-judge scorer** for the brain-vs-rag eval (replace the saturated `subjectMentions`).
- [ ] **Fact→source bridge inside `SummarizeSubject`** (return source message DXNs). The `hybrid`
      skill mode does this; the stock brain op does not.
- [ ] **Sender-scoped retrieval tool** in the Database skill (the gap that sank the haiku baseline).
- [ ] **Prompt-type comparison** — add analytical prompts that play to the fact store's strengths and
      compare per prompt-type (not just "summarize messages from X").

## Process

- [ ] **Submit the PR.** All research-harness work is uncommitted on
      `claude/mailboxsync-feed-export-4feb3d`.

## Done (structure)

- [x] Folded the directive prompt into the owned `plugin-brain/skills/brain.ts` (procedure: call
      SummarizeSubject first, don't give up before both tools empty); removed the `brain-v2` variant.
- [x] `test/` vs `testing/` split: harness (infra) → `src/testing/harness/` (`skills/`, `internal/`,
      `pipelines/` + core); `.test.ts` files stay in `src/test/`.
- [x] `defs.ts` — single source of truth for all env knobs/defaults (`SUBJECT`, models, `LIMIT`,
      fixture/result paths, `SAMPLES`, `SKILL_MODES`, …); every test + harness module reads from it.

## Story UI follow-ups

- [ ] **Convert `Facts.stories.tsx` + `Pipeline.stories.tsx` to the `ModuleContainer` pattern**
      (the TODO in `Facts.stories.tsx:247`). Analysis done — both are single-controller stories, not
      independent-surface layouts: every panel funnels through one crawl/pipeline controller
      (`facts`/`context`/`options`/stats/handlers + the Effect store). Only Pipeline's Objects list is
      space-native (`useQuery`). Faithful conversion needs: (1) brain module infra (`Module` tokens +
      `moduleSurfaces` + `StoryModulesPlugin`, mirroring inbox/assistant), (2) a story-scoped React
      Context carrying the controller that surfaces read (Pipeline's Objects stays a real space
      surface), (3) relax `@dxos/storybook-testing` `ModuleContainer`'s `if (!space)` gate so it renders
      space-lessly for Facts (which has no client/space) — keep `ModuleProps.space` REQUIRED (making it
      optional ripples to all 31 inbox+assistant modules that access `space.db`). Facts still needs the
      plugin-manager decorator (`corePlugins` + `StorybookPlugin` + `StoryModulesPlugin`), just no
      client/space. Runtime paths aren't headlessly verifiable (crawler needs a Discord token;
      pipelines need edge AI creds) — verify build/lint + story render.

## Done

- [x] Phase 1 multi-model pipeline benchmark harness (tags, summaries, contacts, facts, questions) +
      results JSON + `LIMIT`/`MODELS` env knobs; FactStore disk save/load.
- [x] Phase 2/3 agent harness (`runAgentEval`) + `brain` / `brain-v2` / `rag` / `hybrid` skill modes,
      compared in `brain-skill-eval`.
- [x] RAG skill (USearch + ollama `nomic-embed-text`); Fact→source bridge (`hybrid` mode).
- [x] HTML stripped at message load (clean prose for summaries/embeddings/display).
- [x] Incremental sister `.md` per test; relative paths + result arrays in JSON.
- [x] Pipeline `Progress` service + `Stage.track` + `ProgressReporter` sinks + `run-suite.mjs`
      orchestrator (shared `progress.json`, seeded manifest).
- [x] Live progress for the manual-loop tests (`extract-facts`, `html-vs-text`, `brain-vs-rag`) via a
      plain `trackProgress` helper + `onMessage` hooks — every test now reports to `progress.json`.
- [x] MIME body selection: `pickBody` (prefer native `text/plain`, else stripped `text/html`), collapse
      to one clean block at load, and `loadFixtureMessages({ body: 'auto' | 'html' | 'plain' })`.
      Re-based the benchmark as native `text/html` vs `text/plain`.
