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
- [ ] **Related messages should show the snippet or summary, not the subject** (requested 2026-08-13,
      the issue the item above asks to file) — every row in a thread repeats the same subject, which
      carries no information once collapsed to one row per conversation. Prefer the derived summary when
      the summarization pipeline has produced one, falling back to the provider snippet.

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
- [ ] **Avatar not aligned with the actor's name** — both surfaces (conversation view AND the mailbox
      message card). Note `Card.theme.ts`'s `subgrid` carries `items-center`, which is the alignment
      rule to look at before the row gap.
- [ ] **Messages without `threadId` never render** in the mailbox conversation view — invisible
      messages are effectively data loss in that view.
- [x] **Open an attachment in its own plank** — `Row.Attachments` is presentational today; needs a click
      handler, the attachment ref resolved to its Blob/object DXN, and a surface for that type.
- [ ] **Mailbox card: rows showing the inbox message count** — read `inbox`-tag membership from the tag
      index (a reactive atom), never a feed scan. Settle which counts earn a row.
- [ ] **`useCardHover` target-change regression test** — the cleanup already runs when `open`/`enabled`
      change; the test CodeRabbit asked for was never written. Needs the hook exported from `Row.tsx` or
      a story-level driver.

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

---

## Manual test plan

Moved to [`TESTING.md`](TESTING.md) — 26 steps across sections A–F, none run. See the blocker above
for why an automation browser cannot execute them and a warm browser can.
