# plugin-inbox — Tasks

_Resume: **PR #12555 OPEN** — Phases 0, 1 and 2 all landed in it (22 commits). Next action: Phase 3, starting
with the `useContactLookup` defect. NOTHING IS VERIFIED IN A RUNNING APP — see the storybook blocker
below; the manual test plan (A–F) is written but unrun. Uncommitted: none._

Split out of `packages/stories/stories-brain/TASKS.md` on 2026-08-13: that ledger is the model-ladder /
FINDINGS research harness, this one is the inbox product surface. The ~40 older Topics / FINDINGS /
model-routing items deliberately stayed behind.

**Phases map to PRs.** One phase = one PR. Do not start a phase before its predecessor is open.

Pipeline architecture (the processor-topology target, and the analysis behind it) lives in
[`PIPELINE.md`](PIPELINE.md). Phase 5 below is its work-list.

---

## Phase 0: RecordArticle toolbar + menu (P0) — plugin-space

Not inbox code, but the user's top priority. May warrant its own registry project; decide when opening
the PR.

### Tasks

- [x] **Toolbar + menu for `RecordArticle`** (`plugin-space/src/containers/RecordArticle/RecordArticle.tsx`)
      built on the menu idiom (`MenuBuilder` + `useMenuActions` + `Menu.Root`, threading `attendableId`).
- [x] **Decide how enrich actions are injected** — ANSWERED: graph-contributed actions. The toolbar reads
      the subject's own app-graph node via `graphActions`, so plugin-crm donates `Enrich` for Person /
      Organization without plugin-space depending on it. Matches `ProviderArticle`/`MarkdownArticle`.
      Found en route: the record surface never forwarded `attendableId`, so the toolbar had no node to
      read — fixed. Originally: — the open design question. Candidates: a
      `Capabilities`-contributed action provider keyed by typename (so plugin-crm donates "enrich
      contact"/"enrich organization" without plugin-space depending on it), versus resolving
      `CrmOperation.*` directly. The contributed route matches the cross-plugin capability convention;
      confirm against `list_idioms` before building.
- [x] **Storybook** for the toolbar + menu — the story contributes its OWN action rather than importing
      plugin-crm's, since not depending on plugin-crm is the point of the design. NOT RUN (storybook
      startup blocker).

---

## Phase 1: Inbox surface — folders, archive, contact affordance (IN FLIGHT)

Committed, unpushed. This is the PR to open first.

### Tasks

- [x] **Inbox + Starred virtual folders** (`325ce3a76d`) — mailbox child nodes reusing the existing
      `properties.filter` + `systemTag` path; no new query machinery. `All Mail` took `ph--stack--regular`
      since `Inbox` claims the tray. A dead `inbox.label` key was removed rather than duplicated.
- [x] **Archive / Move to Inbox in the conversation menu** (`3714d50f53`) — one `SystemTags.toggleTag`
      of the `inbox` tag serves both directions; label and icon follow membership.
- [x] **Group archive with delete; close the message view on archive** (`a4ca3a3b94`) — both take a
      message out of the reading flow, so they share a menu section. `onArchived` fires on archive but
      not restore, letting `MessageArticle` close its plank without the component knowing about layout.
- [x] **Archive from the mailbox tile menu** (`92a8f50185`) — membership arrives as an atom family
      beside the starred one, so a tile subscribes only to its own state. `StarredFamily` became an
      alias of the generic `MembershipFamily`.
- [x] **Recipients row: icon + bare addresses** (`9e814ba263`) — the To line moved out of the sender
      column into a detail row (gaining the icon column) and reuses `parseAddressList`, dropping the
      display name that already appears as the tile heading.
- [x] **Conversation avatar contact affordance** (`aca3222ead`) — bare `Avatar` → `ContactAvatar`,
      resolving through `db` (a conversation holds few messages, unlike the virtualized list).
- [x] **ConversationStack story: host `ContactPreview`, seed ~50% of actors as Persons** — the story
      half of the item above, so both resolved and unresolved states are visible.
      DONE. `onContactCreate` now actually adds a Person rather than being a no-op, so the create
      affordance can be exercised. GOTCHA worth remembering: the seeding must derive senders from the
      FEED-scoped query — a bare `space.db.query(Filter.type(Message.Message))` does not see feed
      messages and silently seeds nobody, which would have made the story look correct while testing
      nothing.

### DECIDED

- **Archive is the `inbox` tag coming OFF, never an `archived` tag.** Gmail models INBOX as a label and
  JMAP as a mailbox role, both already mapped in the providers' `sync/system-tags.ts`, so one toggle
  serves both directions and NO filter-complement operator is needed anywhere.
- **Archive is LOCAL-ONLY for now** (syncing tags back to Gmail is P2). A Gmail sync WILL restore an
  archived message. Accepted deliberately — do not re-file this as a bug.

---

