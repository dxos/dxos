# plugin-inbox — Tasks

_Resume: Phase 1 is committed on `claude/suspicious-wilson-a54e74` (13 commits, unpushed, rebased onto
the #12553 squash `9c86066e45`). Next action: Phase 0 — the RecordArticle toolbar/menu. Phases below map
1:1 onto PRs. Uncommitted: none._

Split out of `packages/stories/stories-brain/TASKS.md` on 2026-08-13: that ledger is the model-ladder /
FINDINGS research harness, this one is the inbox product surface. The ~40 older Topics / FINDINGS /
model-routing items deliberately stayed behind.

**Phases map to PRs.** One phase = one PR. Do not start a phase before its predecessor is open.

---

## Phase 0: RecordArticle toolbar + menu (P0) — plugin-space

Not inbox code, but the user's top priority. May warrant its own registry project; decide when opening
the PR.

### Tasks

- [ ] **Toolbar + menu for `RecordArticle`** (`plugin-space/src/containers/RecordArticle/RecordArticle.tsx`)
      built on the menu idiom (`MenuBuilder` + `useMenuActions` + `Menu.Root`, threading `attendableId`).
- [ ] **Decide how enrich actions are injected** — the open design question. Candidates: a
      `Capabilities`-contributed action provider keyed by typename (so plugin-crm donates "enrich
      contact"/"enrich organization" without plugin-space depending on it), versus resolving
      `CrmOperation.*` directly. The contributed route matches the cross-plugin capability convention;
      confirm against `list_idioms` before building.
- [ ] **Storybook** for the toolbar + menu.

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
- [ ] **ConversationStack story: host `ContactPreview`, seed ~50% of actors as Persons** — the story
      half of the item above, so both resolved and unresolved states are visible.

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
- [ ] **Delete `ProcessMailbox`** — the operation, `ResetProcessCursor`, its routine template, cursor
      helpers, tests and translations. Rewrite the "Mailbox pipeline routine" phase in the
      `stories-brain` ledger so it does not keep claiming shipped features. This CLOSES "real stages
      behind the `log-title` seam" — the seam is `ProcessMailbox`.

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
- [ ] **Avatar not aligned with the actor's name** — both surfaces (conversation view AND the mailbox
      message card). Note `Card.theme.ts`'s `subgrid` carries `items-center`, which is the alignment
      rule to look at before the row gap.
- [ ] **Messages without `threadId` never render** in the mailbox conversation view — invisible
      messages are effectively data loss in that view.
- [ ] **Open an attachment in its own plank** — `Row.Attachments` is presentational today; needs a click
      handler, the attachment ref resolved to its Blob/object DXN, and a surface for that type.
- [ ] **Mailbox card: rows showing the inbox message count** — read `inbox`-tag membership from the tag
      index (a reactive atom), never a feed scan. Settle which counts earn a row.
- [ ] **`useCardHover` target-change regression test** — the cleanup already runs when `open`/`enabled`
      change; the test CodeRabbit asked for was never written. Needs the hook exported from `Row.tsx` or
      a story-level driver.

---

## Phase 4: Summarization

### Tasks

- [ ] **Whole-conversation summarization** — three parts in order: thread-scoped input to
      `SummarizeMailbox`; `dx-anchor` DXN links to referenced entities; task extraction rendered as a
      markdown task list.
- [ ] **Investor-log LLM summaries live** — the `summarize: true` path is implemented and degrades to
      the deterministic form.

---

## BLOCKER: storybook startup times out in this worktree (found 2026-08-13)

Every plugin-manager story on my storybook instance (:9013) dies with
`Startup timed out after 30000ms` — including `SpaceHomeArticle`, which nothing on this branch touches,
so it is NOT a regression from this work. Console shows the cause: the ECHO client is slow to come up
(`slow AM open {duration: 5007ms}` and `Action 'Finding properties for a space' is taking more then
5,000ms`), and plugin startup on top of that overruns the budget. Reducing a story's seed count from 100
to 8 objects did NOT help, so seeding is not the bottleneck.

Consequence: **the manual test plan below cannot be executed from my storybook instance.** Everything on
this branch is verified only by build, lint and unit tests. Same family as the already-tracked "story
invoker wedge (env)" and the 20s index-query timeouts.

Next steps when someone picks this up: check whether the user's own :9009 instance shows it too (if not,
it is worktree-local — suspect the vite dep graph or better-sqlite3 under this worktree's node_modules);
otherwise raise the startup budget in `useApp.tsx:236` only long enough to confirm the app does come up.

## Manual test plan

Written for functionality already built, to be walked 1x1. Each step names where to look, what to do,
and what should happen. **None of these has been verified in a running app** — that is the point of the
list.

Setup: storybook against the `@dxos/fixtures` mailbox corpus (391 real messages), served by the
`.storybook/main.mts` vite middleware. Use a port other than 9009 — the user runs their own there.

### A. Inbox + Starred navtree folders

- [ ] **A1** — Expand a mailbox in the navtree. Expect SIX children in this order: Inbox, Starred, All
      Mail, Sent, Drafts, Subscriptions.
- [ ] **A2** — Icons are distinct: Inbox is a tray, Starred a star, All Mail a stack. No two siblings
      share an icon.
- [ ] **A3** — Click Inbox. Expect only messages carrying the `inbox` tag. NOTE: on a corpus where sync
      never applied `inbox`, this is legitimately EMPTY — check the tag chips on a message before
      calling it a bug.
- [ ] **A4** — Click Starred. Expect only starred messages. Star one from the list and confirm it
      appears without a reload (membership is reactive).
- [ ] **A5** — Click the mailbox row itself. It already carried `filter:#inbox`, so it should match the
      Inbox child — Gmail's behaviour, not a duplicate-node bug.

### B. Archive from the conversation menu

- [ ] **B1** — Open a message, expand it, open the `⋮` menu. Expect: Reply / Forward / AI reply — divider
      — **Archive, Delete** — divider — extract actions — Open — contributed actions.
- [ ] **B2** — Archive and Delete are in the SAME section, with no divider between them.
- [ ] **B3** — Click Archive on a message that is in the inbox. Expect the message's `inbox` tag chip to
      disappear.
- [ ] **B4** — Reopen the menu on that message. The entry now reads **Move to Inbox** with a tray icon.
- [ ] **B5** — Click Move to Inbox. The `inbox` chip returns.
- [ ] **B6** — Archiving from a dedicated MessageArticle plank CLOSES the plank. Restoring does NOT
      close anything.
- [ ] **B7** — Archiving from the conversation inside MailboxArticle should NOT close the mailbox.

### C. Archive from the mailbox tile menu

- [ ] **C1** — In the mailbox list, open a tile's `⋮`. Expect Archive above Ignore sender / Create
      Project.
- [ ] **C2** — Label flips to Move to Inbox for an already-archived message, same as B4.
- [ ] **C3** — Archive from the tile while the Inbox folder filter is active: the row should leave the
      list reactively.
- [ ] **C4** — Only the acted-on tile re-renders (membership is a per-message atom family, not a list
      query). Watch for the whole list flashing.

### D. Recipients row

- [ ] **D1** — Expand a message with a To header. Expect a row with a `ph--user--regular` icon in the
      first column, aligned with the tags/attachments rows.
- [ ] **D2** — The row shows ONLY the address — `rich@braneframe.com`, never `"RICHARD S. BURDON"
<rich@braneframe.com>`.
- [ ] **D3** — A multi-recipient header renders each address comma-separated.
- [ ] **D4** — A message with no To header renders NO row (not an empty one).

### E. Conversation avatar contact affordance

- [ ] **E1** — Hover a sender avatar where the space HAS a Person. After ~400ms that contact's card
      opens.
- [ ] **E2** — Hover a sender with NO Person. The avatar gives way to a create-contact button; the card
      never opens and hovering writes nothing.
- [ ] **E3** — Click that button. A Person is created and the avatar reverts to the resolved state.
- [ ] **E4** — Move between two avatars quickly. No stale card opens for the avatar you left (the
      `useCardHover` cleanup — the case with no regression test yet).
- [ ] **E5** — The avatar column does not resize as the create button appears.

### F. Row story star

- [ ] **F1** — `ui/react-ui-card/Row` → Default. Click the star. It toggles filled ↔ outline and the
      label alternates star/unstar. (Verified headlessly on :9013; confirm visually.)
