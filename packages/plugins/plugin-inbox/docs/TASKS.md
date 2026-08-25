# plugin-inbox — Tasks

_Resume: **#12555, #12574, #12575, #12577, #12605, #12612, #12613 and #12621 all MERGED.** No PR is
open for this work-stream; the next piece starts from a clean base.

**D6 is BUILT, and was not the thing it was named after.** Framed as "generalize off `Mailbox`" it had
no second consumer and every costing said wait. The real defect was that `findOrCreateFeedCursor` took
ONE object playing two roles — the feed's OWNER and the cursor's SUBJECT. `isConsumerCursor` matched on
`(feed, tag)` and ignored `spec.target`, which was the entirety of the "cursor identity" problem this
ledger called blocking and specified a composite key for: the write side already stored the target and
the predicate was missing a conjunct. `createInvocation` became `createInvocations`, so a processor
covers N subjects. First consumer: `syncProjectTasks`, one cursor per Project over a shared mailbox
feed. No `Ref.byAnnotation`, no generic feed host, no change to `AnalyzeMailbox`'s input.

**The projects-trio entry here was also wrong.** They were filed as needing fan-out; they ALREADY fan
out, through per-project routines. What they lacked was cursors — and only one of the three should have
one, since the other two regenerate their document from the whole feed.

**New:** [`PIPELINE-AUDIT.md`](PIPELINE-AUDIT.md) indexes all 24 pipelines and operations against their
tests and storybooks. Its headline finding drives the next work: **nothing drives Sync → Analyze →
Research end to end** — the cascade is tested with STUB operations while the real passes are tested
WITHOUT the cascade. `FeedPipeline.stories` is now `MailboxAnalyze.stories`; it already is a workbench,
and the gap is the JOIN with `MailboxSync`.

**Unresolved:** CodeRabbit's Major on #12605 — moving provider operations changed released DXNs, so
existing triggers bound to the old keys will not resolve. Mechanism verified; consistent with the
pre-1.0 trade accepted twice before and declared in the changeset, but a real user-visible break
awaiting a human call. The mailbox empty-panel flicker's root cause is still unknown (`Deferred` masks
it), the CRM research agent has never been observed running, and **nothing from this session has been
seen in a running app**._

Registry project: **`mailbox-pipeline`** (renamed from `inbox-surface` 2026-08-14 — the work outgrew
the name; it is now the pipeline architecture as much as the surface over it).

Split out of `packages/stories/stories-brain/docs/TASKS.md` on 2026-08-13: that ledger is the model-ladder /
FINDINGS research harness, this one is the mailbox pipeline and its surface. The ~40 older Topics /
FINDINGS / model-routing items deliberately stayed behind.

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
  archived message. Accepted deliberately — do not re-file this as a bug. **Superseded 2026-08-15** by
  Phase 6 below, which closes the P2 — see [`TAG-SYNC.md`](TAG-SYNC.md).

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
      CI FALLOUT, caught by the PR and fixed: (a) the `MailboxAnalyze` "Fixture Test" play test drove the
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

- [ ] **Conversation star state should be the OR across the thread, and read-only** (reported
      2026-08-15). A conversation whose FIRST message is starred appears in the Starred folder, but the
      conversation header shows no star — the header reads membership from one message while the folder
      query matches any. Decided direction: in `MailboxArticle` the conversation star is the logical OR
      of every message in the thread and is READ-ONLY, or alternatively render a star per message.
      Toggling one aggregate star cannot express which message it belongs to, which is why it stops
      being a control.

