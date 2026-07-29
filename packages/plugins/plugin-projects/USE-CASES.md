# plugin-projects — Use Cases & Hardening Plan

Status: proposal (2026-07-29). Companion to [`DESIGN.md`](./DESIGN.md) (architecture and decisions)
and [`TASKS.md`](./TASKS.md) (ledger). This document motivates the next milestone: the core
functionality has landed (#12335 … #12386) and now needs to be **demoed, tested, and hardened**
against real workflows — Gmail/inbox, CRM pipelines, and the RDF fact substrate.

## 1. Reference point: Claude Desktop Projects & Routines

Claude Desktop (claude.ai / Cowork) is the closest shipping analogue and the loose model the
`Project` concept started from. A field-by-field comparison sharpens what we are building and what
we are deliberately building differently.

| Concern             | Claude Desktop                                                               | Composer Projects                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container           | Project: instructions + knowledge + chats                                    | `Project`: instructions + routines + artifacts + chats (ECHO object, local-first, sync/shareable)                                                                          |
| Instructions        | Free-text "custom instructions" per project                                  | `Instructions`: markdown text + **skills** (toolkits) + **commands** (sentinels) + context objects — structured, reusable, referenced by ref (edits flow to live chats)    |
| Knowledge / context | Uploaded files & connected docs, retrieved into every chat                   | `instructions.objects`: refs to **live typed objects** (a Mailbox, a Table, a Person) — no upload/copy; the object _is_ the source and stays current                       |
| Chats               | Chats grouped under the project; project knowledge auto-included             | `Chat` parented to the project; instructions steer via typed ref; skills/objects arrive as feed `Binding` records (auditable, per-chat)                                    |
| Outputs             | Artifacts live inside the conversation; export is manual                     | `Project.artifacts`: a Collection of first-class ECHO objects (documents, sheets, contacts) — usable by every other plugin, filed explicitly by the model (`ProjectSkill`) |
| Automation          | Separate surface (scheduled tasks / Cowork routines); not owned by a project | `Routine` (instructions or operation + trigger) **owned by the project**, sharing its scope; triggers include cron _and_ data events (ECHO feed/query)                     |
| Memory              | Project memory: model-managed summaries of past chats                        | (Planned here) the **fact store** (`@dxos/pipeline-rdf`): structured subject–predicate–object facts with provenance and confidence, queryable by any session               |
| Extensibility       | Fixed product surface; MCP connectors for tools                              | Seminal-plugin posture: any plugin contributes artifact types, skills, **templates**, and can create/target projects via operations                                        |
| Tools               | MCP servers, skills                                                          | `Skill` (registry-resolved toolkits over typed `Operation`s) — same concept, but tools operate on shared typed data, not opaque side effects                               |

**Takeaways.**

1. Claude's strongest loop — _instructions + standing knowledge make every chat in the project
   smarter_ — is exactly `Chat.instructions` + context bindings, already live. Parity requires the
   knowledge half to be effortless: binding an object as standing context must be a one-gesture UI
   action (today it is data-only).
2. Claude keeps automation outside the project; we deliberately pull routines _inside_ (a routine
   inherits project scope). That is our differentiator and currently our weakest edge: a headless
   routine gets only `instructions.objects` (see the OPEN decision in `TASKS.md`), so project scope
   does not yet actually reach routines.
3. Claude's "project memory" is unstructured and model-managed. Our answer should be the fact store:
   deterministic, queryable, provenance-carrying. Nothing wires it to projects yet — use cases 8–10
   below close that.
4. Claude's artifacts are trapped in chats. Ours are live objects other plugins can render and edit —
   the demoable difference: a routine _maintains_ a spreadsheet the user has open.

## 2. Specification

Crisp statement of the proposed functionality (existing + this milestone). Normative verbs: MUST =
this milestone; SHOULD = next; MAY = direction.

### 2.1 Model

- A **Project** is the unit of long-running work: `name`, `description`, owned `instructions`,
  `routines` (refs), `artifacts` (owned Collection), chats (ECHO parent edge).
- **Instructions** = markdown `text` + `skills` + `objects` (standing context) + `commands`.
  One Instructions object steers both chats (via `Chat.instructions`) and routines (via
  `RunInstructions`).
- **Inputs vs outputs.** `instructions.objects` are _inputs_: standing context bound into every
  session. `artifacts` are _outputs_: work products the project owns. They MUST remain distinct
  (resolves the OPEN decision as direction 2 — keep `artifacts`): conflating them makes every
  produced object standing prompt context, which is bloat and the wrong default. An artifact MAY
  additionally be promoted to standing context by adding it to `instructions.objects`.
- **Routines inherit project scope.** A routine linked into `project.routines` MUST run with the
  project bound into its session context (project ref + `ProjectSkill` + the project's context
  objects), the same bindings a project chat gets. This is the mechanism that makes a routine able
  to _file artifacts back into its project_ — the core loop of every use case below.

### 2.2 Operations (programmatic surface)

- `ProjectOperation.CreateChat`, `CreateRoutine` — exist.
- `ProjectOperation.Create` MUST exist: creates a Project (owned Instructions + artifacts
  Collection) from `{ name?, description?, instructions?, skills?, objects?, template? }`, so other
  plugins can create projects without reaching into plugin internals. (Today only the create-object
  dialog path exists.)
- `ProjectOperation.AddArtifact` SHOULD alias the `ProjectSkill` handler as a public operation so
  plugins (not just the model) can file artifacts.

### 2.3 Templates

- `ProjectsCapabilities.Template` MUST exist, mirroring `RoutineCapabilities.Template`:
  `{ id, label, icon?, appliesTo?(subject), scaffold(ctx) → Effect<Project> }` — scaffold returns a
  fully-wired in-memory Project (instructions text, skills, context objects, starter routines);
  the create flow persists it with one `Database.add`.
- The generic create dialog ("+ Project") MUST offer contributed templates (blank remains default).
- Plugins contribute domain templates _and_ their own entry points: e.g. plugin-inbox contributes an
  "Inbox research" template whose `appliesTo` gates on a Mailbox subject, surfaced from the
  mailbox's toolbar/companion ("Set up project…"). Both directions the user asked about are thus the
  same mechanism: **inbox sets up a pre-wired project from its template; plugin-projects owns the
  generic option.**

### 2.4 Sessions

- A project chat MUST receive: instructions text/commands (prompt), `ProjectSkill` + artifact-type
  skills + `instructions.skills` (toolkit), project ref + `instructions.objects` (context). Exists.
- A project routine MUST receive the same, minus chat-only affordances (§2.1). New.
- Artifact-type skills (`ARTIFACT_SKILL_KEYS`) MUST grow beyond markdown: table, sheet — so "maintain
  a spreadsheet of senders" needs no skill-discovery round trip.

### 2.5 Facts (memory)

- A project SHOULD be able to use the space fact store as its memory: `org.dxos.skill.brain`
  (QueryFacts / SummarizeSubject) becomes bindable via a template or instructions skills; a routine
  wrapping `InboxOperation.AnalyzeMailbox` keeps the store current from a bound mailbox.
- Fact-grounded outputs cite provenance (`attribution.source` DXNs) so summaries link back to the
  originating messages.
- MAY (direction): per-project fact grouping — facts derived by a project's routines carry the
  project DXN in `attribution.wasDerivedFrom`, making "this project's knowledge" queryable; durable
  (persisted) fact store replaces the in-memory per-space registry.

### 2.6 UI

- ProjectArticle: header + instructions + routines gallery + artifacts gallery — exists. It MUST
  additionally surface: a **context section** (view/add/remove `instructions.objects` — restoring
  the field hidden in #12383, now clearly labeled as _context_, distinct from artifacts) and the
  template picker on create.
- A routine's card SHOULD show last-run status/outcome (today only the trigger summary).
- Commands authoring UI SHOULD land (data-only today).

### 2.7 Tools: how plugin operations reach a project

A project's leverage comes from plugin-supplied **operations** as much as from instruction text.
The two are not alternatives but a spectrum, and the design gives operations three distinct
channels into project work — each with a different cost, determinism, and place for judgment:

1. **Model tools, via skills** (judgment in the loop). A plugin wraps operations in a registry
   `Skill` (`Skill.toolDefinitions({ operations })`); the skill reaches a project session through
   `instructions.skills`, the pre-bound artifact/`ProjectSkill` set, or runtime `enable-skills`.
   Additionally, a project template MAY compose a **project-owned Skill object** persisted in the
   space — cherry-picking exactly the operations the project needs across several plugins (inbox's
   `UnsubscribeSender` + table ops + brain queries) into one purpose-built toolkit, without minting
   a registry key. `instructions.skills` accepts DB refs as readily as registry URIs, so this works
   today.
2. **Deterministic routine actions** (no model). `Routine.spec.kind = 'runnable'` points the
   trigger directly at the operation. `trigger.input` maps event fields (`{{event.item}}`,
   `{{trigger.*}}`) and scaffold-time literals — including an encoded ref, e.g. the project's bound
   mailbox — onto the operation's typed input schema. No tokens, no nondeterminism, typed output,
   unit-testable without a model. UC-C's analyze-mailbox routine is exactly this.
3. **Hybrid orchestration.** An instructions routine (or project chat) whose skills expose the
   operations: the model supplies the judgment (_which senders are worth researching_), operations
   supply the mechanical work (_run the research pipeline, upsert the profile_). UC-B is the
   canonical case.

**Selection rule** (for templates and for users): use the lowest channel that suffices. Mechanical
and fully specifiable → runnable routine (2). Requires language or judgment throughout →
instructions (chat or instructions routine). Judgment only to _select_ mechanical work → hybrid
(3). Channel 2 is dramatically cheaper and hardens best; templates SHOULD default to it wherever
the task decomposes.

**Commands are the chat-side face of the same idea**: a sentinel (`$unsub <sender>`) is instruction
text whose prompt directs a specific tool call — a user-facing verb bound to a plugin operation.
Commands SHOULD name the operation they invoke (data, not just prose) so autocomplete can show it
and a confirmation policy can key off it.

**Gaps this exposes** (tracked in `TASKS.md`):

- _Authoring UI for operation-action routines._ Only a template can scaffold `kind: 'runnable'`
  today; the blank create flow is instructions-only. SHOULD: an operation picker + input-mapping
  form in the routine editor.
- _Project-context input binding._ Trigger interpolation knows `{{event.*}}`/`{{trigger.*}}` but
  nothing project-scoped; templates compensate by baking refs in at scaffold time, which binds the
  routine to one object forever. MAY: a `{{project.*}}` substitution so one template serves any
  project and survives repointing.
- _Side-effect policy._ A deterministic routine encodes consent at scaffold time (the user enabled
  the trigger); a model-invoked operation with external effects (send, unsubscribe) has no
  confirmation gate. SHOULD: operations flagged as externally-effectful require an explicit
  per-project allowance in instructions, and commands surface it.

## 3. Use cases

Ordered roughly by increasing machinery. **Bold** = the three prioritized in §4.

| #   | Use case                           | One-liner                                                                                                                                                                                                                                | Exercises                                                   |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Project-from-thread                | "Make this a project": an inbox conversation becomes a Project — thread as context, summary doc + task outline as first artifacts (`CreateProjectFromMessage` v2).                                                                       | templates, Create op, inbox entry point                     |
| 2   | **Sender ledger** (UC-A)           | A project routine maintains a Table artifact of inbox senders with message counts / last-seen, updated as mail syncs.                                                                                                                    | routine scope, table skill, feed trigger, artifact upsert   |
| 3   | **Sender research** (UC-B)         | CRM research as a _project_: new senders get Person/Organization profiles + dossier docs filed as artifacts (today's CRM routine template, project-scoped).                                                                              | cross-plugin template, CRM skill, artifacts, provenance     |
| 4   | Client dossiers                    | Scheduled routine keeps one markdown dossier per client Organization current (web search + inbox activity); dossiers are artifacts, orgs are context.                                                                                    | cron trigger, websearch skill, artifact update-in-place     |
| 5   | Subscription audit                 | Routine maintains a table of bulk senders/newsletters with volume; chat command `$unsub <sender>` invokes `UnsubscribeSender`.                                                                                                           | commands, table skill, inbox ops as tools                   |
| 6   | Meeting prep                       | Morning routine: calendar events + facts about attendees + recent threads → daily briefing doc.                                                                                                                                          | multi-source context, calendar skill, brain skill           |
| 7   | Pipeline board                     | A `Pipeline` board (plugin-pipeline) is an artifact; project routines feed its columns (messages → contacts → orgs → notes) — the board is the project's dashboard.                                                                      | plugin-pipeline reuse, views over artifacts                 |
| 8   | **Fact-grounded summaries** (UC-C) | Routine runs `AnalyzeMailbox` over the bound mailbox; project chats answer "summarize where things stand with X" from facts, citing source messages.                                                                                     | RDF pipeline, brain skill, provenance, fact-store lifecycle |
| 9   | Fact-structured research           | Facts about an entity (employer, role, stated needs) parameterize web searches; findings come back as both a doc artifact and new facts (`wasDerivedFrom` project).                                                                      | facts→search loop, fact write-back, per-project provenance  |
| 10  | Projects as a tool                 | Another plugin runs an ad-hoc workflow _through_ a project: CRM invokes `ProjectOperation.Create` with its template; the project is the workflow's visible ledger (routines = stages, artifacts = outputs, chats = intervention points). | Create op, seminal posture, workflow observability          |

Use case 10 is the posture the user named: a Project is not only a user container but a **tool other
plugins use to give long-running work a home** — visible progress, durable outputs, and a chat where
the user can intervene, instead of an invisible background pipeline.

## 4. Prioritized: three end-to-end builds

Chosen to cover the three axes with maximal shared infrastructure: **UC-A (sender ledger)** proves
routines-in-project-scope + non-markdown artifacts; **UC-B (sender research)** proves the
cross-plugin template/operation surface; **UC-C (fact summaries)** proves the RDF memory loop.
1 → 2 → 3 is also the dependency order.

### 4.1 Common groundwork (blocks all three)

1. **Routine project scope** (§2.1/§2.4). `RunInstructions` gains an optional bound-project input;
   `ProjectOperation.CreateRoutine` seeds it (and binds project + `ProjectSkill` into the routine's
   session the way `CreateChat` does for chats). Unit tests over the run-instructions path.
   _This is the enabler — without it no routine can file artifacts._
2. **`ProjectOperation.Create`** (§2.2) + handler + tests: the programmatic entry point.
3. **`ProjectsCapabilities.Template`** (§2.3) + template picker in the create flow; blank template
   default. Mirrors `RoutineCapabilities.Template` closely enough to share the picker pattern.
4. **`ARTIFACT_SKILL_KEYS` += table, sheet** — one-line each + live verification that a project chat
   can create/update a table without skill discovery.
5. **Context section in ProjectArticle** (§2.6): render `instructions.objects` as a labeled
   "Context" gallery with add (object picker) / remove. Closes the OPEN decision per §2.1.

### 4.2 UC-A — Sender ledger

- plugin-inbox contributes an **"Inbox research" project template**: context = the Mailbox; skills =
  inbox, table, brain; starter routine = "maintain sender ledger" (feed trigger on the mailbox,
  instructions to upsert rows `{sender, count, lastSeen}` into a Table artifact, creating it on
  first run).
- Entry point: "Set up project…" action on the Mailbox node/toolbar → invokes
  `ProjectOperation.Create` with the template and the mailbox as subject.
- Missing pieces beyond groundwork: none new — this is deliberately the smallest full loop.
- Hardening target: idempotent upsert (re-runs must not duplicate rows) — assert in tests.

### 4.3 UC-B — Sender research (CRM)

- plugin-crm's existing routine template becomes a **project template**: same instructions/skills,
  but scaffolded inside a project — profiles (Person/Organization) and dossier docs are filed as
  artifacts; the mailbox is context.
- `ProjectSkill` handles filing; the CRM instructions gain one line ("file created profiles and
  documents into the project's artifacts").
- Missing: `ProfileOf`-aware dedupe is already in the CRM skill; verify artifact filing does not
  double-add on re-research (the `ArtifactAdd` id-dedupe covers it — test).
- Demo: open the project, watch the artifacts gallery fill with Person/Org cards as mail arrives.

### 4.4 UC-C — Fact-grounded summaries

- Template routine **"analyze mailbox"**: wraps `InboxOperation.AnalyzeMailbox` as an
  operation-action routine (kind `runnable` — first real non-instructions routine in a template)
  on a schedule or feed trigger.
- Project instructions bind `org.dxos.skill.brain`; chat prompt "summarize where things stand with
  <sender>" answers via SummarizeSubject with source citations.
- Missing pieces: none structural — `AnalyzeMailbox`, FactStore layer, and the brain skill all
  exist; the work is the template + wiring + eval.
- Known limitation to state in the demo: the fact store is in-memory per space (durable store is
  the recorded follow-up in plugin-brain) — facts rebuild via the persisted cursor on reload.
- Stretch (UC-9 seed): the summary routine writes its output doc as an artifact and appends
  project DXN to `attribution.wasDerivedFrom` for facts it derives.

### 4.5 Deliverables checklist

| Item                                                        | Package                            |
| ----------------------------------------------------------- | ---------------------------------- |
| Routine project-scope binding + tests                       | assistant-toolkit, plugin-projects |
| `ProjectOperation.Create` (+ `AddArtifact` alias) + handler | plugin-projects                    |
| `ProjectsCapabilities.Template` + picker                    | plugin-projects                    |
| Inbox research template + mailbox entry point               | plugin-inbox                       |
| CRM project template (port of routine template)             | plugin-crm                         |
| Analyze-mailbox routine template                            | plugin-inbox (or -brain)           |
| Artifact skills: table, sheet                               | plugin-projects (keys)             |
| Context section in ProjectArticle                           | plugin-projects                    |
| Stories (below) + evals                                     | stories-projects, assistant-evals  |

## 5. Storybook strategy (stories-\*)

A new **`packages/stories/stories-projects`** package — the use cases are cross-plugin
(projects × inbox × crm × brain), which is exactly what `stories-*` packages exist for; putting
them in stories-assistant would drag inbox/CRM fixtures into it. Reuse, not rebuild:

- `createDecorators` / `ModuleContainer` / live-AI chat harness from `@dxos/stories-assistant`
  (promote its `testing/` to an export if needed).
- Mailbox fixtures + `StoryAiPlugin` (ollama) / `mockAiService` patterns from stories-inbox;
  `FactsModule` for fact-store inspection.

Three story files, one per use case, each with the established two-tier shape (one `Default` +
play-test variants; live-AI variants tagged `!test`; manual scripts as numbered `Test:` steps on
play-free `*Manual` variants):

1. **`SenderLedger.stories.tsx`** — seeded mailbox + template-created project.
   - CI play test (mock AiService): template scaffolds project (instructions/context/routine
     asserted structurally); simulated routine run files a Table artifact; re-run stays idempotent.
   - Live variant: real model maintains the ledger from the mock mailbox feed.
2. **`SenderResearch.stories.tsx`** — CRM template in a project; mock websearch; assert
   Person/Org + dossier artifacts appear in the gallery, deduped on re-run.
3. **`FactSummaries.stories.tsx`** — analyze-mailbox routine (ollama or mock extractor) fills the
   fact store; chat variant asks for a summary; `FactsModule` alongside the chat + article so the
   demo shows the facts that ground the answer.

Out-of-CI graded checks live in `@dxos/assistant-evals` beside `projects.eval.ts`:
`sender-ledger.eval.ts` (table rows correct for a seeded mailbox), `fact-summary.eval.ts`
(summary consistent with seeded facts; LLM-judge for faithfulness, deterministic scorer for
citations). These are the repeatable model-behavior gates; the storybooks are the interactive
dev/demo surface.

## 6. Sequencing

1. Groundwork §4.1 (one PR: scope + Create + Template capability + skills + context section).
2. UC-A vertical slice + `SenderLedger` story (PR 2) — first demoable loop.
3. UC-B (PR 3, mostly plugin-crm) and UC-C (PR 4) in either order; evals land with each.
4. Revisit deferred: durable fact store, per-project fact provenance (UC-9), UC-10 as a written
   guide for plugin authors once Create/Template have two real consumers.