## Phase 2: Message actions + enrichment

### Tasks

- [x] **Conversation menu actions** — (a) create a Project from the message
      (`ProjectOperation.CreateTrackingProject`; absorbs the never-built create-project-from-message
      form), (b) ONE composite sender enrichment: `CrmOperation.ResearchPerson`/`ResearchOrganization`
      plus `EnrichImages`. Menu, not hover — the hover variant was dropped in triage.
      SHIPPED: create-Project is plugin-inbox's own (`CreateProjectFromMessage`, which existed with no
      UI). Sender enrichment could NOT be: plugin-crm already depends on plugin-inbox, so the import
      would invert. It arrives through a new `InboxCapabilities.SenderAction` capability mirroring
      `MailboxAction`; plugin-crm contributes research-then-image, run sequentially because the image
      pass reads what the profile step wrote. `createInvocations` returns a LIST so a contributor can
      express a composite without inventing a fused operation, and an empty list omits the menu entry
      (a sender with no linked contact). OPEN: `EnrichImages` is set-scoped (`limit`), not
      subject-scoped, so it enriches whatever is missing an image rather than this sender — a
      subject-scoped variant would be the cleaner call.
- [x] **Gate the Enrich button on configured connections** — gate the CONTRIBUTION in
      `app-graph-builder.ts`, not a disabled button; a disabled primary still reads as the main call to
      action. SHIPPED: a shared `hasConnection(mailbox, get)` helper, extracted from the lookup the sync
      action already did (cursor → Connection by access token), now gates the whole pipeline action set —
      Enrich AND Process, since neither has anything to act on without a connection. NOTE the scope
      question from triage is answered by that: the gate is per action-set, not per button. The existing
      `'no-connections.label'` empty state is NOT yet driven by the same predicate — worth folding
      together if that string ever moves off its current surface.
- [x] **plugin-crm story driving `CrmOperation.EnrichImages`** — the package's first storybook (config,
      deps, moon target). Seed a Person and an Organization with no `image`, render their cards, add a
      button that invokes the operation and shows the result. Establish image-service reachability
      empirically and report it; never fake a result.
      SHIPPED. TWO CORRECTIONS to the assumption above: (1) NO storybook config was needed — the shared
      config already globs `plugins/*/src/**/*.stories.tsx`, so a story file is enough; only devDeps
      (`@dxos/plugin-testing`, `@dxos/plugin-client`, `@dxos/echo-react`, `@storybook/react-vite`) were
      missing. (2) **The image service IS reachable.** Default is `image.main.dxos.network` — DNS
      resolves and HTTPS answers (404 on `/` is just the bare root). A stale
      `TODO: images.dxos.org does not resolve` sat above the constant and was the source of the doubt;
      that host is no longer the default and is the only one that fails DNS. Comment removed.
      The story reports the operation's real result (including `result.error`) rather than faking one.
      NOT RUN: blocked by the storybook startup timeout above, so it is unverified like everything else.
