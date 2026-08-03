# plugin-crm — CRM Pipeline Operations: Audit & Design

- Date: 2026-08-02
- Project: `crm-pipeline-operations` (`.agents/projects/crm-pipeline-operations/TASKS.md`)
- Scope reviewed: `plugin-crm`, `plugin-projects`, `plugin-inbox`, `@dxos/pipeline-email`, `stories-inbox`

## 1. Context & goals

plugin-crm's entire domain behaviour today is a 218-line LLM prompt
(`plugin-crm/src/skills/crm/instructions.ts`) plus one operation (`AttachImage`). The prompt has
drifted from reality (it references a nonexistent `org.dxos.skill.research`, and describes an
`emails: [address]` shape that does not match `Person.emails: {label?, value}[]`), and its core
job — materializing Person/Organization from mail — has been superseded by deterministic
operations in the email pipeline (`EmailStage.extractContacts`, `@dxos/extractor-lib`).

Goals of this change:

1. Remove `instructions.ts` (decision: outright, no shim).
2. Audit every operation that touches Mailbox messages and Person/Organization objects (§2).
3. Spec the actions a CRM plugin should manage and map them to what exists (§4).
4. Add deterministic plugin-crm research/pipeline operations (scaffold-level; LLM/web enrichment
   stays behind a seam) with fixture-driven tests (§5–6).

## 2. AUDIT — operations touching Mailbox messages and Person/Organization

### 2.1 Mailbox-message operations (plugin-inbox unless noted)

Definitions in `plugin-inbox/src/types/InboxOperation.ts`; handlers under
`plugin-inbox/src/operations/`.