- [ ] **Filtered mailbox results float instead of anchoring to the top** (reported 2026-08-15, with a
      screenshot). With a filter applied in the mailbox toolbar (`# inbox patrick`), the two matching
      conversations render roughly a third of the way down the pane with a large empty band above
      them, rather than sitting at the top of the list as they do unfiltered.
      Start at `components/InboxStack/InboxStack.tsx` and the scroll container in
      `containers/MailboxArticle`. Two candidates worth separating before fixing: (a) the virtualizer
      or scroll container keeping the offset/spacer sizing of the UNFILTERED list, so the shortened
      result set paints at the old scroll position — expect it to correct itself on scroll or resize,
      which would confirm it; (b) a centring layout rule (`place-items-center` / `items-center`) that
      only becomes visible once the content no longer fills the viewport. (a) is the more likely and
      the more serious: it would mean any filter that shrinks the list leaves dead space.

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
- [x] **Messages without `threadId` are silently truncated to 4** — FIXED in ECHO + the view (PR #12574),
      but see the follow-on blocker below: the symptom was never observable, because such messages never
      reach the mailbox query at all.
      `Aggregate.group` now takes a fallback chain — `Aggregate.group({ coalesce: ['threadId', 'id'] })`,
      where `id` resolves to the entity id — so each threadless message forms its own group and the
      preview cap cannot truncate a pool of unrelated messages. The null-group split in `MailboxArticle`
      is gone. AST breaking change: a `group` entry carries `properties` (a non-empty chain) instead of
      `property`.
- [ ] **Threadless messages never reach the list at all** — the real blocker, found while fixing the
      above. `buildThreadSemiJoin` (`containers/MailboxArticle/mailbox-search.ts`) wraps every view
      filter in `Filter.type(Message, { threadId: Filter.in(matches.project('threadId')) })`, which a
      message with no `threadId` can never satisfy — in conversation AND flat mode. Measured with the
      `GroupedWithoutThreads` story (`threads: 0`, 20 messages): **0 tiles**, before and after the
      grouping fix (verified by reverting the fix and re-running). That story is checked in as a
      documented empty render and turns green — 20 rows — once this is fixed.
      FIX DIRECTION: union the semi-join with the directly-matching messages, so a threadless match
      stands in for its own thread. Care needed with the outer `.from(scopes)` (the subquery's scope
      differs from the outer one) and with paging over the union.
- [x] **Messages without `threadId` — original diagnosis** (kept for context).
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
      creates objects rather than filling gaps. Renamed: - `InboxOperation.EnrichMailbox` → `ScanMailbox`, and then **→ `AnalyzeMailbox` on 2026-08-15**
      (final state: op key `analyzeMailbox`, `createAnalyzeProgressKey` → `#analyze`,
      `DEFAULT_ANALYZE_MAILBOX_TIERS`, files under `operations/analyze/`, template
      `org.dxos.routine.analyzeMailbox`, toolbar label "Analyze"). `Scan` was chosen first precisely
      to avoid `AnalyzeMailbox`, which the cascade's own third tier already used — the second rename
      accepted that collision deliberately, taking `#analyze` for the cascade and moving the brain
      fact pass to `createFactsProgressKey` → `#facts`. Processor ids and `MailboxTier` values were
      NOT renamed: an id doubles as its feed cursor tag, and tiers appear in persisted routine input.
      Safe to rename the op key because its changeset is still pending, so no released routine
      references the old DXN. - CRM record + sender actions → `Research`, matching the `ResearchPerson`/`ResearchOrganization`
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

## Messages without a `threadId` (from PR #12574)

Drafts, transcriptions and assistant-authored messages carry no `threadId` (`Schema.optional` on
`Message`, and no plugin-inbox creation site sets one); only synced Gmail/JMAP mail has a
server-assigned id.

### Tasks

- [x] Conversation grouping keys on `threadId ?? id` — `Aggregate.group({ coalesce: [...] })`, added
      to `@dxos/echo` for this (AST `group` entries now carry a `properties` fallback chain; `id`
      resolves to the entity id). Each threadless message forms its own group, so the `items` preview
      cap (`MAILBOX_THREAD_PREVIEW_COUNT` = 4) can no longer truncate a pool of unrelated messages.
      Removed the null-group split in `MailboxArticle.tsx`.
- [x] **Threadless messages never reach the list at all** — FIXED. `buildThreadSemiJoin` now returns
      `Query.all(wholeThreads, Query.select(viewFilter))`: the semi-join arm still expands a match to
      its whole thread, and the direct-match arm carries the threadless messages that
      `threadId IN (…)` can never admit (they have no id to be found by and project nothing into the
      subquery). The second arm is deliberately unscoped so the caller's own `.from(scopes)` applies to
      it, while the subquery keeps its separate `matchesScope`. `Query.all` gained a typed overload in
      `@dxos/echo` so the union stays a `Query<Message>` rather than needing a cast at the call site.
      Covered by three live-DB tests (threadless reaches the list; not duplicated; a threaded message
      matching both arms returns once).

---

## Phase 4: Summarization

### Tasks

- [ ] **Whole-conversation summarization** — three parts in order: thread-scoped input to
      `SummarizeMailbox`; `dx-anchor` DXN links to referenced entities; task extraction rendered as a
      markdown task list.
- [ ] **Investor-log LLM summaries live** — the `summarize: true` path is implemented and degrades to
      the deterministic form.

---

## Analyze pipeline: compose it from the existing stages (tracked 2026-08-14)

_"Enhance" meant the SECOND PHASE, settled 2026-08-15: it is now `AnalyzeMailbox`, and the naming
question below is closed._

### Tasks

- [ ] **Assemble the Analyze cascade out of the stages already written**, rather than new ad-hoc
      logic. What exists today: `pipeline-email`'s `summarizeStage`, `extractContactsStage`,
      `statsStage` and `extractFactsStage`, assembled by `EmailPipeline.run`
      ([`pipeline.ts`](../../../core/compute/pipeline-email/src/pipeline.ts)); plugin-inbox's own
      `on-arrival-extractors` stage ([`on-arrival.ts`](../src/util/on-arrival.ts)); and the
      `EmailFactPipeline` / topics variants alongside them. Note PIPELINE.md's count: only six of the
      twelve pipelines have an internal stage chain at all, so this is as much about giving the plain
      loops one as about reusing what exists.

---

## Tracked 2026-08-15

Raised while driving the live mailbox. Grouped by owner, since half of these are not plugin-inbox's.

### plugin-inbox

- [x] **Analyze icon → sparkle, via a constant AND a button preset** (2026-08-15). The framing needed
      correcting: an AI action is DATA far more often than it is a button — 18 of the 21 sparkle uses
      are an operation's `meta.icon` or a graph action's `properties.icon`, both plain strings that no
      React component can constrain. So the mechanism is `AI_ACTION_ICON` in `@dxos/ui-types`
      (React-free, so an operation definition can import it without pulling UI into a headless module),
      with `SystemIconButton.Ai` sourcing the same constant for the 3 button call sites.
      Analyze now uses it at all three of its sites, plus the two adjacent plugin-inbox uses whose
      package already depended on `ui-types`.
      LEFT DELIBERATELY: 13 literals across 10 packages. Converting each needs a new `ui-types`
      dependency on that package — a poor trade for an icon string. The constant is there for new code
      and for anyone already editing those files.
      Original entry: **Analyze icon → sparkle, via `SystemIconButton`.** The toolbar action uses
      `ph--stack-simple--regular` (and `ph--stop--regular` while running); plugin-crm's Research
      already uses sparkle for the same "run AI over this subject" meaning. Promote it to the
      `SystemIconButton` primitive and apply it wherever an AI/agent action is offered — today each
      action sets a raw `icon` string in its graph properties, so nothing enforces the convention.
- [x] **Sync message tags back to Gmail** — OFF THIS LEDGER, owned by
      [#12611](https://github.com/dxos/dxos/pull/12611). **The write path is still unbuilt**: that PR is
      open and design-only (`docs/TAG-SYNC.md` plus a Phase 6 entry), so a Gmail sync still restores an
      archived message. Ticked here because the work is tracked there, not because it works.
      Original entry: designed in
      [#12611](https://github.com/dxos/dxos/pull/12611) (branch `claude/mailbox-tag-sync-89f351`),
      which adds `docs/TAG-SYNC.md` and a Phase 6 entry to THIS file. Design-only so far; the write
      path is still unbuilt. Do not start it here. **That PR and this branch both edit this ledger, so
      whichever lands second must merge the two sections by hand rather than take either wholesale.**
      Original scope below. Tag changes are
      local-only; a Gmail sync restores an archived message. `system-tags.ts` maps a Gmail label id →
      canonical `SystemTag` on READ, and its own doc notes some labels are read-only concepts (there
      is no archive label — archive is derived as "not in INBOX"). The write path does not exist.
      Scope: which tags are writable (archive = `INBOX` off → `labels.modify`; starred → `STARRED`;
      user tags need Gmail labels resolved by name), where it lives (Gmail-specific, so plugin-google
      through a seam plugin-inbox owns, mirroring `MailSendOperation`; JMAP needs the same seam with
      roles rather than labels), conflict handling between local and remote edits, and its own notion
      of "not yet pushed" — the tag index is space-side while messages are feed-side. The
      `gmail.modify` scope is already requested, so no OAuth change.

### compute-runtime — filed as [#12608](https://github.com/dxos/dxos/issues/12608) (dmaretskyi)

- [ ] **Bound the feed-trigger query by its cursor.** `trigger-dispatcher.ts:645` scans the whole feed
      every tick (`Filter.everything()`, then cursor-filtered in JS — the existing `TODO(dmaretskyi)`).
      Measured on a live 538-message mailbox: ~1069ms per scan, 924ms of it one unbroken main-thread
      block, ~23% of the main thread sustained on an idle settings page. Polling once a minute made it
      60× rarer, not cheaper. Related: `invokeScheduledTriggers` defaults to
      `['timer','feed','subscription']`, but only `timer` needs a wall clock.

### plugin-space / react-ui

- [x] **Type filter for Related Objects** — landed as [#12613](https://github.com/dxos/dxos/pull/12613).
      Also extracted `RelatedObjectCard` out of `RecordArticle`, which is why the `CardIconSlot` fix for
      related tiles was already present by the time the follow-up PR went to re-apply it.
- [x] **Object avatars in cards** — delivered by the `AppSurface.CardIcon` seam rather than by making
      `ObjectAvatar` every card's default: the type glyph stays the default at all hosts and `Person`
      alone contributes its photo-then-initials treatment. The remaining story/test coverage is its own
      item, not this one.
- [x] **A card header's depiction is now contributable per type** (`AppSurface.CardIcon`). Raised as
      "the avatar colour is wrong" — every person rendered on the same grey disc, because
      `ObjectAvatar` preferred the type's declared hue and both `Person` and `Organization` declare
      `hue: 'neutral'`. Flipping that precedence globally was the WRONG fix: the treatment belongs to
      Person cards, not to every object.
      DECIDED: a role-scoped Surface, not a type annotation. How an object is depicted depends on the
      space it gets — a 6-unit card block affords initials or a photograph, a 16px navtree row does
      not — so an annotation would state one fact for surfaces that legitimately disagree, whereas
      `CardIcon` says how a type looks IN A CARD and nothing more. Non-card surfaces keep resolving
      `IconAnnotation` via `Obj.getIcon`.
      Shipped: the role token; `CardIconSlot` (pairs `Surface.useIsAvailable` with the host's own
      default as children — unlike `CardContent`, a miss cannot render nothing, and `Surface`'s
      `fallback` is the error boundary); `ObjectAvatar`'s `initialsHue` prop (`'type'` default, so no
      existing caller changed); `PersonCardIcon` contributed for `Person` alone; four hosts wired
      (`TypeArticle`, `RecordArticle`, plugin-projects `ObjectCard`, plugin-deck `Popover`).
      LEFT OPEN: `PersonCard` still renders the same photo again as a square row in the body, so a
      Person with a picture now shows it twice. A design call, not a defect — decide and act.
- [ ] **Icons fall back to the dashed placeholder for lazily-activated types.** A Routine and a
      Markdown document both render `ph--circle-dashed--regular` in the navtree and plank header. Both
      types DO declare `IconAnnotation` (`ph--lightning--regular`, `ph--text-aa--regular`), so this is
      resolution, not declaration: `getIcon` returns `undefined` when `getSchema(entity)` is null
      ([`annotations.ts:650`](../../../core/echo/echo/src/internal/Annotation/annotations.ts)), which is
      indistinguishable from "no icon". Eleven call sites share that fallback, so one fix covers them.

### devtools

- [ ] **Filter the trace panel.** It lists every operation including 2ms UI ones, burying the ones that
      matter, and renders the full event JSON inline with `meta` repeated per event. Composer is
      noticeably slow after triggering Research and opening the panel. Two problems: what is listed
      (a duration threshold is not enough — Research person is 55ms and matters, Expose is 27ms and
      does not) and what it renders (collapse, virtualize, hoist the per-span constant meta). Measure
      before fixing: it may be the panel, the trace volume Research produces, or both.

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
      `ai-gate.ts` was already written that way. 7 tests; the workaround at `analyze-mailbox.test.ts:166`
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
- [x] **`MailboxProcessor` capability + topology resolution** — `AnalyzeMailbox` now reads its passes
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
      `org.dxos.operation.inbox.analyzeMailbox` is orphaned — accepted deliberately, pre-1.0.
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
- [x] **RESOLVED 2026-08-15 — the plugin-projects trio, and the entry above was wrong about them.**
      They were filed as needing fan-out. They ALREADY fan out: `CreateTrackingProject` gives each
      tracking Project its own routine and trigger with per-project senders, so the fan-out arrives
      through the routine layer rather than the processor seam. What they actually lacked was cursors
      — every run re-queried the whole feed.
      And only ONE of the three should have one. `syncProjectTasks` upserts tasks keyed by message id,
      so a cursor is pure saving; it now keeps one per Project (subject = the Project, source = the
      mailbox's feed). `update-travel-log` and `update-investor-log` REGENERATE their document from the
      whole feed — travel-log's own comment says it is "idempotent without a cursor" — so a cursor would
      corrupt what they derive. Same call, same reasoning, as `ExtractSubscriptions`.
      Converting them to contributed processors was NOT done: it would buy only the cascade's ordering
      and failure semantics, which nothing has asked for, and would cost them their independent
      triggers.
- [ ] **Generalize off `Mailbox`** to a feed-generic processor host (D6) — WEAKER than first written,
      and NEEDS A DECISION BEFORE ANY MORE CODE. - DONE (2026-08-14): the cursor layer. `findFeedCursor`/`findOrCreateFeedCursor` now take any
      `FeedAnnotation`-carrying owner and resolve the feed via `getFeedRef`, so one of the three
      mailbox-typed couplings is gone. Tested against a Calendar owner. - STILL MAILBOX-TYPED: the `MailboxProcessor` subject and `tier`, and `AnalyzeMailbox`'s input and
      progress key. Already generic: `topology.ts` (`{id, after}` only), `precondition.ts` (`Cause`s
      only), and a feed cursor's `target`. - THE DECISION: `Ref.byAnnotation` was dropped in review on #12575, so a generic subject CANNOT
      be validated at the operation boundary — it must be `Ref.Ref(Obj.Unknown)` plus a runtime guard
      (see PIPELINE.md, now marked SETTLED). That is a real loss of type safety on the one operation
      users invoke directly. - AND THERE IS STILL NO SECOND CONSUMER. The projects trio was twice cited and is not one (all
      three read `mailbox.feed` and need fan-out). The only genuine candidate is transcription, whose
      `messageEnricher` is a WRITE-time seam closer to sync's inline stages than to a cursored
      read-time pass — so it likely wants the other half's shape anyway. - RECOMMENDATION: do not build the generic host until a second cursored consumer exists. Trading
      boundary validation for an abstraction with one implementor is a bad trade. Revisit when
      transcription or another feed owner actually needs a cursored pass.
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

---

## Phase 6: Bidirectional tag sync — BUILT 2026-08-15 (Gmail)

Design: [`TAG-SYNC.md`](TAG-SYNC.md). Closes the Phase 1 P2 deferral — a star or an archive made in
Composer reaches the provider, and a label changed at the provider is no longer add-only.

The mechanism is a three-way merge whose **base is the tag index's Automerge heads**
(`Obj.version` / `Obj.getVersion`), not a shadow object and not an outbox: ECHO already keeps the
mutation log, and a state diff has no self-echo failure mode — sync writes tags through the same
`Tagging.set` the star button does, so an intent queue would enqueue every pulled tag for push.

### Tasks

- [x] **Pure diff module** — `src/sync/tag-diff.ts`, `(base, local, remote, eligible) → { push, pull }`
      over plain `Map<string, Set<string>>`; no ECHO, no provider, no Effect. 15 tests passing.
      FOUND WHILE WRITING THEM: an opposed conflict is UNREPRESENTABLE. Membership is a boolean per
      (message, tag), so `local !== base && remote !== base` forces `local === remote` — both flipped
      to the negation of base. All eight triples resolve to push/pull/nothing, so the owner-wins
      policy decided earlier is MOOT and is gone, along with the per-tag owner in `eligible` (now a
      plain `Set`). The suite enumerates all eight and asserts no tag is ever pushed AND pulled, so a
      future tri-state or tombstone fails the test rather than silently reviving the question.
- [x] **Heads on the binding** — persist `nextHeads` and `Cursor.spec.token` in ONE `Obj.update`.
      CONCRETELY: `runMailSync` writes the token today at `mail-sync.ts:578` inside `if (!capped)`;
      that call must NOT stay as-is with a heads write added beside it. Hold `source.nextToken()` in
      memory, run the push phase first, then write both through `Cursor.writeSyncState` — and write
      neither when anything is `pending`.
      (a combined `Cursor.writeSyncState({ token, tagHeads })`, never `writeToken` followed by a
      separate heads write). They are one recovery unit: token-then-heads leaves the next run reading
      its delta from the advanced token while diffing against stale heads, so every tag the previous
      run PULLED reads as a local-only add. Usually a no-op re-push, but if the remote moves in that
      window it silently re-applies a tag the provider deliberately removed, and no conflict rule
      catches it because the diff sees no conflict. Capture them AFTER
      the pull commits and BEFORE the push, which is what avoids both a lost mid-run toggle and
      re-pushing this run's own pulls. When `Obj.getVersion` cannot reconstruct the saved heads, do
      NOT re-baseline silently — that drops every local change made since the last sync. Fall back to
      the base-less ADDITIVE reconcile (push what remote lacks, pull what local lacks, remove nothing
      either way); without a base, "local has it, remote does not" cannot distinguish a local add from
      a remote removal, so only the additive half is safe. Self-healing: the run captures fresh heads,
      so the next diff is well-founded and removals resume.
- [x] **`pushTags` hook on `MailSyncProviderService`** — optional, so a provider with no write path
      degrades to pull-only. Returns `{ settled, pending }` rather than void: a PERMANENT rejection
      (404, label gone, missing scope) is `settled` because no retry can succeed and refusing to
      advance would block the base forever; a TRANSIENT one (429, 5xx, timeout) is `pending`. Heads
      persist only when `pending` is empty and the cap was not hit — otherwise `runAgain`, so retry is
      between runs and `pushTags` owns no backoff state. Harness resolves tag uris → provider bindings
      from the reverse label map and caps ops per run.
- [x] **Gmail write path** — `modifyMessage` + `batchModify` on `GoogleMailApi`, its `Live` layer, and
      `GoogleMailApi.mock` (the mock needs mutable per-message label state so `listHistory` reflects a
      push). The connector ALREADY requests `gmail.modify` (`capabilities/connector.ts`, added for
      trash) — nothing to change there.
- [x] **Map `spam` onto Gmail's `SPAM`** — `GMAIL_SYSTEM_TAGS` omits it deliberately today ("TRASH/SPAM
      — never synced"), so `ClassifyMailbox`'s canonical `spam` tag has nothing to push to. Adding it
      is BIDIRECTIONAL: `syncLabels` reads the same map, so Gmail's own spam verdict starts arriving
      as the canonical tag — wanted, but a reversal of a documented exclusion, not a one-line edit.
      `TRASH` stays out; deletion is not a tag. VERIFIED 2026-08-15 against `test@braneframe.com`:
      `users.messages.modify` accepts `SPAM` in `addLabelIds` (HTTP 200, applied, restored cleanly),
      so the reverse map stays a bare `tagUri → labelId` and no binding descriptor is needed for the
      Gmail cut. Revisit when JMAP lands, where `spam` is a `$junk` keyword rather than a label.
- [x] **Mock-provider round trip** — `plugin-google/src/operations/mail/sync/tag-push.test.ts`, 8 tests
      driving the real harness against the mock (which now holds mutable label state, so a push is
      observable through the same API the sync writes through). Covers first sync, star, archive,
      pull-not-pushed-back, user tag ignored, transient failure holding the base, `Obj.getVersion`
      reconstructing a past index, and unresolvable heads emitting no removals. FIXTURE BUG FOUND:
      `SYSTEM_LABELS` omitted STARRED/SPAM/TRASH, and since `syncLabels` maps the label DICTIONARY, a
      missing entry silently disables tag reconciliation for that tag rather than failing.
- [x] **Live round-trip test** — both directions against `test@braneframe.com` (DECIDED 2026-08-15;
      unblocked). Nothing in the repo referenced that account before, so `TAG-SYNC.md` is now its
      canonical record. This test WRITES labels, so `GOOGLE_ACCESS_TOKEN` alone must not arm it: that
      variable already exists for the read-only `sync-e2e.test.ts`, and reusing it would silently turn
      an existing read-only setup into one that mutates mail. Second gate is
      `DX_GMAIL_TAG_SYNC_ACCOUNT` holding the address (its value IS the allowlist), with a
      `getProfile().emailAddress` assertion that FAILS (not skips) on mismatch, operation only on
      messages the test itself created, and cleanup in `afterAll` restoring original `labelIds` —
      throwing if a restore fails, since a shared mailbox means a swallowed one hits a colleague.
      SHIPPED as `sync-live.test.ts` + `testing/live-credentials.ts`, 3 tests, RUN GREEN against
      test@braneframe.com: identity assertion, star pushed + Gmail label pulled in one run, and
      archive removing INBOX. Account verified restored afterwards (0 starred, 24 in inbox).
      NOTE: `plugin-google`'s `mail/send/handler.test.ts` already SENDS real email on
      `GOOGLE_ACCESS_TOKEN` alone — the pattern this rule exists to avoid repeating, not to copy.
- [x] **Push insert-time local tags** — a tag written by local logic during a run (known-sender
      `important`, on-arrival extractors) is NOT the same as a tag the pull wrote, though both land
      before the heads capture. Left in the base it strands forever: it sits in both `base` and
      `local` from the next run on, so no diff ever emits it. Separated by carrying each insert's
      `remoteTagUris` on the REMOTE side of the merge: a provider label is then on local and remote
      with an empty base (converged, no push) while an insert-time local tag is local-only (push).
      NO base overlay — the earlier design had one; the tests showed it was a second mechanism for
      the same outcome.

### Open

- **ADOPT FROM PR #12599 (wittjosiah's parallel `outbound-tag-sync` design): the `isProviderTag`
  split.** Provider tags should stay non-renamable and non-recolorable but become MEMBERSHIP-
  toggleable — one predicate split into two, auditing every call site (`meta-tags.ts`,
  `SystemTags.ts`). Without it our eligibility is half-connected: `tagBindings` makes
  `com.google.gmail.label` tags pushable, but the UI still forbids attaching or detaching them, so
  only canonical tags can ever actually change locally. Small, and it completes what shipped.

- **ADOPT FROM PR #12599: a tag add/remove affordance on messages** (their Phase 4). None exists today
  beyond the star and the archive toggle — `Mailbox.applyTag` is called only by the classifier and
  extractors. Until it lands, most of the push path is reachable only by pipeline code, not by a user.
  Deliberately NOT folded into the tag-sync PR: it is a UI feature with its own storybook and review
  surface, and that PR is already four packages wide.

- **PRE-EXISTING FLAKE: `sync.test.ts`'s capped-run test loses a message under load.**
  `a capped run requests Operation.runAgain(), and repeated runs sync the whole mailbox` intermittently
  asserts 24 of 25 synced ids. NOT order-dependent — an earlier reading of it as "fails under `-t`,
  passes in the file" was wrong; 8 consecutive uncached isolated runs pass on a quiet machine, and the
  failures clustered while the box was busy with the live Gmail suite. Reproduces with the tag-sync
  changes stashed, so it is not ours.

  DIAGNOSED, not fixed: the sync is innocent. The funnel logs show all 25 committed across the three
  capped runs (10 + 10 + 5) in BOTH the passing and failing cases — it is the post-run `db.query` that
  occasionally returns 24. So this is a read-visibility race after `runMailSync`'s closing
  `Database.flush({ indexes: true })`, not a lost message. Adding one extra query before the assertion
  makes it pass every time, which is the Heisenbug signature of exactly that. Worth chasing because
  the same race would make ANY post-sync read racy, not just this test.

- ~~Whether `ClassifyMailbox`'s canonical output should push to the user's real Gmail account.~~
  DECIDED 2026-08-15: it pushes — a classification the user sees in Composer should be the one their
  mail client shows. See the `spam` mapping task above for the work that decision creates.
- ~~Conflict policy.~~ MOOT 2026-08-15 — an opposed conflict cannot be represented for boolean tag
  membership, so neither owner-wins nor remote-wins ever fires. Removed rather than kept as dead code.
  If membership ever gains a third state, owner-wins is the answer to reach for (a tag has a declared
  owner per `Tag.md` §"Tag origin") — and the enumeration test will fail loudly at that point.
- **CONSIDER LATER: timestamped last-writer-wins.** The rule above cannot tell which of two opposed
  acts happened later, so an unsynced local star resurrects one removed on another device — bounded
  by one sync interval. Real LWW needs a per-entry write time, which `TagIndex`
  (`Record<tagId, objectId[]>`) does not carry: a schema change plus clock-skew handling, since the
  device and provider clocks are not comparable without a server-supplied ordering. Revisit if the
  resurrection case is actually observed, not pre-emptively.
- ~~JMAP in this change or a follow-up?~~ DECIDED 2026-08-15: **follow-up**. `pushTags` is optional so
  an unimplemented provider degrades to pull-only. `jmapReconcile`'s add-only keyword handling exists
  only because local flags could not be written back — revisit it when JMAP lands, not before. Treat
  `ProviderTagBinding` as PROVISIONAL until a second provider has used it: `spam` is a label in Gmail
  and a `$junk` keyword in JMAP, which is exactly the shape the descriptor has to survive.

---

## Edge sync emits ONE status per run and no terminal (measured 2026-08-23)

The mailbox meter is permanently indeterminate and never clears. Instrumenting the client-side
progress trace sink over a ~40-minute window settled where the fault is NOT: the same log carries a
local feed sync and an edge mailbox sync, and only one of them reports.

`plugin-magazine` feed sync, `runtimeName: 'local'`, one pid, four updates:

```text
Syncing nippon.com / ja   current 0
Syncing nippon.com / ja   current 0    total 20
Syncing nippon.com / ja   current 20   total 20
progress.complete         current 20   total 20
```

Mailbox sync, `runtimeName: 'edge-intrinsic'`, five separate runs 5–10 min apart (the trigger's
schedule), each a fresh pid, each exactly ONE update:

```text
Syncing rich@braneframe.com   current 0     (no total, no increments, no terminal)
```

That single update is `reportStatus({ current: 0 })` at `mail-sync.ts:509` — the run's opening
report, which by design carries no total (the total is only known once `onEnumerated` has counted a
page). Nothing after it arrives: not `addToTotal`'s total, not `onRetrieved`'s increments, not the
`progress.complete` at `mail-sync.ts:755`, not the `PROGRESS_STATUS_FAILED` its error finalizer
would emit.

So the meter is indeterminate because "started" is the only fact it is ever given, and it never
clears because no terminal ever arrives. The renderer, the sink reducer and the producer are all
exonerated: the producer is covered by `plugin-google/…/sync.test.ts` ("emits progress status
updates"), which asserts a `total > 0` and a rising `current`, and the local run above proves the
whole sink → registry → meter chain end to end in the very same session.

What remains is edge-side and not observable from the client: the run reaches `provider.prepare`
(the opening status is written after it), emits that status, and then produces nothing further —
consistent with the invocation being killed before it enumerates a page, since a normal failure
would still emit `PROGRESS_STATUS_FAILED` from the finalizer. A hard kill skips finalizers; so does
a defect that escapes the run's error channel.

- [x] **Staleness bound in the sink** — BUILT 2026-08-23. A monitor that goes 90s without an update
      is failed as `Stopped reporting`, which claims only what is known: the run may have finished or
      still be going, and only its reporting is certainly over. The entry stays registered so the
      meter keeps its dismiss control, and a later run recovers the key from its own numbers rather
      than inheriting the abandoned run's. Bonus: `app-graph-builder` disables the Sync button on
      `status === 'running'`, so a wedged meter used to disable syncing indefinitely — the bound
      un-sticks that too. Eight tests, four of which fail without the bound.
- [x] **Which of the two it is — ANSWERED 2026-08-23 against the live session, and it is neither of
      the guesses.** The swarm is not dropping anything: the run genuinely stops. Read from the
      space's `Execution Trace` feed over a ~24h window: **146 edge runs, 146 `operation.start`, zero
      `operation.end`.** Local runs of the identical operation in the same feed carry
      `start` + `end outcome: success`. Corroborated independently of trace: the sync `Cursor`'s
      `lastTick` was 23 HOURS stale across those 146 runs (`Cursor.recordSuccess` is its only writer),
      and advanced the moment the operation was invoked in-process — 41s, 99 new messages, no error.
      So the operation, the token, the connection and the cursor are all fine, and mail sync is broken
      only on EDGE. Filed as #12719 with the pid table. The remaining unknown (hard kill vs escaping
      defect) needs workerd-side logs, which the client cannot see.
- [ ] **Mail does not sync in the background at all** until #12719 is fixed — `MAIL_REMOTE_SYNC = true`
      routes the Routine to EDGE precisely so mail arrives while Composer is closed, and that is the
      path that never completes. The Sync button is NOT a workaround: `Binding.runSync` fires the
      trigger whenever the connector declares one, so it takes the same broken edge path. Flipping
      `MAIL_REMOTE_SYNC` to `false` is a one-line local-sync fallback that demonstrably works, at the
      cost of the feature the flag exists for — a product call, not a bug fix.
- [ ] **Emit the terminal from an exit handler, not the happy path.**
      `reportStatus({ message: PROGRESS_STATUS_COMPLETE })` at `mail-sync.ts:755` is a plain statement
      after the pipeline, and the `Effect.tapError` above it catches typed failures only — a DEFECT
      bypasses both and reports nothing. Wrapping the run in `Effect.onExit` and reporting
      complete/failed/interrupted off the `Exit` closes every path except a hard kill of the
      invocation. Deferred deliberately: it only pays off if the invocation survives to run a
      finalizer, which is exactly what the open question above is about.
- [ ] **A total at the start of the run** — costed 2026-08-23, NOT worth building as specified.
      On the incremental path it is already effectively done: both providers call
      `onEnumerated(forwardIds.length)` eagerly inside `buildSource`
      (`plugin-google/…/sync-provider.ts:197`, `plugin-jmap/…:222`), so a total lands milliseconds
      after the opening status. Moving `reportStatus({ current: 0 })` below `buildSource` would close
      a window that narrow, and would cost the opening status entirely when `buildSource` throws.
      The path where it WOULD matter is backfill / full-scan, where enumeration genuinely streams
      (`fetch.ts:192` reports each page as `Stream.paginate` walks it) — and a total there needs
      either Gmail's `resultSizeEstimate` (an estimate, so the bar would not end where it says) or a
      full enumeration pass before fetching, plus a new `MailSyncSource` field and both providers.
      Revisit only if backfill meters become a complaint in their own right.

## Manual test plan

Moved to [`TESTING.md`](TESTING.md) — 27 steps across sections A–F. **Run 2026-08-14** against a live
Gmail-synced mailbox over the agent debug port: 12 passed, 2 failed (both fixed in #12577), 1 was a
stale expectation in the plan itself, and 12 yielded no verdict. That file also carries an evaluation of
what the debug port is and is not the right tool for.
See the blocker above for why an automation browser cannot execute them and a warm browser can.
