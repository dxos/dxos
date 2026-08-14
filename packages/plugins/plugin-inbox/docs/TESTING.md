# plugin-inbox — manual test plan

Everything built across Phases 0-5 is verified by build, lint and unit tests only. These are the steps
that convert that into "seen working". None have been run, with one exception noted in F.

**Run these in a warm browser** against the storybook on :9009. An automation browser starts with an
empty OPFS, pays a full ECHO init, and trips the fixed 30s startup budget at `useApp.tsx:236` — see
the blocker section in [`TASKS.md`](TASKS.md). Nothing is wrong with the code; the profile is the
variable.

Work them in order: B through E all need the mailbox rendering, which A establishes.

Each step names where to look, what to do, and what should happen.

Setup: storybook against the `@dxos/fixtures` mailbox corpus (391 real messages), served by the
`.storybook/main.mts` vite middleware.

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

- [ ] **D1** — Expand a message with a To header. Expect a row whose first column carries the standard
      person AVATAR for a single recipient (the generic glyph was replaced), or a `ph--users--regular`
      group icon when there are several, aligned with the tags/attachments rows.
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

---

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
- [ ] **Failure policy from the DAG edges** (D4) — buildable now that the topology has landed, but not
      built: `continueOnError` still aborts in LIST order, so a failing `classify` strands whatever
      happens to sit behind it even when nothing connects them. Intended: a failed processor fails its
      descendants, independent branches continue.
- [ ] **Contribute the plugin-projects trio as `MailboxProcessor`s** — cheaper than D6 and was hiding
      behind it. `UpdateProjectTasks`, `UpdateTravelLog` and `UpdateInvestorLog` all read
      `mailbox.feed`, so they need NO generalization; contributing them puts them in the DAG and gives
      three of the seven cursorless consumers a cursor. Do this before D6.
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
- [ ] **Give the seven cursorless consumers a cursor** — mechanical now that a processor id is also its
      cursor tag, but each needs its own call on whether feed position or derived-state replacement is
      the right idempotency story (`ExtractSubscriptions` replaces wholesale; `SummarizeMailbox` skips
      by newest thread id).