| Operation                                                         | Reads                            | Writes                                                                      | Notes                                                                                                                                                                                                                         |
| ----------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GoogleMailSync` / `JmapSync`                                     | provider APIs, feed (dedup seed) | **feed append** via `Cursor.commit`; deferred `db.add(Person)`, tags, blobs | The only production writer of messages. Tail stages from `@dxos/pipeline-email` (`EmailStage`): attachments → **extractContacts** → reconcileDrafts → `toCommitUnit`.                                                         |
| `MaterializeGmailTarget` / `MaterializeJmapTarget`                | binding                          | Mailbox                                                                     | Creates the Mailbox before the sync cursor.                                                                                                                                                                                   |
| `GmailSend` / `JmapSend`                                          | draft                            | provider; `sentTag`                                                         |                                                                                                                                                                                                                               |
| `ReadEmail`                                                       | feed                             | —                                                                           | Reversed feed, skip/limit, markdown render.                                                                                                                                                                                   |
| `DraftEmail` / `DraftEmailAndOpen`                                | —                                | `DraftMessage` + draft tag                                                  |                                                                                                                                                                                                                               |
| `ClassifyEmail`                                                   | message                          | Tag application                                                             | LLM selects an existing Tag.                                                                                                                                                                                                  |
| `ExtractMessage`                                                  | feed message                     | extracted objects, `ExtractedFrom` relation or `Mailbox.extracted`          | Dispatcher over `InboxCapabilities.ObjectExtractor` registry (contact, summarize, trip…). Feed messages are immutable queue items and cannot be relation endpoints — provenance for them goes in the `Mailbox.extracted` map. |
| `ExtractContactFromMessage`                                       | message                          | Person (via `@dxos/extractor-lib`)                                          | Registered as `ContactMessageExtractor`.                                                                                                                                                                                      |
| `ExtractSummaryFromMessage`                                       | message                          | `Markdown.Document`                                                         | AI summary; diverges from pipeline-email's `summarizeStage` (which appends a text block instead) — noted in `pipeline-email/DESIGN.md`.                                                                                       |
| `ExtractMailbox` _(deprecated)_ / `ExtractContact` _(deprecated)_ | feed                             | extracted objects                                                           | Fan-out and avatar-button paths.                                                                                                                                                                                              |
| `AnalyzeMailbox`                                                  | feed                             | `FactStore` (advisory RDF), **feed `Cursor`**                               | The cursored pipeline precedent: `Cursor.makeFeed` + `runFactPipeline` (§3.2).                                                                                                                                                |
| `CreateProjectFromMessage`                                        | thread messages                  | `Project` + `AnchoredTo`                                                    |                                                                                                                                                                                                                               |
| `UnsubscribeSender`                                               | message                          | `Mailbox.ignoreSender`, RFC 8058 POST                                       |                                                                                                                                                                                                                               |
| `GenerateReply` (handler in plugin-brain)                         | thread + FactStore               | draft reply                                                                 |                                                                                                                                                                                                                               |

### 2.2 Person/Organization writers

Three contact-extraction paths, all funnelling into `@dxos/extractor-lib`'s
`buildContactFromActor` (`extractor-lib/src/contact.ts`):

1. **`EmailStage.extractContacts()`** (`pipeline-email/src/stages/EmailStage.ts`) — production,
   runs unconditionally inline with mail sync; run-scoped `overlayIdentityIndex` over the shared
   per-space `IdentityIndex`; `db.add` deferred to commit.
2. **`extractContactsStage`** (`pipeline-email/src/stages/extract-contacts.ts`) — batch/demo
   variant of the corpus pipeline (`EmailPipeline.run`).
3. **`ContactMessageExtractor` / `ExtractContactFromMessage`** (plugin-inbox) — the on-demand
   extractor path via `ExtractMessage`.

Shared semantics (all three):

- **Gate**: `shouldExtractContact` (`extractor-lib/src/selection.ts`) is an allow-list — a sender
  earns a Person only if outbound (never set today) or its domain matches a known Organization;
  never for no-reply/bulk/role senders. Known gap: in practice only "domain matches a known
  Organization" fires (tracked in the `mailbox-research` project).
- **Dedup**: `IdentitySpec`s (`extractor-lib/src/identity.ts`) — Person keys on normalized emails
  (+ foreign keys), Organization on website domain. Registered by **plugin-inbox**
  (`capabilities/identity-specs.ts`) per PR #12417 ("whoever creates the objects owns the rule").
- **Organizations are looked up, never created** deterministically. Only the agentic CRM
  templates create Organizations today.
- Merge/review: `FindDuplicates` / `MergeDuplicates` + Duplicates tab live in plugin-space.

plugin-crm itself writes Person/Organization only via LLM prose (templates) and owns just:

- `AttachImage` (`plugin-crm/src/operations/attach-image.ts`) — image → EDGE image service →
  `subject.image`. Deterministic, well-hardened.
- `ProfileOf` relation (`plugin-crm/src/types/ProfileOf.ts`) — profile document →
  Person/Organization, with `sources[]`, `lastResearchedAt`, `summary`.
- `src/util/extract-contact.ts` — a **duplicated** signature parser (own free-mail list, own
  domain normalization) whose only non-test consumer is the prose in `instructions.ts`. Retired
  with it (convergence target: `extractor-lib`).

## 3. Findings (the four investigation questions)

### 3.1 Is there a fixture-driven test that extracts Person/Organization via the pipeline?

**Yes — via the sync pipeline; nothing CRM-owned.**

- `plugin-inbox/src/operations/mail/{google,jmap}/sync/sync.test.ts` — seeded fixture datasets
  (`generateGmailDataset`, `random.seed(42)`) + `seedSenderOrganizations` (to pass the
  allow-list), run the real sync, assert one `Person` per distinct sender and idempotency on
  re-run. Deterministic, in CI.
- `plugin-inbox/src/operations/analyze/analyze-mailbox.test.ts` — the cursored feed pipeline
  (`runFactPipeline`) with a stubbed extractor: facts stored, cursor advanced, re-run processes 0.
  **The template for any new cursored feed-consumer test.**
- `extractor-lib/src/{identity,selection,contact}.test.ts` — unit coverage of gate/dedup/build.
- Gated (not CI): `pipeline-email/src/testing/email-pipeline.test.ts` (Enron corpus + live
  Ollama, asserts Persons/Organizations).
- Memoized/agentic: `assistant-evals/src/evals/crm-mailbox.eval.ts` (graded, LLM judge);
  `plugin-crm/src/skills/crm/skill.test.ts` (all `it.effect.skip`, no assertions — a playground).

Gap closed by this change: a deterministic, fixture-driven test of the **CRM** path
(feed → cursor → contact → profile) owned by plugin-crm (§6).

### 3.2 Can the pipeline be triggered from the Mailbox, with a cursor against the message Feed?

**Yes.** Three cursor mechanisms exist (they do not share state):

| Cursor                                         | Owner                                | Key                                                                                   | Persistence                  |
| ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------- |
| External sync cursor (`spec.kind: 'external'`) | mail sync                            | provider positions + `token` (historyId/JMAP state)                                   | ECHO `Cursor` object         |
| Feed pipeline cursor (`Cursor.makeFeed`)       | `AnalyzeMailbox` → `runFactPipeline` | `message.created` epoch-ms (workaround: ECHO's native `Feed.cursor` is stubbed)       | ECHO `Cursor` object         |
| Trigger feed cursor                            | `TriggerDispatcher`                  | feed queue position (`KEY_QUEUE_POSITION`), advances only past successful invocations | foreign key on the `Trigger` |

Trigger surfaces: the mailbox toolbar "Analyze" action (plugin-brain `mailbox-action.ts`) invokes
`AnalyzeMailbox` manually; routines can bind it on a timer (`mailboxFacts` template). Because the
cursor key is coarse (`created < cursorKey`), every consumer needs a precise idempotency
backstop — the FactStore's indexed sources for facts; the `IdentityIndex` for contacts.

### 3.3 Is there a mechanism to trigger an operation after message sync?

**No completion event exists — and one was deliberately avoided.** Findings:

- The sync operation fires no event at end of run (`InboxEvents` has only `SettingsReady`).
- `onArrivalExtractors` (post-arrival extraction inline with sync) is **commented out** of the
  sync tail (`mail-sync.ts:457-461`) for edge compatibility, with a TODO to factor on-arrival
  extraction into a separate pipeline. That TODO is effectively this design brief.
- The de facto post-sync mechanism is a **`feed` trigger** on `mailbox.feed`
  (`Trigger.specFeed`): the local `TriggerDispatcher` polls every ~1s, fires the routine once per
  new feed item (`FeedEvent {feed, item, cursor}`), and advances its cursor only past successes.
  Both existing mailbox templates (`crm`, `inboxResearch`) use exactly this.
- Alternatives: `subscription` triggers with feed-scoped queries (tested in
  `trigger-dispatcher.test.ts`, unused by any shipping template; unbounded state map), and
  `Operation.runAgain()` for continuation (not completion).

Conclusion: "run the pipeline on sync" = a feed-triggered routine whose runnable is a
**cursor-managed operation**. The trigger cursor guarantees at-least-once firing per item; the
operation's own feed cursor + identity index make the work idempotent, so per-item firing of a
mailbox-scoped catch-up operation is safe and self-healing.

### 3.4 Can plugin-crm create a Project from a template with routines that run the pipeline on sync?

**Yes — the machinery exists and plugin-crm already uses half of it.**
`ProjectCapabilities.Template` + `ProjectOperation.Create` + `scaffoldProject` scaffold a Project
with owned Instructions/artifacts and routines. plugin-crm contributes
`org.dxos.project.crmResearch` ("Sender Research"), whose routine is **agentic** (instructions +
`{{event.item}}` per message). The deterministic counterpart is proven by plugin-brain's
`mailboxFacts` template: `makeRoutine({ spec: { kind: 'runnable', runnable:
Ref.fromURI(op.meta.key) }, trigger })` — "the trigger loop is deterministic; the model runs
inside the operation, not around it". What's missing is a CRM template combining a **feed**
trigger with a **runnable** spec (§5.4).

## 4. High-level spec — CRM-managed actions

Actions a CRM plugin should manage, mapped to current capability. ✅ = exists, 🟡 = partial /
agentic-only, ❌ = missing (→ this change or backlog).

| #   | Action                                                 | Status | Where                                                                                                                                          |
| --- | ------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Capture contact from inbound mail (Person + org link)  | ✅     | `EmailStage.extractContacts` inline with sync; `ExtractContactFromMessage` on demand                                                           |
| 2   | Create Organization from unknown corporate domain      | 🟡     | Agentic only (crm templates). Deterministic creation is deliberately withheld pending the allow-list rework (mailbox-research project)         |
| 3   | Deduplicate / merge contacts & orgs                    | ✅     | IdentitySpecs + `FindDuplicates`/`MergeDuplicates` + Duplicates tab (plugin-space)                                                             |
| 4   | Research/enrich Person → profile dossier (`ProfileOf`) | 🟡→✅  | Was prose-only; **new `ResearchPerson`** (§5.2) scaffolds deterministically; LLM/web enrichment stays agentic behind the `ResearchSource` seam |
| 5   | Research/enrich Organization → profile dossier         | 🟡→✅  | **new `ResearchOrganization`** (§5.2)                                                                                                          |
| 6   | Process a Mailbox for CRM (cursored, idempotent)       | ❌→✅  | **new `ProcessMailbox`** (§5.3) — the CRM sibling of `AnalyzeMailbox`                                                                          |
| 7   | Run CRM processing on sync (project + routine)         | 🟡→✅  | **new `crmPipeline` project template** (§5.4); agentic `crmResearch` template remains                                                          |
| 8   | Attach avatar / logo                                   | ✅     | `AttachImage`                                                                                                                                  |
| 9   | Track relationship stage (prospect → commit)           | 🟡     | `Organization.status` schema exists; no operation/board wiring (plugin-pipeline research board is a separate concept). Backlog                 |
| 10  | Interaction ledger (last-touch, counts per sender)     | 🟡     | Agentic `inboxResearch` (sender ledger) template; facts via `AnalyzeMailbox`. Deterministic ledger op = backlog                                |
| 11  | Classify / label sender mail                           | ✅     | `ClassifyEmail`; `tagMessage` stage                                                                                                            |
| 12  | Draft outreach / reply                                 | ✅     | `DraftEmail`, `GenerateReply`                                                                                                                  |
| 13  | Suppress / unsubscribe sender                          | ✅     | `UnsubscribeSender`                                                                                                                            |
| 14  | Follow-up tasks / projects from a message              | ✅     | `CreateProjectFromMessage`; TaskSet (projects M5)                                                                                              |
| 15  | Periodic digest of CRM activity                        | 🟡     | `corpus/digest.ts` exists as a library; not wired to any operation. Backlog                                                                    |

## 5. Design — new plugin-crm operations

Decisions (user, 2026-08-02): scaffold + deterministic only; LLM/web research stubbed behind
schemas; remove `instructions.ts` outright.

### 5.1 Principles

- **Compose, don't duplicate**: contact semantics come from `@dxos/extractor-lib`
  (`buildContactFromActor`, `identitySpecs`, `getIdentityIndex`, `overlayIdentityIndex` from
  `@dxos/extractor`); the cursor pattern from `@dxos/link` `Cursor.makeFeed` mirroring
  `analyze-mailbox.ts`; provenance via `Mailbox.recordExtraction`.
- **Deterministic trigger loop**: the model never sits between trigger and operation
  (the `mailboxFacts` rationale). Enrichment seams are explicit and inert by default.
- **ECHO canonical**: operations write Person/Organization/`ProfileOf`/`Markdown.Document`;
  no advisory stores.

### 5.2 `CrmOperation.ResearchPerson` / `ResearchOrganization`

- Keys `org.dxos.function.plugin-crm.researchPerson` / `.researchOrganization`.
- Input `{ subject: Ref<Person|Organization> }`; output `{ profile: Ref<Markdown.Document>,
created: boolean }`. Services: `[Database.Service]`.
- Deterministic behaviour: find the existing `ProfileOf` relation for the subject, else create a
  `Markdown.Document` profile skeleton (sections: Overview / Details / Organization|People /
  Key Links / Notes / Sources) pre-filled from known ECHO data (emails, org link, website…),
  parented to the subject (cascade delete), linked via `ProfileOf` with `sources: []` and
  `lastResearchedAt`. Re-run refreshes `lastResearchedAt` and returns `created: false` — the
  document body is user/agent-owned after creation and is not regenerated.
- **Enrichment seam**: the `ResearchSource` contract (`src/sources/research-source.ts`) stays the
  pluggable path for real research (web, LinkedIn-crx…); sources contribute operations/tools to
  the skill. The deterministic operations own structure + provenance; agents own content.

### 5.3 `CrmOperation.ProcessMailbox`

The CRM sibling of `AnalyzeMailbox` — the answer to "trigger the pipeline from the Mailbox with a
cursor tracking the message Feed".

- Key `org.dxos.function.plugin-crm.processMailbox`. Input `{ mailbox: Ref<Mailbox>, pageSize?,
research? }`; output `{ processed, contacts, profiles }`. Services: `[Database.Service]`.
- Handler:
  1. Resolve mailbox → feed; find-or-create a **feed `Cursor`** (`spec.source` = the mailbox
     feed). Disambiguated from `AnalyzeMailbox`'s cursor on the same feed by a foreign key on the
     cursor object (`Obj.getMeta(cursor).keys`: `{ source: 'org.dxos.plugin-crm', id:
'process-mailbox' }`) — same idiom as the trigger dispatcher's cursor key.
  2. Query feed messages; coarse-skip `created < cursorKey` (same documented workaround as
     `runFactPipeline` — ECHO's native feed cursor is stubbed).
  3. Per message: `buildContactFromActor(sender, db, { signals, index })` with a run-scoped
     `overlayIdentityIndex` — same gate + dedup as production sync. New contacts are `db.add`ed
     and recorded via `Mailbox.recordExtraction` (feed messages cannot be relation endpoints).
  4. `research: true` → `Operation.invoke(ResearchPerson)` per new contact.
  5. Page-wise `Cursor.advance` (crash ⇒ cursor un-advanced; identity index makes re-runs no-op).
- Idempotency: cursor (coarse) + identity index (precise). Safe under per-item feed-trigger
  firing: each firing is a catch-up; extra firings process 0.

### 5.4 `crmPipeline` project template

`org.dxos.project.crmPipeline` ("CRM Pipeline"), contributed next to `crmResearch` via the
existing `project-templates` capability. Applies to a Mailbox. Scaffolds:

- Project (mailbox as standing context; CRM skills for its chats), via `scaffoldProject`.
- One routine, **deterministic**: `spec: { kind: 'runnable', runnable:
Ref.fromURI(ProcessMailbox key) }`, `trigger: { spec: Trigger.specFeed(mailbox.feed), input:
{ mailbox: Ref.make(mailbox), research: true }, concurrency: 1, enabled: false }`.
  Feed trigger = "run on sync" (§3.3); baked `Ref` inputs pass through the input-builder verbatim.

The agentic `crmResearch` template is unchanged — the two are complementary (deterministic
capture + skeleton vs. model-driven dossier writing).

### 5.5 Removals

- `src/skills/crm/instructions.ts` (+ `makeInstructions` barrel exports). The skill keeps a
  **short** inline instructions template: subject resolution, upsert conventions
  (dedupe by email; `Person.organization` ref), and pointers to the operations — entity-shape
  rules now live in the operation schemas, not prose.
- `src/util/extract-contact.ts` + test (duplicated parser; dead once the prose goes).
- `PLUGIN.mdl` updated where it documents the removed prose.
- Skill tools gain `ResearchPerson`, `ResearchOrganization`, `ProcessMailbox`.

## 6. Test plan (all deterministic, CI)

1. `operations/research.test.ts` — `EchoTestBuilder`: Person (+ linked Organization) →
   `ResearchPerson` creates profile doc with expected sections + `ProfileOf`
   (`lastResearchedAt`, parenting); second run `created: false`, same doc. Organization variant.
2. `operations/process-mailbox.test.ts` — the **fixture-driven end-to-end test**: `Mailbox.make`
   - `EMAIL_FIXTURES` (`src/testing/fixtures.ts`) appended to the feed; Organizations seeded for
     the corporate `.example` domains (allow-list); run `ProcessMailbox`:
   * corporate senders → Persons created + org-linked; freemail sender skipped (gate);
   * cursor advanced to max `created`; `Mailbox.extracted` records provenance;
   * re-run processes 0 / creates nothing (cursor + identity index);
   * `research: true` → `ProfileOf` + profile docs for new contacts (full chain:
     feed → cursor → contact → research → profile).
3. `templates/crm-pipeline.test.ts` — scaffold shape, mirroring `mailbox-facts.test.ts`:
   `appliesTo`, runnable spec key, feed trigger, baked input refs, disabled, parenting.
4. Existing `templates/crm.test.ts` / `crm-project.test.ts` stay green (instructions text there
   is template-local, not from `instructions.ts`).

Out of scope (recorded, not built): live/eval coverage of the enrichment seam (the
`crm-mailbox.eval.ts` graded eval already covers the agentic path); Organization creation from
unknown domains (blocked on the allow-list rework); actions 9/10/15 backlog items.

## 6.1 Found during implementation

The new `process-mailbox` test exposed a real plugin-inbox bug: `Mailbox.recordExtraction` used
`(mailbox.extracted ??= {})`, which evaluates to the plain right-hand object on first use — a
detached record whose subsequent mutation is not written through — so the **first** extraction
recorded on a fresh mailbox was silently dropped. Fixed at the source (assign, then re-read the
proxy) with a regression test in `plugin-inbox/src/types/Mailbox.test.ts`.

## 7. Open questions / follow-ups

- **Filing**: `ResearchPerson` parents the profile doc under its subject rather than routing
  through `SpaceOperation.AddObject`; if profiles should appear in a collection (e.g. project
  artifacts), the agentic routine files them — revisit when the deterministic path needs UI
  placement.
- **Native feed cursor**: both `runFactPipeline` and `ProcessMailbox` key on `message.created`
  pending ECHO's real `Feed.cursor`; replace both when it lands.
- **Allow-list**: deterministic capture inherits the "known Organization domains only" gate;
  the sent-mail-recipients fix lives in the `mailbox-research` project.
- **Edge execution**: `ProcessMailbox` uses only `Database.Service` and is edge-compatible by
  construction; the feed trigger kind is currently local-dispatcher-only.