- [x] **Delete `ProcessMailbox`** — the operation, `ResetProcessCursor`, its routine template, cursor
      helpers, tests and translations. Rewrite the "Mailbox pipeline routine" phase in the
      `stories-brain` ledger so it does not keep claiming shipped features. This CLOSES "real stages
      behind the `log-title` seam" — the seam is `ProcessMailbox`.
      DONE, with two things the task description did not anticipate: (1) the cursor helpers are SHARED
      with `ClassifyMailbox`, so they moved to `operations/cursor.ts` rather than being deleted, and
      `findFeedCursor`/`findOrCreateFeedCursor` now REQUIRE an id (the old default silently handed a
      caller the process pipeline's cursor); (2) `ResetProcessCursor` is likewise used by classify, so
      it survives as `ResetFeedCursor` with a required `cursorId` instead of being removed. Also note
      `CrmOperation.ProcessMailbox` is a different operation and was left alone. The `stories-brain`
      phase that documented building it is marked REMOVED.
      CI FALLOUT, caught by the PR and fixed: (a) the `FeedPipeline` "Fixture Test" play test drove the
      deleted operation's `execute` button through run → rerun-0 → reset → run, so it lost its subject;
      it is reduced to asserting the fixture corpus loads. (b) The story's action `useState('process')`
      default pointed at the removed action. (c) Cursor coverage went with `process-mailbox.test.ts`
      even though the HELPERS survived — restored as `operations/cursor.test.ts` (5 tests), which pins
      the property that actually matters: consumer isolation, since one pipeline adopting another's
      cursor silently skips messages.
      NOTE: CI lint fails on WARNINGS; `moon run <pkg>:lint` locally does not. Check the warning count,
      not just the exit code, before pushing.

---

## Phase 3: Fixes + polish

### Tasks

- [x] **Person rows should use the `Row.Person` avatar, not a `ph--user--regular` icon** (requested
      2026-08-13) — everywhere a card row represents a person, the generic user glyph should be the
      standard avatar treatment. Includes the recipients row added this session, the "Related Contacts"
      rows on the Organization card, and any other person row using the icon. `Row.Person` /
      `ContactAvatar` already carry the hover-card + create-contact affordance, so this also makes those
      rows interactive for free.
- [x] **RecordArticle related-objects masonry: drop the x-padding** (requested 2026-08-13) — the cards
      are inset relative to the top card and should line up with it. There is already a
      `TODO(burdon): Fix indentation: left align with top card.` at that spot. May need a `className` or
      an explicit option on `Masonry` if the padding is baked into the component rather than the
      container.
- [x] **Person card related messages: one row per conversation** (requested 2026-08-13) — the section
      currently lists every message, so a single thread fills it with five near-identical "Re: …" rows
      (see the Nicole Gudmand card). Show only the LATEST message per conversation, keyed on the same
      thread id the mailbox conversation view groups by.
- [x] **Related messages show the snippet or summary, not the subject** — `messageDigest` picks the
      derived summary, else the provider snippet, else the subject. Summaries live on a SECOND feed
      (`mailbox.annotations`), so `RelatedToContact` queries it separately and passes a
      `Map<messageId, summary>`; the message feed carries none. Both mail mappers set
      `properties.snippet`, so the middle rung is populated for synced mail before any summarization
      runs. A row with nothing to say is dropped rather than rendered with an empty label. 5 tests.
- [ ] **`useContactLookup` does not resolve** — the one open defect. `InboxStack` gained a `db` prop →
      one `Person` query for the whole list handed to tiles as `getContact`, but every avatar reads as
      unknown in the `Spec` story despite seeded Persons. Suspects: the URI→`EID.tryParse` of a freshly
      added object, or the story's `useQuery` not seeing the seeds. Restore the story's real assertion
      (it currently asserts only that the list renders).
      INVESTIGATION 2026-08-13 — BOTH named suspects are REFUTED, with tests now in the repo:
      (1) `EID.tryParse(Obj.getURI(person).toString())` round-trips for a fresh Person, a flushed one,
      and one read back from a query (`contact-lookup.test.ts`, 3 tests).
      (2) The index itself is correct against a real database — indexes every seeded Person, matches
      case-insensitively, resolves to the right object, skips an address-less Person
      (`contact-index.test.ts`, 4 tests). `buildContactIndex` was extracted to its own module to
      make this testable; a node test cannot import the `.tsx`.
      (3) The `Spec` story DOES pass `knownSenders: 0.5`, so the seeding guard is not short-circuiting.
      What remains is React-level: the story seeds Persons in a `useEffect` after first render, so the
      question is whether `useContactLookup`'s `useQuery` observes them. Confirming that needs the story
      RUNNING, which the storybook startup blocker prevents — so this is parked at the boundary of what
      can be established without it, not abandoned.
      NOTE a related trap found while fixing the ConversationStack story: a bare
      `space.db.query(Filter.type(Message.Message))` does NOT see feed messages, so any seeding derived
      that way silently produces nothing. Worth checking the same in this story's `items`.
- [x] **Avatar not aligned with the actor's name** — HALF was already fixed: the mailbox card wraps
      its avatar in `Card.Block classNames='h-8 items-center'`, matching the name line, with a comment
      explaining that centring over the whole two-line row left it hanging below the name. The
      conversation view still centred against the whole block. Arithmetic before the fix: avatar centre
      at 26px (8px `p-2` + half of 36px), title first line at ~18px (4px `py-1` + half a `text-lg`
      line) — an 8px drop. Now `px-2 py-1 text-lg flex items-center h-[1lh]`, which centres on line one
      whatever the theme sets `text-lg` to, rather than pinning a pixel value.
      NOT VERIFIED VISUALLY (storybook blocker) — reasoned from the box model. Added as manual step E6.
- [ ] **Messages without `threadId` are silently truncated to 4** — DIAGNOSED, needs a decision.
      Not the conversation view: it is `MailboxArticle`'s aggregate. `Aggregate.group('threadId')` puts
      EVERY threadless message into one `null`-key group, and the items aggregate caps that group at
      `MAILBOX_THREAD_PREVIEW_COUNT` (**4**). Line 217 then splits `entry.items` into
      singleton conversations — but only ever the 4 it was given. So a mailbox with >4 threadless
      messages renders 4 and silently drops the rest; `entry.count` knows the true size and is discarded
      on that branch. Capping is right for a real thread (one row, `count` shows the full size) and
      wrong for the null group, which is N unrelated messages each deserving a row.
      REACHABLE: `threadId` is `Schema.optional` and NO plugin-inbox creation site sets one — synced
      Gmail/JMAP mail carries a server-set id, but drafts, transcription and assistant-authored messages
      do not.
      NO CHEAP FIX. `Aggregate.group` takes a plain property name, so `threadId ?? id` is not
      expressible; the items limit is per-aggregate, so it cannot differ for the null group; and
      raising it inflates every real thread's preview payload.
      DECIDED 2026-08-14: extend ECHO's aggregate to accept a COMPUTED GROUP KEY, so the key can be
      `threadId ?? id` and each threadless message becomes its own group — the cap then never bites.
      Fixes every current and future consumer and works on existing data, at the cost of a query-planner
      change in `@dxos/echo` rather than a plugin fix. Rejected: deriving a threadId at write time (does
      not fix existing data) and a second paginated query in the view (merging two sources into one
      ordered list across page boundaries).
- [x] **Open an attachment in its own plank** — `Row.Attachments` is presentational today; needs a click
      handler, the attachment ref resolved to its Blob/object DXN, and a surface for that type.
- [ ] **Mailbox card: rows showing the inbox message count** — NOT as ready as it was filed. Two
      findings: (1) there is NO `cardContent` surface registered for `Mailbox` at all, so this is a new
      surface rather than rows added to an existing card; and (2) the task's own "settle which counts
      earn a row" is an unanswered design question — inbox / starred / important / unread / total are
      all candidates and the card has room for two or three.
      The DATA side is trivial and matches the constraint: `TagIndex.taggedIdsAtom(tagIndex, tagId)`
      already returns a reactive `Atom<readonly EntityId[]>`, so a count is its `.length` — no feed
      scan, exactly as specified. Deliberately not built ahead of the design decision, since an unused
      helper would be dead code.
- [x] **`useCardHover` target-change regression test** — the hook is exported from `Row.tsx` and
      rendered, since the behaviour is a dependency-array property rather than extractable logic.
      Needed `happy-dom` in `react-ui-card`'s vite config (it ran bare node) and
      `@testing-library/react` as a devDep, both matching react-ui's existing setup. 7 tests; the two
      regression cases were mutation-checked — reverting the deps to `[cancel]` fails exactly those
      two and leaves the other five green.

---

## Coverage gap: `useBlobUrl`'s lifecycle (from codecov on PR #12555)

Codecov put the patch at 53.7% — above the project's 48.5%, and most of the miss is React containers
this repo does not unit-test. One entry is worth acting on rather than dismissing:

- [ ] **Test `useBlobUrl`'s resolve/revoke lifecycle** — 4.76% covered (30 missing, 10 partials), the
      largest gap in the patch and the only non-React logic among them. The pure half
      (`getAttachmentKind`) has 6 tests; the EFFECT is untested, and it is where the real risk lives:
      the url must be revoked on unmount, on ref change, AND when resolution lands after unmount — a
      leak that nothing would surface at runtime. Needs a DOM test env; copy the `renderHook` pattern
      from `plugin-markdown/src/hooks/useExtensions.test.tsx`, or the `.browser.test.ts` convention
      `plugin-kanban` uses. Deliberately NOT done at the end of a long session: adding a test
      environment unverified is how the last CI break happened.

## Phase 3b: Known-sender labelling (requested 2026-08-13)

- [x] **Important virtual folder** (`cb32ac6f3b`) — the `important` system tag already existed and both
      providers already mapped it, so this is a node plus a filter like Starred.
- [x] **Mark mail from a known sender `important` during sync** (`63b1dfa097`) — both providers already
      resolve the sender's Person while mapping (to link `message.sender.contact`), so the condition
      costs no extra lookup; when it resolves, the canonical tag joins that message's tag uris.
      FINDING that changed the design: **sync creates no Persons at all.** A diagnostic proved the db
      holds zero after a full run, contradicting the reading of
      `expect(people.length).toBe(senderEmails.size)` in the existing sync test. So this only fires for
      senders known from elsewhere (the avatar action, `ExtractCorrespondents`) — which is exactly the
      stated requirement, but it means first contact and first mail in the same run are never both
      covered. The test seeds the Person explicitly and asserts the NEGATIVE half too: an unknown sender
      must not be marked, or the folder degenerates into everything.
- [x] **Create a Person when the sender's domain matches an Organization** — ALREADY IMPLEMENTED, no
      code needed. `extractor-lib/src/selection.ts:63` is literally this rule:
      `signals.outbound === true || index.lookup(Organization.Organization, { email }) !== undefined`.
      A sender whose domain resolves to a known Organization already passes the extraction gate.
      NOTE: `Organization` has NO email field — only `website` — so "matches" is necessarily domain
      matching, which `identity.ts:84` already does by normalised website domain. The gate runs in
      `ExtractCorrespondents`, NOT during sync, so the behaviour exists but is pipeline-time.
- [x] **Label a sender's existing messages when their contact is created** (`6012926d09`) — the avatar
      path (`ExtractContact`) now also marks everything already received from that address.
      `SystemTags.applyTagToAll` is a SET, not a flip: toggling a batch would untag whichever members
      already carried it, so a re-run would undo the previous one. 4 tests.

### Open, from this work

- [ ] **Same-run contact + mail is never labelled** — sync resolves the sender before any contact for
      them could exist, so the first mail from a new correspondent stays unmarked until either the user
      creates the contact (which now back-labels) or a later sync arrives. Closing it means running
      contact extraction before the mapping stage, or a post-sync labelling pass.

## Phase 3c: Action naming (requested 2026-08-13)

- [x] **`Enrich` was four unrelated things** — two of them primary buttons on adjacent toolbars. The
      mailbox one was not enrichment at all: it runs the extract → classify → summarize cascade, which
      creates objects rather than filling gaps. Renamed: - `InboxOperation.EnrichMailbox` → `ScanMailbox` (op key `enrichMailbox` → `scanMailbox`,
      `createEnrichProgressKey` → `createScanProgressKey`, `#enrich` → `#scan`,
      `DEFAULT_ENRICH_MAILBOX_TIERS` → `DEFAULT_SCAN_MAILBOX_TIERS`, files under `operations/scan/`,
      template `org.dxos.routine.scanMailbox`). **Not** `AnalyzeMailbox` — that name is taken by the
      cascade's own third tier. Safe to rename the op key because its changeset is still pending, so
      no released routine references the old DXN. - CRM record + sender actions → `Research`, matching the `ResearchPerson`/`ResearchOrganization`
      operations they actually invoke, and signalling the outbound web/LLM run that `Enrich` hid. - `Enrich images` → `Find images`. `CrmOperation.EnrichImages` keeps its id — that one really is
      enrichment. - Deleted the dead `view-mode-enriched.menu` key: labels derive from `VIEW_MODES`
      (`html`/`markdown`/`plain`), so nothing could ever resolve it.
- [x] **`create-project-from-message.ts` moved out of `operations/analyze/`** — every subfolder there
      is a cascade tier or extraction family; this is a user-initiated one-off from the message toolbar,
      so it belongs at the top level beside `draft-email.ts` and `unsubscribe-sender.ts`. It is not
      cursored, not spawned by the cascade, and shares no code with `analyze-mailbox.ts`.

### Open, from this work

- [x] **A missing `FactStore` failed the scan cascade instead of skipping the tier** — FIXED in
      Phase 5; see that entry for the reproduction and the uniform-gate reasoning.
- [x] **CORRECTION: `AnalyzeMailbox` does NOT depend on plugin-brain.** An earlier entry claimed brain
      owned it and the operation should follow its owner through a capability seam — false, and there is
      no dependency to invert. `FactStore` and `FactStoreLive` are both from `@dxos/pipeline-rdf`, a
      direct plugin-inbox dependency; brain is not a dependency of inbox in either direction, and several
      core packages provide the layer in their own tests. The operation is correctly placed — inbox owns
      `Mailbox`, everything else it touches is core. Brain contributes four separable things, none of
      them the operation: a FactStore provider layer, the `Analyze` toolbar action, the settings atom,
      and the fact surfaces/template. The only real residue is the runtime gap in the item above.

## Refactor: split Mailbox.ts's helpers into grouped util modules (requested 2026-08-14)

- [ ] **Factor the util functions out of `types/Mailbox.ts` into grouped files under `src/util/`, and
      reconcile with what is already there.** `types/Mailbox.ts` is 671 lines and holds ~26 exported
      helpers alongside the schema; `src/util/` already exists with `util.ts` (338 lines, another ~16
      helpers), `match-filter.ts` and `on-arrival.ts`, so this is a reconciliation rather than a plain
      move. Natural groupings visible in the current file: - **tags** — `tagUri`, `applyTag`, `removeTag`, `buildMessageTagsIndex`, `getTagsForMessage` - **extraction provenance** — `recordExtraction`, `getExtractedObjectIds` - **filtering** — `matchesFilter`, `isFiltered`, `ignoreSender`, `isNoReplyAddress`,
      `isOrgSender`, `isReplyable`, `identityAddresses` (note `util/match-filter.ts` already owns
      adjacent logic — reconcile, do not duplicate) - **annotations / summaries** — `makeSummary`, `findOrCreateAnnotations`, `getSummaryText`,
      `summaryIndex`, `conversationSummary`, `mergeAnnotations` - **subscriptions** — `getUnsubscribeTarget`, `parseUnsubscribe`, `extractBodyUnsubscribe`,
      `getUnsubscribeAffordance`, `deriveSubscriptions`
      `types/Mailbox.ts` should keep only the schema, `instanceOf`, `make` and the type-level exports.
      WATCH: the barrel is `#types` (`export * as Mailbox from './Mailbox'`), so call sites read
      `Mailbox.getSummaryText(...)`. Moving these changes every call site's import — update them all in
      the same change, no compatibility re-exports (see AGENTS.md). `util/index.ts` is a flat
      `export *`, so grouped files must not collide on names.

---

## Phase 4: Summarization

### Tasks

- [ ] **Whole-conversation summarization** — three parts in order: thread-scoped input to
      `SummarizeMailbox`; `dx-anchor` DXN links to referenced entities; task extraction rendered as a
      markdown task list.
- [ ] **Investor-log LLM summaries live** — the `summarize: true` path is implemented and degrades to
      the deterministic form.

---

## BLOCKER: storybook startup times out for a COLD BROWSER PROFILE (diagnosed 2026-08-13)

Every plugin-manager story dies with `Startup timed out after 30000ms` (`useApp.tsx:236`) when driven
from an automation browser — including `SpaceHomeArticle`, which nothing on this branch touches, so it
is NOT a regression from this work.

DIAGNOSIS CORRECTED. The original entry blamed the worktree (vite dep graph, better-sqlite3 under this
worktree's `node_modules`) and suggested comparing against the user's :9009. That comparison was run
and ruled the worktree out:

- **:9009 IS this worktree.** `ps` shows the server running from
  `.claude/worktrees/suspicious-wilson-a54e74/tools/storybook-react/...`, so it already serves this
  branch's code from these `node_modules`.
- **The same stories render for the user on :9009**, but time out on :9009 when driven from the
  automation browser. Same server, same code, same port — different browser profile.
- Console confirms the cost in both: `slow AM open {duration: 5007ms}` plus a >5s
  "Finding properties for a space".

So the variable is a COLD profile: an empty OPFS pays a full ECHO init that the fixed 30s plugin
startup budget cannot absorb. Reloading to warm it did not help within ~40s. Reducing a story's seed
count 100 → 8 did not help either, consistent with seeding never being the bottleneck.

Consequence: **the manual test plan below cannot be executed from an automation browser.** It CAN be
executed by the user in their own (warm) browser, which is how it was meant to be walked. Everything on
this branch is otherwise verified by build, lint and unit tests only — with one exception, F1 (the Row
story star), confirmed headlessly before this appeared; headless DOM assertions are not the same as
seeing a surface render.

Next steps: (1) the user walks the plan in their warm browser — no code change needed; or (2) raise the
budget at `useApp.tsx:236`, which is arguably a real bug rather than a test-harness quirk, since a
first-run user with an empty OPFS hits exactly this. Same family as the tracked story-invoker wedge and
the 20s index-query timeouts.

## Phase 5: Processor topology (design agreed 2026-08-13)

Design + full analysis: [`PIPELINE.md`](PIPELINE.md). Decisions settled with the user: capability
contribution (not an Effect service), Kafka-Streams naming (`Processor` / `Topology`, since
`Pipeline` and `Stage` are taken by `@dxos/pipeline` at a finer granularity), a DAG for ordering so
it can be surfaced to the user for reordering via tooling, failure policy derived from the DAG, and
generalize now with mailbox as instance #1.

### Tasks

- [x] **Uniform precondition gate** — REPRODUCED FIRST, then fixed. The failing test confirmed the
      inference exactly: `ServiceNotAvailable: Service not available: @dxos/pipeline-rdf/FactStore` →
      `completed: 2, failed: 1, skipped: 0`. `unmetPrecondition` (new `operations/precondition.ts`)
      now recognises any `ServiceNotAvailableError` and reports `skipped` with the tag named; the two
      AI flavours keep their own wording, since users experience "the assistant is not up" as one
      thing rather than a missing tag. Uniform over the tag rather than per-stage: the soft set is not
      a property of the stage, it is whatever the deployment did not contribute, and `Database`/`Trace`
      cannot be missing (the cascade could not have spawned). Matched structurally with a message
      fallback, not by class — the error is flattened crossing the invocation boundary, which is why
      `ai-gate.ts` was already written that way. 7 tests; the workaround at `scan-mailbox.test.ts:166`
      is gone and that test now exercises BOTH precondition flavours in one run, each tier naming its
      own reason instead of inheriting the first one's.
- [x] **Tag `AnalyzeMailbox`'s cursor with an explicit id** — `ANALYZE_CURSOR_KEY_ID`, via a new
      `findOrCreateAnalyzeCursor` in `operations/cursor.ts`; the ad-hoc finder inside
      `analyze-mailbox.ts` is gone, so all cursor identity now lives in one module. The **adoption**
      is the part that makes it shippable: a legacy untagged cursor is tagged IN PLACE rather than
      replaced, since creating a fresh one would re-analyze the whole feed at one LLM call per
      message. 4 tests, and the adoption branch was mutation-checked — stubbing it out fails exactly
      the two tests that cover it, so neither is vacuous. `analyze-mailbox.test.ts` seeds untagged
      cursors and still passes, which exercises the migration path in situ. Delete the adoption branch
      once no untagged cursors remain in the wild.
- [x] **`MailboxProcessor` capability + topology resolution** — `ScanMailbox` now reads its passes
      from `InboxCapabilities.MailboxProcessor` and orders them by the `after` edges each declares.
      plugin-inbox contributes its own five through the SAME seam (`capabilities/mailbox-processors.ts`),
      so there is no privileged built-in path to drift from the contributed one. - `operations/topology.ts` is pure and ECHO-free: unknown `after` ids ignored (optional
      dependency whose plugin is absent), duplicate ids keep the first (ids are cursor tags, so
      sharing one shares a watermark), a cycle excludes only what it blocks and every member names
      the whole cycle. Ties resolve to contribution order — a topology that reshuffled between runs
      would make cursor behaviour irreproducible. 10 tests. - FEASIBILITY CHECKED FIRST: `Capability.Service` really is reachable from an operation —
      `process-manager-capability.ts:138` provides it explicitly "so that operations declaring
      `services: [Capability.Service]` (and friends)" resolve, including the routine/trigger path. - GOTCHA that cost a cycle: providing `Capability.Service` via `Effect.provideService` on the
      test effect does NOT work. The operation runtime resolves declared services through the
      `ServiceResolver`, not the caller's Effect context, so it must go through
      `AssistantTestLayer`'s `extraServices` (precedent: `plugin-tldraw/src/variant.test.ts:30`). - `stages[].operation` → `stages[].processor`, carrying the processor id rather than the
      operation DXN. Free to rename because the cascade's changeset is still pending. - `MAILBOX_TIER_ORDER` deleted — a tier selects WHICH processors run, the edges decide order. - 2 tests cover the seam itself: a third-party processor contributed FIRST but declared
      `after: ['subscriptions']` runs last (so ordering is the topology, not contribution order), and
      a contributor shipping a cycle costs only itself while everything else still runs.
- [x] **Ownership move, part 1 (D5a)** — plugin-brain now contributes the `analyze` PROCESSOR
      (`capabilities/mailbox-processor.ts`) alongside the `FactStore` layer it needs, so a deployment
      without brain has no analyze pass rather than one that dies resolving a service nobody provided:
      the missing-`FactStore` case is now structurally impossible, with the uniform gate as backstop.
      plugin-crm's cursored pipeline became the `crm` processor declared `after: ['contacts']`,
      consuming inbox's contact extraction instead of competing with it. Both menu items are gone;
      `Find images` stays, being space-wide rather than a feed pass. The scan tests declare their own
      analyze processor now — contributing it WITHOUT a FactStore is precisely the misconfiguration
      the gate absorbs, so the test exercises the mechanism instead of a real accident.
- [x] **Ownership move, part 2 (D5b)** — the `AnalyzeMailbox` DEFINITION moved to `BrainOperation`,
      changing its DXN. That key was RELEASED (landed 2026-07-10 in #12153), so a routine bound to
      `org.dxos.plugin.inbox.operation.analyzeMailbox` is orphaned — accepted deliberately, pre-1.0.
      The handler, its test, and the page-size constant moved with it; brain gained `@dxos/pipeline-email`
      and `@dxos/link`. `createAnalyzeProgressKey` STAYED in inbox: every monitor key on a mailbox must
      be minted the same way or producer and article compute different names and no meter appears. The
      feed-cursor helpers are now exported from `@dxos/plugin-inbox/operations`, since a contributed
      processor keeps its cursor on a feed inbox owns.
      MISTAKE WORTH REMEMBERING: `pnpm add --save-catalog` for the two new deps pinned brain to the
      PUBLISHED `@dxos/pipeline-rdf@0.11.1`, not the workspace source, which surfaced as duplicate-type
      errors. In-repo `@dxos` packages take `workspace:*` — the catalog is for external packages only.
      DID NOT drop `@dxos/pipeline-rdf` from plugin-inbox: `GenerateReply` also declares `FactStore`
      and is also handled by brain, so the dependency needs that operation to move too — see below.
- [x] **Move `GenerateReply` to plugin-brain — plugin-inbox no longer depends on `@dxos/pipeline-rdf`.**
      Could NOT move wholesale: two inbox containers (`MessageArticle`, `EditMessageArticle`) invoke it
      directly, so relocating the operation would have inverted the plugin dependency. It goes through
      a new `InboxCapabilities.ReplyGenerator` typed against a shared `types/ReplyGeneration.ts`
      contract — the `MailSendOperation` pattern, where inbox owns the contract and a provider
      contributes an operation matching it. Its DXN changed with the move, same acceptance as
      `AnalyzeMailbox`. IMPROVEMENT that fell out: the AI-reply affordance is now ABSENT when no
      generator is contributed, where before it was offered and would fail — `canGenerate` and
      `onAiReply` are both gated on the contribution.
- [x] **Failure policy from the DAG edges** (D4) — `Topology.descendants` walks the transitive closure
      of a failed processor and the cascade blocks exactly that set, naming the upstream in each
      reason. Independent branches run: `subscriptions` declares no edge to `classify`, so a
      classification failure no longer strands it for merely sitting later in the list.
      SEMANTIC PINNED BY TEST: a `tiers` filter DROPS the edges that ran through a filtered-out
      processor. Selecting `['deterministic','classify','analyze']` leaves `analyze`'s
      `after: ['summarize']` pointing at an absent node, so it is ignored and `analyze` runs despite the
      classification failure. Sharp but correct — a processor the caller excluded cannot constrain
      anything, and `analyze` never consumed classification. 6 topology tests + 2 cascade tests.
- [ ] **DEFERRED TO D6 — the plugin-projects trio as processors.** They read `mailbox.feed`, but all
      three take BOTH a `project` and a `mailbox` ref, and `createInvocation(mailbox, options)` has no
      slot for a Project and returns ONE invocation rather than a list. The blocking problem is cursor
      identity: a processor's id IS its cursor tag, but these need per-(processor, project) — one
      `projects` tag across three projects on a mailbox means they share a watermark and silently skip
      each other, the same class of bug as the untagged analysis cursor.
      DECIDED 2026-08-14: do not decide this in isolation. D6 has to answer "what is the subject of a
      pass" regardless, and fan-out plus composite cursor keys are better settled with that context.
- [ ] **Generalize off `Mailbox`** to a feed-generic processor host (D6) — WEAKER than first written.
      The parts that matter are already generic (`topology.ts` knows only `{id, after}`,
      `precondition.ts` only `Cause`s, a feed cursor's `target` is already untyped). Mailbox-typed:
      the `MailboxProcessor` subject and `tier`, `ScanMailbox`'s input and progress key, and
      `findOrCreateFeedCursor` (takes a `Mailbox` only to read `mailbox.feed`). Open question is what
      replaces the subject — structural `{ feed: Ref<Feed> }`, a `FeedOwner` annotation, or passing the
      `Feed`. CORRECTION: the projects trio was cited as the second instance and is not (see above);
      the only genuine one is transcription, whose `messageEnricher` is a WRITE-time seam closer to
      sync's inline stages than to a cursored read-time pass — so it may want the other half's shape.
- [ ] **Retire `ExtractMailbox` once on-arrival extraction is restored** — it is `@deprecated`, but
      still LIVE: `MailboxArticle.tsx:584` → `useMailboxExtractorActions` renders a menu item per
      registered `ObjectExtractor` and invokes it, and two extractors ship. Its stated successor
      (`onArrivalExtractors`) is commented OUT of the sync chain because it reaches
      `Capability.Service` and invokes `ExtractMessage`, neither available off-host under edge compute
      — so removing it now would delete a working feature with nothing behind it. Remove the operation,
      the hook and the menu items together once the successor runs as a processor (D6). MEANWHILE the
      `@deprecated` tag is misleading, since it points at a replacement that does not run.
- [ ] **Give a cursor to the consumers that should have one** — NOT all seven, correcting the earlier
      entry. Checked each: `ExtractSubscriptions` must NOT get one (it replaces derived state
      wholesale, so it has to see every message; a cursor would corrupt the aggregate).
      `SummarizeMailbox` already skips by newest-thread-id, so adding feed position risks double-skip.
      `ExtractCorrespondents` is the clear win — it re-derives over the whole feed every run and the
      identity index already makes it idempotent, so a cursor is pure saving. The projects trio is
      blocked on the item above. Real scope: ONE, maybe two.
- [ ] **Retire `ExtractMailbox` once on-arrival extraction is restored** — it is `@deprecated`, but
      still LIVE: `MailboxArticle.tsx:584` → `useMailboxExtractorActions` renders a menu item per
      registered `ObjectExtractor` and invokes it, and two extractors ship. Its stated successor
      (`onArrivalExtractors`) is commented OUT of the sync chain because it reaches
      `Capability.Service` and invokes `ExtractMessage`, neither available off-host under edge compute
      — so removing it now would delete a working feature with nothing behind it. Remove the operation,
      the hook and the menu items together once the successor runs as a processor (D6). MEANWHILE the
      `@deprecated` tag is misleading, since it points at a replacement that does not run.
- [ ] **Give the seven cursorless consumers a cursor** — mechanical now that a processor id is also its
      cursor tag, but each needs its own call on whether feed position or derived-state replacement is
      the right idempotency story (`ExtractSubscriptions` replaces wholesale; `SummarizeMailbox` skips
      by newest thread id).

---

## Manual test plan

Moved to [`TESTING.md`](TESTING.md) — 26 steps across sections A–F, none run.
See the blocker above for why an automation browser cannot execute them and a warm browser can.
