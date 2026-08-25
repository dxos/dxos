# plugin-projects — Tasks

_Resume (2026-08-15, branch `claude/projects-task-sets-modeling-b5rk70`, PR #12595):
**M6 Phases 1–2 IMPLEMENTED** (design + code). "Cleanup project data model" is live:
`Project@0.4.0` with inline `artifacts` and NO `goals`/`routines`; underneath it, the task model —
`Milestone` (`org.dxos.type.milestone@0.1.0`, no status — progress derived), `TaskSet@0.3.0` with
required ordered `tasks` (flat, sub-tasks included) + `milestones` arrays and derived-view helpers,
`Task@0.3.0` with `milestone`/`parentTask` refs. Eight new/reworked task verbs
(taskDelete/taskMove + milestone CRUD/Move/List) enforce the cross-object invariants; linear+github
now mirror remote milestones. Full repo build green after merging main (two large connector-sync
conflicts reconciled — main's `Binding`/`ConnectorSync` refactor kept, milestone logic reapplied on
top); affected-package tests green (types 28, plugin-tasks 29, plugin-projects 28,
assistant-toolkit 71, linear 18, github 13, crm 15, brain 18, space 54). Exemplar fixture
regenerated at the new versions.
GOTCHAS worth remembering: (1) a suspended optional schema (`Task.parentTask`) rejects
`= undefined` — clear with `delete`; (2) `db.add` cascades over refs, NOT parent edges; (3)
compare refs by entity id parsed off the URI (`EID.tryParse` + `getEntityId`), never `.target`,
since stored refs are local while `Obj.getURI` is space-qualified, and `Ref.hasEntityId` matches
local refs only.
NEXT: Phase 3 (outline-first skill rule + `promote-task`), then Phases 4–5 (routine staleness,
deletion guards). Deferred within Phases 1–2: nested sub-task rendering in `react-ui-task`,
milestone authoring UI, and sub-issue → `parentTask` sync (needs new API fetching in both
connectors)._

_Superseded pointer (2026-08-03): M5 Phases 1+3 + Phase 2 core MERGED as PR #12431; **Phase 4 DXOS SIDE MERGED as PR #12440** 2026-08-03 (McpToolAnnotation + all 12 §7.2 verbs, annotation verified through `Operation.serialize`). Also merged from this branch: #12442 (story rename) and #12444 (doc corrections). The checklist loop is now covered by CI play scripts in `stories-assistant/Chat.stories.tsx` — `WithPlanningScripted` (scripted `update-tasks`, title-keyed upsert does not duplicate) and `WithSubAgentsTest2` (delegation adds an unchecked item, checks it off on sub-agent completion); `WithPlanning`/`WithSubAgentsTest1` are the live `!test` counterparts. Next: Phase 2 remainder (templates scaffold/adopt TaskSet, app-graph task nodes, goals authoring, stories-projects play test); Phase 4 edge projection is the peer agent's. Do NOT pin a worktree in resume pointers — each session works in its harness-assigned worktree. PR #12389 MERGED 2026-07-29 — Milestone 4 open items (galleries width collapse, table-tool gap, tagged scaffold errors) remain below._

_Superseded pointer (2026-07-29): Milestone 4 (USE-CASES.md) groundwork + UC-A + UC-B + UC-C implemented and OPEN as PR #12389 (one growing PR, per user direction 2026-07-29; leave open for review — do NOT auto-merge). §2.1 decision RATIFIED by the user (keep `artifacts` as outputs; routines inherit project scope; no schema change — scope travels via `instructions.objects`/`skills` seeding). Check GREEN on 668f48f01f (all jobs; two review-fix rounds: public-deps inversion, CreateProjectPanel story context, six CodeRabbit threads fixed/answered). Preview: https://pr-12389-composer-main.dxos.workers.dev. NOTE: commits from 3f6744347c on are UNSIGNED (1Password signing agent unreachable mid-session). Next: user walkthrough of the three `stories-projects` stories (each has numbered manual steps), then land. Live-model runs NOT executed — no `DX_ANTHROPIC_API_KEY` in the session env (`sender-ledger.eval.ts` authored but unverified; run live before trusting it). Earlier context: #12335…#12386 merged; #12388 (would have ended the registry entry) CLOSED unmerged. Still open: URL binding for project chats (MAJOR, needs Josiah)._

PR #12383 carries: (1) `Chat.agent` removed and the chat↔agent linkage
restored to the `CompanionTo` relation — that field was the edge closing the
Agent↔Chat import cycle, so `agent-chat.ts` and both namespace facades are gone,
the lifecycle folded back into `Agent`, `Agent.loadForChat` added as the inverse
of `loadChat`; (2) the dead `LegacyCompanionTo` migration deleted; (3) an
echo-client fix for nested records read off detached objects; (4) `Chat.test.ts`,
`sync.test.ts`, and the delegation-strategy section in DESIGN.md; (5) Phase 3's
project chats (toolbar create, navtree children, Chats-section exclusion);
(6) in-article routine creation, the shared routines/artifacts card gallery, and
the `RoutineCard` trigger summary.

Design: [`./DESIGN.md`](./DESIGN.md) — Tasks ledger: this file.

## Phase 1: Core plugin + Project type (milestone 1) — DONE

Plan: agents/superpowers/plans/2026-07-24-plugin-projects.md (all 10 tasks complete, per-task + final reviews clean)

### Tasks

- [x] **Design spec** — approved + committed.
- [x] **ExternalProject rename** — @dxos/types Project → ExternalProject (org.dxos.type.externalProject@0.1.0); github/linear/space/onboarding call sites; create-menu entry removed.
- [x] **Routine schema → @dxos/compute** — wiring stays in plugin-routine (makeRoutine/wireTriggers).
- [x] **Instructions.commands** — structured sentinel commands ({sentinel, description?, prompt}).
- [x] **Project type** — org.dxos.type.project@0.2.0 succeeds Topic (name/description/instructions/routines/artifacts); all call sites migrated (brain, inbox CreateProjectFromMessage, pipeline-email, stories).
- [x] **plugin-projects scaffold** — private core plugin, registered in composer-app.
- [x] **Project surfaces moved from plugin-brain** — create-object (owned Instructions + artifacts Collection), app-graph, navigation, ProjectArticle.
- [x] **ProjectArticle** — single Form (Form.Viewport gutter / Form.Content / Form.Sections + Listbox rows); story + play test.
- [x] **Chat context binding** — Project.contextBindings bound in ChatCompanion (instructions + skills + objects).
- [x] **Commands autocomplete** — `$` sentinel completion in chat prompt (react-ui-chat commands extension; Enter-accepts before submit).
- [x] **Style consolidation** — dx-input owns full input chrome (padding, focus shift, single-band subtle ring); Editor.View focus-border defaults removed; CompactIconButton 32px block.
- [x] **Finalization** — AUDIT sidekick note, changeset (@dxos/compute + @dxos/plugin-routine group reps), full verification, final review fixes (Create Project label, story non-null asserts).

## Phase 2 / milestone 2

Initial priority (user, 2026-07-24):

1. Create, edit, delete projects in Composer (delete flow + end-to-end verify).
2. Use project instructions in chat (verify the binding reaches the system prompt live).
3. Use with outliner skill to manage tasks (project + task outline artifact + skill binding).
4. Define and use commands (authoring UI + commands rendered into the session prompt).

- [x] **Open PR** — #12335 MERGED 2026-07-25 (squash f7d7735615); carried milestone 1 + the three MS2 commits below.
- [x] **P2: instructions reach the model** — formatSystemPrompt renders bound Instructions inline (## Instructions: text + sentinel-command directives), out of the tool-load stub list; unit tests (format.test.ts 2/2). User-verified "basically working" in-app.
- [x] **P1 partial: create/edit verified live** in Composer via serve-min (this worktree); cold-load fix: ProjectArticle resolves owned instructions reactively (useObject + Obj.getReactiveOrUndefined — sync .target never resolves on deep link).
- [x] **Context-stub labels** — object stubs in the system prompt carry `<label>` so the model doesn't tool-load just to identify a binding.
- [x] **Chip labeling** — plugin-assistant Instructions typename translations were legacy "Routine"; now "Instructions"; create-object names the owned Instructions.
- [x] **Minimal plugin set** — Projects/Routine/Outliner in plugin-defs.minimal.tsx + defaults + vite optimizeDeps glob.
- [x] **Live-AI story** — stories/stories-assistant/Projects ("Voyage": AHOY marker + $track command; Default manual + InstructionsTest play, !test-tagged).
- [ ] **P1 remaining: delete flow** — navtree ⋮ delete DONE (#12386): Project rows do get Rename/Delete
      (plugin-space's `objectActions` matches any node whose `data` is an ECHO object with
      `typename === node.type`, which `AppNode.makeObject` satisfies), the cascade is covered by
      `delete-project.test.ts`, and a real defect was fixed — `RemoveObjects` closed planks only for the
      objects passed to it, so a deleted project left its chats' planks open on removed objects.
      STILL OPEN: the intermittent "first click into empty deck attends but opens no plank" (repro needed).
- [x] **Tool-call churn in project chats** — (#12386) the skill-manager prompt no longer mandates a
      `query-skills` call before every `enable-skills` (the list is already rendered into the prompt), project
      chats pre-bind the artifact-type skills (pre-binding since removed, 2026-08-18 — `Project`'s
      `SkillsAnnotation` carries only the project skill), and `create-object` points at type-specific create tools.
      USER-VERIFIED LIVE on the #12386 preview, 2026-07-29. Model-behavioral, so a single run is not a
      guarantee — `assistant-evals` `projects.eval.ts` is the repeatable check: RUN LIVE 2026-07-29, 100% (all three scorers, 24s).
- [x] **PR strategy decision** — moot: the three MS2 commits shipped inside #12335's squash; verified present on main (ProjectArticle `getReactiveOrUndefined`, format.ts `## Instructions` + `<label>`, Projects.stories.tsx, minimal plugin set).
- [ ] **PLUGIN.mdl for plugin-projects** — as-built record now that implementation settled.
- [ ] **Commands-authoring UI** — InstructionsEditor edits text/skills only; `commands` currently data-only despite autocomplete shipping.
- [x] **In-article routine creation** — `ProjectOperation.CreateRoutine` toolbar action scaffolds the blank template through `RoutineOperation.CreateRoutine`, links it into `project.routines`, and opens it. Routines and artifacts now share one `ObjectGallery` (masonry of `ObjectCard`, click to open, ⋮ delete).
- [x] **Hide `instructions.objects` from the form** — interim step toward the BLOCKING decision below: the field is no longer rendered by `InstructionsEditor` (so it no longer reads as a second artifacts list) but the schema field and every runtime consumer are untouched. Affects the routine form and the Agent article too.
- [ ] **App-graph Project node children: artifacts + routines** — Phase 3 adds the chat children and the branch-node plumbing; these two reuse it.
- [x] **ProjectOperation.Create + operation-handler/events** — shipped in milestone 4 groundwork (PR #12389).
- [x] **Project templates capability** — shipped in milestone 4 groundwork as `ProjectCapabilities.Template` (PR #12389).
- [ ] **"/" completion of commands (and "@", "$")** — unify chat-prompt completion triggers.
- [ ] **inbox naming sweep** — action id 'create-topic' + Attention.linkedSegment('topic') → 'project' (verify companion segment resolution after rename).

## Phase 3 / milestone 3: project chats

Start a chat session from a project with the project already in scope, and see that
session in the navtree under its project. Design: the "Project chats" and "Chat
integration" sections of [`./DESIGN.md`](./DESIGN.md). Decisions (user, 2026-07-27): ECHO parent edge (no
Project schema change), new chat opens as a deck plank, toolbar scoped to chat creation
only; instructions reach the session through a typed `Chat.instructions` ref passed at
session construction (NOT via context bindings), accepting spawn-time staleness on
repoint.

### Tasks

- [x] **`Chat.instructions?: Ref<Instructions>`** — typed ref on the Chat schema
      (assistant-toolkit → compute).
- [x] **Explicit `instructions` through the request path** — `formatSystemPrompt` takes it
      as a parameter, the `instructionObjects`/`contextObjects` partition is deleted, and it
      is threaded via `AiSession.Options` → `RunProps` → `begin`/`run`;
      `processor.getSystemPrompt` resolves `chat.instructions`. assistant 43 tests green
      (format.test.ts 4/4, incl. a new case asserting a bound Instructions object is now an
      ordinary context stub); assistant-toolkit + plugin-assistant build clean.
- [x] **Agent-process boundary** — `Process.InstructionsAnnotation` (URI, persisted at spawn
      beside `TargetAnnotation`); `AgentService.getSession` stamps it from
      `GetSessionOptions.instructions`; `agent-process` resolves it into
      `AiSession.Options.instructions` (broken ref degrades to unsteered);
      `processor.request` passes `chat.instructions`. compute 46 tests green, builds clean.
- [x] **`Project.contextBindings` drops the instructions ref** — keeps `skills` +
      `instructions.objects` (test updated to assert the exclusion). Skills stay on the
      binding path (toolkit, not prompt).
- [x] **`ChatCompanion` stops binding project instructions** — a `useEffect` sets
      `chat.instructions` from the project when unset; Projects story mirrors it.
- [x] **Lazy backfill for pre-existing chats** — same effect: any project companion chat
      without the field picks it up on open.
- [x] **Project chats bind `ProjectSkill` + the project object** — a default project's instructions
      carry no skills, so `Project.contextBindings` was empty and the chat got neither the
      artifact-filing tools nor the project itself. The model could create a document but had no way
      to file it, and no way to name the project if it had. Both are now bound unconditionally at
      chat creation, on top of whatever the instructions add.
- [x] **`ProjectOperation.CreateChat`** — invokes `AssistantOperation.CreateChat` with the project's
      instructions ref (by reference, never a copy), `Obj.setParent(chat, project)`, binds
      `Project.contextBindings`, `LayoutOperation.Open`. No `SpaceOperation.AddObject`.
      `AssistantOperation.CreateChat` gained an optional `instructions` input so steering is set at
      construction. NOT yet exercised end-to-end (toolbar click → chat opens); see the test row.
- [x] **`projectChats` graph extension** — `children()` query → `AppNode.makeObject` per chat.
      The flagged re-emission risk does NOT materialize: `project-chats.test.ts` drives a real ECHO db
      through `setupGraphBuilder` and the connector re-runs when a chat is newly parented, so the
      `chats: Ref<Collection>` fallback (and its 0.3.0 bump) is not needed. The `url` binding is NOT
      done — see the MAJOR issue below.

### OPEN (was "resolve before landing") — context/artifact model across the core types

> Status 2026-07-29: #12383 was landed with this unresolved, at the user's direction. The interim
> step taken was UI-only — `InstructionsEditor` no longer renders `objects`, so it no longer reads as
> a second artifacts list — while the schema field and every runtime consumer are untouched. That
> buys time but decides nothing; the decision below is still owed before any schema change.

`Project` carries both `instructions.objects` (inputs bound into a session) and `artifacts` (outputs
the project owns), and they render as two near-identical ref lists in the article — which is the
symptom, not the problem. Now that a project chat binds the project object itself, artifacts are
reachable transitively, so the two overlap. Decide the model before landing; the shape of `Project`
and `Instructions` is hard to change once spaces hold data.

The two candidate directions (user, 2026-07-28):

1. **Drop `Project.artifacts`, rely on `instructions.objects`.** One list, no duplication. Costs: the
   artifacts Collection buys ordering, drag-rearrange and the existing collection UI, none of which a
   ref array on `Instructions` has; and it conflates inputs with outputs — every artifact the project
   ever produced would become standing context for every session, which is prompt bloat and the wrong
   default. `ProjectSkill.artifact-add`/`artifact-list` would retarget.
2. **Keep artifacts, give routines their own context mechanism.** `instructions.objects` is currently
   the ONLY standing context a routine gets: `RunInstructions`
   (`assistant-toolkit/src/operations/run-instructions.ts:70`) runs headless — no `Chat`, no
   `Chat.instructions`, no project — so removing the field from the chat path is safe but removing it
   outright silently strips context from every routine. A routine would need either its own context
   field or a project it inherits scope from.

Review these together rather than piecemeal — each pair already has an unresolved edge:

- **`Instructions`** — `text` (prompt) + `skills` (toolkit) + `objects` (context) + `commands`.
  Is `objects` an instructions concern at all, or a session concern that landed here because routines
  had nowhere else to put it?
- **`Project`** — `instructions` (owned) + `routines` + `artifacts`, chats by ECHO parent edge. Is
  `artifacts` an output collection or the project's context? Currently documented as the former,
  wired as neither (the model files into it, nothing reads it back into a session).
- **`Chat`** — `instructions` ref + `plan` + feed. Gets project + `ProjectSkill` bound at creation
  (`plugin-projects/src/operations/create-chat.ts`). Bindings are written at creation, so a chat does
  not follow later changes to the project's context — an accepted staleness that should be revisited
  here.
- **`Routine`** — instructions + trigger. The only consumer of `instructions.objects` that has no
  alternative. Does a routine belong to a project (inheriting its scope), which is the same question
  as the Agent convergence below?
- **`Agent`** — 0.2.0 identity/preset holding an `instructions` ref, owning no conversation state.
  DESIGN.md "Agent ↔ Project convergence" already asks where durable work products live; that answer
  and this one have to agree.

Related and already recorded: DESIGN.md "The delegation strategy, and why `Plan` is not an artifact"
(the promote-a-completed-plan question is the same inputs/outputs boundary).

### MAJOR — review with Josiah: URL binding for project chats

A project chat has a navtree node but **no `UrlBinding`**, so it is not URL-addressable: clicking it
opens the chat, but the URL does not reflect it and a refresh or shared link cannot restore it.
Josiah owns this grammar (`url-deck-redesign`, `.agents/projects/url-deck-redesign/DESIGN.md`), so the
approach should be agreed with him before implementing rather than decided here.

The problem: a Chats-section chat has a fixed node shape and so uses a static `path`
(`@dxos/app-graph` prefers this — "the preferred deterministic case"):

```
root/<workspace>/ai/org.dxos.type.assistant.chat/<chatId>     static path + id
root/<workspace>/ai/org.dxos.type.project/<projectId>/<chatId>  a PROJECT chat
```

The project id sits mid-path and is not derivable from `/chat/<chatId>`, so a project chat needs a
dynamic `GraphBuilder.PathResolver` (`{ id, workspace, workspaceBaseId } => Effect<string | null>`)
that resolves the chat, reads its parent project, and returns the candidate id — the one-hop version of
what plugin-space's `object` key does over collection ancestry
(`plugin-space/src/capabilities/app-graph-builder/extensions/collections.ts:169`).

Points to settle with Josiah:

1. **Key sharing.** The design says reuse the `chat` key across both extensions. `resolveKeyId`
   (`@dxos/app-graph/src/path-resolution.ts:188`) tries every static path before any resolver, so
   `/chat/<id>` would first attempt the Chats-section path, fail verification for a project chat, then
   fall through to the resolver. Confirm that fall-through is intended and not merely incidental — it
   is load-bearing for this design, and it costs a failed materialize on every project-chat resolve.
2. **Reverse direction.** With a resolver-backed binding, `urlRepresentation` takes the last node-id
   segment as the id, yielding `/chat/<chatId>`. A static path would instead produce
   `<projectId>+<chatId>`. Worth confirming the resolver form is the intended way to express "same key,
   different depth".
3. **Whether project chats should be addressed under the project instead** (e.g. a `topic` pair
   followed by a chat pair), which would sidestep the resolver entirely but changes the URL shape.
4. **Cold deep link** — the Phase 3 test row calls for verifying navtree children survive one; that
   test is meaningless until this is resolved.

- [x] **Exclude project chats from the top-level Chats section** — plugin-assistant's section query
      is now the exported `standaloneChatsQuery`: every chat minus `CompanionTo` sources minus
      `Project` children. `standalone-chats-query.test.ts` seeds all three kinds against a real db and
      asserts only the standalone one survives (verified to fail without the project exclusion).
- [x] **`ProjectArticle` toolbar** — one graph action dispositioned
      `['toolbar', 'list-item-primary']` serves both the toolbar (which splices graph actions) and the
      navtree row, so they cannot drift. Covered by `app-graph-builder.test.ts`.
- [ ] **Tests** — unit (`formatSystemPrompt` renders the explicit param and no longer
      inlines a bound Instructions object; enumeration; parenting + ref pass-through), story
      play test (toolbar creates a chat, appears in the list), live verify (instructions
      reach the system prompt in a standalone plank — proves the ref survives the
      agent-process boundary; navtree children survive a cold deep link).
- [x] **`ProjectSkill` — artifact management** — `assistant-toolkit/src/skills/project/`:
      `artifact-add` (dedupes by entity id; materializes a missing collection) and
      `artifact-list` (dxn/typename/label rows; broken ref → placeholder). Registered in
      plugin-assistant `skill-definition`. 4/4 handler tests green (TestDatabaseLayer).
- [x] **System test (live model, out of CI)** — `assistant-evals/src/evals/projects.eval.ts`
      (placement decided: evals, not a story): seeded Project + Chat (project's instructions
      by ref, chat parented), model creates "Trip Notes" markdown doc; scorers document-created
      / document-filed (artifacts collection) / document-bound (Binding record in the chat
      feed). Runner gained `seed` + `types` options. PASSED LIVE at 100% (all three scorers,
      opus-4-8, 32s, 2026-07-27).
- [ ] **Create other artifact types from a project chat** — Outline, Sheet,
      Organization/Contact objects; builds on `ProjectSkill`.
- [x] **Agent ↔ Project convergence review** — analysis + proposal written: DESIGN.md
      "Agent ↔ Project convergence" (field-by-field usage, target split, migration table)
      and [`./PLAN.md`](./PLAN.md) (4 phases: instructions typing → Chat.agent inversion →
      cron/subscriptions→Routines → artifacts→Project + 0.2.0 migration). Recommendation:
      removal, not extraction. Subsumed the separate "Agent artifacts" and "Agent cron"
      items. Execution pending user go-ahead, phase by phase.
- [ ] **Watch item** — if `children()` does not re-emit in the graph connector when a chat
      is newly parented, fall back to a `chats: Ref<Collection>` field on Project
      (0.2.0 → 0.3.0 bump + migration); only the enumeration source changes.

## Milestone 4: demo, test, harden — use cases

Scoped in [`./USE-CASES.md`](./USE-CASES.md): Claude Desktop comparison, specification (§2 —
resolves the context/artifact OPEN decision as "keep artifacts; routines inherit project scope"),
ten use cases, three prioritized builds (sender ledger / CRM sender research / fact-grounded
summaries), and the `stories-projects` storybook strategy.

### Tasks (per USE-CASES.md §4/§5, sequencing §6)

- [x] **Groundwork** — `ProjectCapabilities.Template` + blank template + `CreateProjectPanel`
      picker; `ProjectOperation.Create` (template-driven, programmatic); `CreateRoutine` seeds
      project scope (subject → `instructions.objects`, `seedProjectScope` adds ProjectSkill +
      artifact skills); `ARTIFACT_SKILL_KEYS` += table, sheet; ProjectArticle **Context** section
      (`InstructionsEditor` `fields` prop — only rendered fields write back). `AddArtifact` alias
      NOT added: `org.dxos.operation.assistantToolkit.addArtifact`/`artifactList` are already public
      operations with handlers registered by plugin-assistant, so other plugins can invoke them
      as-is. plugin-projects 13 + plugin-routine 62 tests green.
- [x] **UC-A sender ledger** — `inboxResearch` project template + "Set up project" mailbox-node
      action, both in plugin-projects (publishable plugin-inbox cannot depend on the private
      plugin; the action is injected into the mailbox node, plugin-brain-style); starter feed-triggered Sender Ledger routine (disabled) owned by
      the project; `stories-projects` package + `SenderLedger.stories.tsx` (play test drives the
      real operation stack in Chromium and asserts Context/Routines/Artifacts render). Idempotent
      upsert is graded by the eval below (model-behavioral, not unit-testable).
- [x] **UC-B sender research** — `crmProject` template (routine-only CRM automation template kept);
      research routine carries the project skill so profiles/dossiers are filed as artifacts;
      structural tests + `SenderResearch.stories.tsx` green.
- [x] **UC-C fact summaries** — plugin-brain `mailboxFacts` template: first **operation-action**
      routine template (`spec: runnable` → `InboxOperation.AnalyzeMailbox`, timer trigger, mailbox
      ref baked into `trigger.input`) + brain/inbox skills for chats; `FactSummaries.stories.tsx`
      green (live loop = numbered manual steps on the story).
- [x] **Stories can process (UC-C)** — the harness gained `messages` (seeded into the mailbox feed
      via the inbox `Builder`), `ai: 'mock' | 'ollama'` (an `AiService` LayerSpec on space affinity,
      matching how the app provisions it), and the missing `Feed`/`Message`/`Person`/`Organization`
      type registrations. `FactSummaries` now has a `Live` variant (`!test`) that puts the mailbox
      article beside the project so plugin-brain's own `Analyze` action drives extraction.
      VERIFIED LIVE against ollama 2026-07-29: 12 seeded messages → `analyze: extracted unit` ×N →
      `analyze: committed page` → `analyze: pipeline done` → `mailbox action complete`. The CI
      variants stay scaffold-only — seeding mail alone exceeds the 15s play-test budget.
- [ ] **UC-A/UC-B still do not process** — both need a model to produce their artifacts, and UC-A is
      additionally blocked by the table-tool gap below (the table skill has no tools). Once that is
      resolved, give each a `Live` variant on the same harness options.
- [ ] **Routines/Artifacts galleries render nothing — upstream width collapse** — REDIAGNOSED
      2026-07-30. `Masonry.Viewport` gates its grid on `contentWidth > 0`; the measured width is 0.
      Removing the nested `ScrollArea` (see below) did NOT fix it: the article's own `Form.Viewport`
      scroll viewport measures **16px** (scrollbar only) and the form-content grid column 0, so any
      `w-full` child inherits zero. The defect is `Form.Viewport`/`Panel.Content` sizing in this
      surface, NOT masonry and NOT ref resolution (`refs:1, loaded:1, items:1`). Next: find why the
      article's scroll viewport has no inline size (suspect `Panel.Content` or the surface cell), then
      re-check the gallery. Masonry's width gate is only the messenger.
- [ ] **Evals** — `sender-ledger.eval.ts` RUN LIVE 2026-07-29 (key via `op inject` from the user's
      `~/.env.tpl`; smoke 100% first) and it FAILED — a real finding, not eval noise: the agent's
      own completeJob failure says "Cannot create the Sender Ledger table with available tools".
      The table skill is instructions-only (`tools: []`); table creation in the app flows through
      the old `defineArtifact`/`createTool` artifact-definition, which does NOT reach the
      `RunInstructions` toolset. So UC-A's headless routine cannot create (or row-upsert) a Table
      today, and `ARTIFACT_SKILL_KEYS`'s table/sheet entries bind toolless skills. DECISION OWED:
      (a) real table operations in plugin-table's skill (create-table/upsert-row — the §2.7
      channel-1 fix), (b) template pre-scaffolds the Table so the routine only upserts (still needs
      a row-upsert tool), or (c) ledger as a Markdown table (markdown skill has real ops).
      `fact-summary.eval.ts` still BLOCKED on a harness fact-seeding path (needs a PutFacts
      operation or FactStore in the harness ServiceResolver).
- [ ] **Operations-as-tools gaps (USE-CASES.md §2.7)** — authoring UI for operation-action routines
      (operation picker + input-mapping form; templates-only today); `{{project.*}}` trigger input
      substitution (scaffold-time ref literals bind a routine to one object forever); side-effect
      policy for model-invoked external operations (send/unsubscribe need a per-project allowance).
- [ ] **Tagged scaffold errors** — `ProjectCapabilities.Template.scaffold` and
      `RoutineCapabilities.Template.scaffold` both expose bare `Error`; convert BOTH to a tagged
      Effect error in one change (review follow-up from #12389 — the contracts must stay parallel).

## Milestone 5: project model unification — Tasks, Plan, Milestones, MCP surface

Design: [`MILESTONE-5.md`](./MILESTONE-5.md) (2026-08-01, v3 — Phase 0 DECIDED). Project
optionally composes Goals / Outline / Tasks / Plan (Milestones DEFERRED);
**ExternalProject → `TaskSet`** (lightweight, possibly externally synced task container;
`Project.taskSet: Ref<TaskSet>` (single ref); `Task` membership by parent edge); plugin-outliner is taken over
as `plugin-tasks`; `Task.assignee` becomes `Actor`; Plan⇄Task promotion path; Linear-shaped
camelCase MCP verbs layered over the generic object API (the §2.7 "fourth channel"). Type
inventory table added to DESIGN.md § Types. Stage is dogfooded over MCP
(Claude ⇔ EDGE ⇔ Composer). Intersects the `mcp` registry project (milestone 3, task 4) — the
task-plugin reconciliation and skill-sync specs fold in here on the dxos side.

### Tasks

- [x] **Phase 0 — decisions** (user, 2026-08-01) — ALL DECIDED: `TaskSet` naming
      (`Project.tasks` owns it; Project keeps name/DXN/package); plugin-outliner takeover (no
      new plugin); milestones DEFERRED (lean `Ref<Milestone>` object — may need metadata — over
      label); DID-based agent assignment (no Ref<Agent> variant); Project stays in
      @dxos/compute (TaskSet dissolved the placement question); kanban adopts the task surface;
      taskList paginates Linear-style from day one.
- [x] **Phase 1 — schema + call-site sweep** — DONE 2026-08-01 (branch
      `claude/competent-curie-20057f`): `TaskSet` (org.dxos.type.taskSet@0.2.0) replaces
      ExternalProject; Task 0.2.0 (assignee: Actor, +failed/cancelled);
      Project 0.3.0 (goals/outline/taskSet); Outline → @dxos/types 0.2.0; linear push maps
      failed/cancelled → Linear `canceled`. Sweep: outliner, github/linear sync +
      materialize-target, assistant-toolkit, plugin-space, plugin-assistant, onboarding
      exemplar, stories-brain/assistant, translations.
      **NO MIGRATIONS by user direction 2026-08-01 (nothing deployed yet)** — the plan's
      migration items are dropped, not deferred.
- [x] **Phase 3 (pulled forward) — Plan REMOVED; two-forms model** — DONE 2026-08-01, same
      branch (user redesign session; see DESIGN.md § Product model + MILESTONE-5.md §6):
      markdown checklists = fluid form, Task/TaskSet = durable form, promotion links them.
      `Plan` type deleted (`Chat.plan`, `Project.plan`, PlanArticle, plan surface);
      containment + hierarchy via **ECHO parent edge** (Task.taskSet field dropped;
      `Query.children()`); `Chat.outline` scratch surface (project chats resolve the project's
      outline via the parent edge); checklist markdown helpers + promotion helpers on
      `@dxos/types` Outline; planning skill edits checklist markdown (title-keyed
      update-tasks); plan-reminder reads unchecked items; **delegation = promotion**
      (delegate-task creates a durable in-progress Task, assignee role `assistant`; supervisor
      reconciles over task-set children; onComplete marks the Task and checks off the
      checklist line; no `agentPid` on tasks — mapping is runtime-side); TaskList renders the
      checklist; legacy linear skill drops per-issue container mapping. Full repo build green;
      tests: types 21, compute 46, toolkit 68, space 42, outliner 9, github 9, linear 13,
      assistant 165, projects 16.
      FOLLOW-UPS: re-correlate live sub-agent trace activity in TaskList via a Process
      annotation carrying the task ref; reactive parent-project outline resolution in
      ChatTaskList; promotion eval (agent promotes, human completes, reconcile observes).
- [ ] **Phase 2 — plugin-outliner → plugin-tasks takeover** — CORE DONE 2026-08-01:
      plugin renamed (`@dxos/plugin-tasks`, `org.dxos.plugin.tasks`, `TasksPlugin`, all
      dependents + lockfile + vite entry); `TaskOperation` verbs
      (taskCreate/taskUpdate/taskComplete/taskAssign — parent-edge filing, sub-task support,
      4/4 handler tests); `TaskSetArticle` (Linear-order status groups, Actor-aware assignee
      chips, role-aware: bare list as Section embed, surface-registered, story);
      ProjectArticle **Goals** (read-only GoalList) + **Tasks** (per-TaskSet Section surface
      embed — composition via surfaces, no cross-imports) sections.
      `@dxos/react-ui-task` (private): reusable `TaskList` with CRUD callbacks (create row,
      done toggle, delete, select; status grouping; AssigneeChip) — TaskSetArticle consumes it
      with CRUD wired to TaskOperation verbs; storybook smoke 2/2 in Chromium. Candidate second
      consumers: plugin-assistant chat task list (currently checklist-form), kanban adoption.
      REMAINING: templates scaffold/adopt a TaskSet; app-graph task nodes under a project;
      goals authoring UI (OBSOLETED by M6 — goals removed, milestones replace; becomes milestone
      authoring); stories-projects play test; kanban adoption (separate PR per §9.2).
- [~] **Phase 4 — MCP verbs** — DXOS SIDE MERGED 2026-08-03 as PR #12440 (edge side pending). Ownership
  RATIFIED (MILESTONE-5 §7.3): **dxos defines, edge projects**; an edge-only tool is a
  contract defect. Contract in §7.4.
  SHIPPED HERE: `McpToolAnnotation` in @dxos/compute/Operation — the pipeable
  `Operation.mcpTool(...)` combinator plus `getMcpTool`, carrying name/description/safety/aspect.
  **Verified that the annotation survives `Operation.serialize`**, which is what lets edge read
  the tool list off the operation registry instead of a curated table; `taskList` (filters taskSet/project/status/assignee/
  includeSubtasks, opaque `after` cursor + `limit`) — closes the edge-only exception;
  `projectList`/`projectGet`/`projectUpdate`; `outlineGet`/`outlineUpdate` (item-wise upsert
  preserves prose); all 12 verbs annotated; serialize guards in both plugins assert the
  annotation round-trips. Tests: plugin-tasks 21, plugin-projects 21, compute 46.
  FINDINGS: (1) `projectCreate`/`createChat`/`createRoutine` are **NOT projectable** — they
  resolve `Capability.Service` (templates/plugin registry), app-only; remote project creation
  would need a capability-free path, not a projection. (2) The projected project definitions
  live in a **worker-safe leaf module** (`ProjectMcpOperation`, imports compute/echo/keys
  only) so loading them on the edge does not drag `@dxos/app-framework` /
  `@dxos/assistant-toolkit` via the creation verbs.
  EDGE SIDE (peer agent): switch projection to the annotation, delete local taskList, land
  identity-through-invokeOperation. Already green there: task write verbs verified over OAuth
  2026-08-02 (`e2e-task-smoke.mjs`, 52/52 workerd tests, branch `mcp-task-tools`).

- [x] **Checklist-loop play coverage** — 2026-08-03, PRs #12440/#12442/#12444. CI-runnable
      proof that the two-forms model closes: `WithPlanningScripted` drives `update-tasks`
      twice and asserts the title-keyed upsert rewrites items in place rather than appending
      duplicates; `WithSubAgentsTest2` asserts delegation adds an **unchecked** checklist item
      and that `onComplete` **checks it off** after the sub-agent finishes. Both read the real
      objects (space query → `Outline.parseChecklist`) via an `onInit` space capture and a
      polling helper, because no surface in those layouts renders the outline. Live
      counterparts `WithPlanning`/`WithSubAgentsTest1` stay `tags: ['!test']`. Teeth-checked by
      disabling the `onComplete` upsert in `delegation-strategy.ts` — the story failed, then
      passed on restore. Scripted stories must leave **no open checklist items** at the end, or
      the end-of-request plan reminder consumes an extra scripted turn and the story flakes.
      NOT DONE: no `promote-task` verb, so outside delegation the agent still cannot create a
      durable Task — the TaskList column fills only via delegation or a human convert-to-task.

- [ ] **Phase 5 — MCP-first dogfood** (alongside 2–4) — this milestone as a Project in the
      shared space; goals/tasks mirrored; task-planning skill registry `tasksDxn` once the sync
      spec lands; Claude Desktop demo over the tunnel.

## Milestone 6: cleanup project data model — uni-directional refs, milestones, delete guards

Designed 2026-08-14 (josiah × claude, session branch `claude/projects-task-sets-modeling-b5rk70`).
Design: DESIGN.md § "Cleanup project data model" (covers `Project` slimming and, as a subset, the
task/milestone model) and § "Routine staleness and deletion guards". `Project` slimming is the
overarching change; the task model is the piece of it that reaches one level down into `TaskSet`.
Supersedes M5's parent-edge containment; un-defers M5's `Milestone` under its original name —
`Milestone` over `Phase` (second pass, same day): ecosystem term, and **milestones replace
`Project.goals`** (Goal struct removed). Carries the M5 "NO MIGRATIONS (nothing deployed)"
assumption — re-confirm at Phase 1. **Sequencing (user, 2026-08-14): Phases 1–2 (basic model
changes + simplification) come first; skill/outline-first/promotion work is deliberately LATER
(Phase 3); routines are pulled out in Phase 2 WITHOUT waiting for guards — staleness (Phase 4) and
deletion guards (Phase 5) are separate planned follow-ups.**

### Phase 1 — task schema v2

- [x] **`Milestone` type** — `org.dxos.type.milestone@0.1.0` in `@dxos/types`: name, description?
      (carries "what done means" — absorbs Goal), targetDate? (`Format.DateOnly`); NO stored status.
      Registered in plugin-space `capabilities/schema.ts` + `schema.node.ts` + `schema.workerd.ts`
      and plugin-tasks `schema.workerd.ts`.
- [x] **`TaskSet` arrays** — `0.2.0 → 0.3.0`; `milestones`/`tasks` required ordered arrays, docstring
      rewritten. Derived views live on the same module (`resolveTasks`, `resolveMilestones`,
      `rootTasks`, `subTasks`, `effectiveMilestoneId`, `tasksForMilestone`, `backlogTasks`,
      `milestoneProgress`) and compare **entity ids parsed off ref URIs**, never `.target`, so they
      work on React snapshots too. Covered by `TaskSet.test.ts` (7 tests).
- [x] **`Task` refs** — `0.2.0 → 0.3.0`; `milestone?` + `parentTask?` (self-ref via
      `Schema.suspend`). PITFALL: a suspended optional schema rejects an `undefined` assignment —
      clear these fields with `delete`, not `= undefined`.
- [x] **`TaskOperation` verbs uphold the invariants** — shared `operations/task-set-membership.ts`
      (findTaskSet/findMilestoneTaskSet via the reverse-ref index, addTaskToSet, addMilestoneToSet,
      collectSubtree, removeTasksFromSet, reorder, refEntityId). NEW verbs: `taskDelete`, `taskMove`,
      `milestoneCreate`/`Update`/`Delete`/`Move`/`List`. `taskCreate` gained `parentTask` (renamed
      from `parent`) + `milestone`; `taskUpdate` gained nullable `milestone`/`parentTask` (null =
      backlog / promote to root) and refuses a re-parent into the task's own subtree.
- [x] **`TaskSetArticle` renders from the flat array** — one flat list of every task in the set,
      in array order. Delete routes through `taskDelete` rather than `db.remove`, which is what
      sweeps the array. Milestone sections with derived `done/total` were built and then removed
      (2026-08-18, user): the article shows tasks only, and `ProjectArticle` carries a read-only
      milestone list in place of the retired Goals section. NOT DONE, both follow-ups below:
      milestone grouping in the task list, and nested sub-tasks (`react-ui-task`'s `TaskList` is flat).
- [x] **Sync mapping** — linear/github: milestones now mirror as `Milestone` objects keyed by
      foreign key (both API layers extended to fetch them), `task.milestone` set from the remote
      issue and cleared on remote unassignment, membership reconciled through a shared
      `setTaskContainer` (idempotent; moves strip the ref from the old set). Remote milestone
      status is deliberately dropped — progress is derived.
      NOT DONE: **sub-issues → `task.parentTask` is not wired** — neither API layer fetches
      hierarchy (Linear needs `parent { id }` on the issues query; GitHub needs the `sub_issues`
      endpoint). Tracked as a follow-up.
- [x] **Re-confirm NO MIGRATIONS** — carried forward from M5; no migrations written. Versions
      bumped: taskSet `0.3.0`, task `0.3.0`, milestone `0.1.0`, project `0.4.0`. The onboarding
      exemplar fixture was regenerated (`pnpm run build-exemplar`) so it carries the new versions
      plus two milestones. **Re-confirm with the user before this lands if anything has deployed.**

### Phase 2 — project slimming

- [x] **`artifacts` → inline `Ref<Obj.Unknown>[]`** — Collection indirection dropped everywhere
      (skill add/list, scaffold, ProjectArticle, get-project, mailbox helpers, stories/evals).
      `handleDeleteArtifact` splices the array itself and calls `RemoveObjects` with no target,
      because that param must be a `Collection` and there no longer is one.
- [x] **Remove `Project.goals` + the `Goal` struct** — GoalList + Goals section deleted,
      `goals.label` removed, `goalCount`/`goals` dropped from the projectList/projectGet/
      projectUpdate MCP verbs. Milestones render through the TaskSet's Tasks section.
      NOT DONE: a dedicated milestone **authoring** UI (create/rename/reorder from the article) —
      milestones are currently authored through the verbs; carried forward from the obsoleted
      "goals authoring UI" item.
- [x] **Remove `Project.routines` + the routine→project parent edge** — done in CreateRoutine,
      ProjectArticle (gallery + handler gone), and all five templates.
      **Trap found while doing it:** `db.add` cascades over **refs**, not parent edges, so with
      both removed nothing in the project's graph reached a template-scaffolded routine and
      `db.add(project)` silently dropped it. Every template now persists its routine explicitly.
      Tests flipped to assert routines SURVIVE project deletion (`delete-project.test.ts`,
      `inbox-research.test.ts`), with comments marking that deliberate and pointing at Phases 4–5.

### Phase 3 — outline-first + promote-task (deliberately after the model changes)

- [ ] **Skill text: outline-first rule** — ProjectSkill + planning skill + MCP code-project skill:
      default writes are outline checklist lines; promote only for assignee / delegation / external
      mirror; fix the M5 dogfood mapping (`$track` ⇒ outline upsert, NOT `taskCreate`) in
      MILESTONE-5.md §8 and the skill instructions.
- [ ] **`promote-task` verb** — outline line → Task in the project's TaskSet (array + parent edge),
      checkbox state → `task.status`, markdown line rewritten with the `echo://` backlink (label
      follows renames); **milestone-aware**: heading find-or-creates a `Milestone`, sets
      `task.milestone`.
- [ ] **Promotion eval** — extend the checklist-loop coverage: agent promotes a line, human
      completes the Task, checklist line reflects it (the M5 follow-up, now unblocked by the verb).
- [ ] **Registry-port repair guidance** — re-port `TASKS.md`s that were bulk-minted into Tasks:
      outline near-verbatim, promote only qualifying lines (likely a handful; done items stay
      markdown). Applies to the mcp-space-service port flow (cross-stream, coordinate there).

### Phase 4 — routine staleness

- [ ] **`Trigger.disabledReason?`** — structured reason beside `enabled` — kind
      (`'stale-dependency' | 'failure' | 'user'`) plus optional offending `ref` and `at`;
      distinct from the transient failure cooldown.
- [ ] **Dispatcher pre-flight** — resolve source refs (spec.feed / cursor target / subscription
      scope) before fire; tombstoned ⇒ persist disable + reason (lazy disable is accepted — no
      deletion watcher).
- [ ] **`RunInstructions` trace warning** — dead context ref still skipped, now recorded on the run
      trace so degradation is diagnosable in `RoutineTraceCompanion`.
- [ ] **UI badges + sweep** — companion/card badge computed live from dangling source/context refs
      (`Obj.isDeleted` on resolution); space-level stale-routines list; flag-and-confirm delete
      only, never auto-delete.

### Phase 5 — deletion guards (generic; motivated here, home is app-framework/plugin-space; separate follow-up, does not gate Phase 2)

- [ ] **Guard capability + contract** — `{ appliesTo, check(objects) => GuardVerdict[] }`;
      verdict = severity (`warn | block`), message, optional subjects, and at most one
      `alternative: { label, operation, input }`; batch semantics (full deletion set, one card).
- [ ] **Delete-flow integration** — no verdicts ⇒ today's frictionless path; card composes all
      verdicts, Continue iff no block; alternative = run operation → re-run guards → complete the
      delete automatically (re-check authorizes, not the click).
- [ ] **Agent path** — typed `DeleteGuarded { verdicts }` failure; `acknowledge` param as the
      programmatic warn-level Continue; block unacknowledgeable on both surfaces.
- [ ] **Undo unit** — executed alternative + primary delete commit as one undo; costed as the
      hardest piece, design before building.
- [ ] **Consumer 1: projects/routines guard** — warn for routines that reference a project without
      being owned by it (owned ones cascade) + alternative "Delete N routines". Needs a replacement
      for `connectedRoutinesQuery`, removed with the companion.
- [ ] **Consumer 2: type-deletion guard** — block when instances/views reference the stored type +
      alternative "Delete N objects of this type" (reverse-ref machinery).

## Milestone 4 (scoping): what comes after this PR

- [ ] **Write the post-PR milestone doc** — the through-line across `Chat`, `Plan`, the delegation
      strategy, `Agent`, and the process manager, now that each has moved: `Chat` is thin and linked
      to its agent by relation; `Plan` is the conversation's task ledger driving `reconcile`/`onComplete`
      per feed; `Agent` is an identity/preset owning no conversation state; durable sessions live as
      processes. Name what each still owes the others (e.g. no plan-level completion signal, no
      arbitration between concurrent supervisors, agent identity DID unpopulated).
- [ ] **Pick a demo we can build with what exists today**, using the planning project as the subject —
      i.e. a project whose chats plan, delegate to sub-agents, and file artifacts back into the
      collection. Establish what is genuinely working end-to-end versus what needs the Phase 3 UI.
- [ ] **Reconcile with Magazine and CRM** — where those two overlap Projects (scope, artifacts,
      instructions) and where they should stay distinct; whether either becomes a project template.

## Follow-ups / deferred (design reviews)

- [ ] **Knowledge base for memory** — tracked 2026-08-01 (user), scope TBD.

- [ ] **Milestone rendering in `TaskSetArticle`** — tracked 2026-08-18 (user). The article renders
      one flat list of every task in the set; milestone sections, the backlog split, derived
      progress and the sub-task tree are all deliberately deferred. The model carries them already
      (`TaskSet.milestones`, `Task.milestone`/`parentTask`) and the derived-view helpers
      (`rootTasks`, `tasksForMilestone`, `backlogTasks`, `milestoneProgress`) are written and unit
      tested, so this is a view-layer task: reinstate the per-milestone grouping with progress in
      the header. Keep subscriptions leaf-pushed — the grouping needs each task's `milestone` and
      `parentTask` read through property atoms, never a whole-list subscription. Milestones also
      still have no create/rename/reorder UI; the five milestone verbs are agent-only for now.

- [ ] **`ProjectMcpOperation` is misnamed and its seam is unguarded** — tracked 2026-08-18 (user).
      The split from `ProjectOperation` is load-bearing but is about the _import graph_, not MCP:
      the module stays a leaf (compute/echo/keys only) so the edge operation-service and workerd can
      load the definitions without dragging `@dxos/app-framework`, `@dxos/assistant-toolkit`,
      `@dxos/ai`, `@dxos/plugin-inbox`. Tree-shaking does not help — `Operation.make(...)` runs at
      module level. Two defects: (1) the name contradicts itself, since `ProjectOperation.Create`
      is also MCP-projected (`projectCreate`), so the four CRUD tools sit either side of a seam the
      name does not describe; (2) nothing enforces the seam — a `Database.Service`-only verb added
      to `ProjectOperation`, or an app-graph import added to `ProjectMcpOperation`, breaks remote
      loading silently with no failing test. The verbs do NOT duplicate (disjoint sets, four
      distinct tool names). Preferred fix: invert the naming so the portable module keeps the plain
      `ProjectOperation` name and the app-graph verbs move to `ProjectAppOperation` — the default
      namespace is then the portable one and the heavy module justifies itself — plus a check that
      the portable module's import graph stays leaf. Keep the `MILESTONE-5.md` §7.2/§7.4 pointer.
      Pre-existing on main; deliberately not folded into #12595.

- [x] **Companion-created routines miss project scope seeding** — resolved 2026-08-18 via the
      annotation route: `SkillsAnnotation` moved from `@dxos/app-toolkit/AppAnnotation` to
      `@dxos/compute/Skill` (id-keyed, so only import paths changed — ~14 call sites), and `Project`
      now carries it (just `org.dxos.skill.project`, plain-key idiom — the artifact-type pre-binding
      was a latency optimization, dropped per user call; sessions enable those on demand). The blank
      routine template's scaffold already reads the subject type's annotation, so project routines
      seed correctly with no project-specific template. `ProjectOperation.CreateRoutine` (zero
      invokers after the toolbar change: not MCP-exposed, no UI) deleted along with
      `seedProjectScope` and `skills/keys.ts`; `create-chat` now reads the annotation instead of
      restating the key list.
- [x] **Project companion chat misses `ProjectSkill` + artifact skills** — resolved 2026-08-18 by
      the same `SkillsAnnotation` on `Project` (see above): `ChatCompanion.useSkills` reads the
      annotation, so the companion chat now binds the same skills `ProjectOperation.CreateChat`
      binds. The two chat flows' remaining differences are lifecycle/placement and cardinality only.
      Closed out 2026-08-24: `ProjectOperation.CreateChat` deleted, both create actions rewired to
      `AssistantOperation.SetCurrentChat` — a project chat is an ordinary companion chat.

- [x] **`Chat.agent` removed; linkage is the `CompanionTo` relation** — the field (phase B) was the
      edge that closed the Agent↔Chat import cycle and forced both types into one module behind
      namespace facades. `Agent` and `Chat` are now independent leaves; `Agent` owns the lifecycle, including `loadForChat`. No migration (the field shipped one day earlier at `chat@0.1.0`,
      added without a bump). `check-cycles` green; the #12370 changeset amended in place.
- [x] **Regenerate the agent-skill memoized recordings** — moot: #12357 (G2 → C) deleted
      `skills/{agent,planning}/skill.test.ts` outright, taking the failing `expense tracking list`
      with them. Merged in on this branch; the replacement deterministic tests were updated for the
      lifecycle move.
- [x] **`LegacyCompanionTo` migration deleted** — it held the kebab-case `companion-to` typename so
      #10895 could migrate it to `companionTo`, but 266d56cbc5 swept that typename to camelCase too,
      so both classes shared a DXN for ~10 weeks and the migration mapped a type onto itself.
      Restoring it would mean an escape hatch past the camelCase validator in `@dxos/keys` (both the
      compile-time `Name<T>` and the runtime regex reject a hyphenated final segment) for a migration
      whose nine siblings from #10895 were all already deleted. Removed it and plugin-assistant's
      migration capability.
- [x] **echo-client: nested records from detached objects** — assigning one into a database-backed
      object threw `Object references must be wrapped with Ref.make`, because the copy-on-assign path
      (`isEchoObjectField`) only recognized `EchoReactiveHandler` proxies; a detached object's record
      is an in-memory proxy and fell through to the root guard. Added `isDetachedObjectField` using
      `Entity.isEntity` as the handler-agnostic root test. Retires the hand-spread workaround in
      `assistant-toolkit`'s `syncObjects`, which had no tests and now has three. Tags were never
      affected (refs take an earlier branch) — asserted so a reordering is caught.

- [x] **plugin-markdown ops resolve LLM-provided refs via the db** — `ref.tryLoad is not a
function` when a tool-call `doc` ref decodes without a resolver; the five doc-ref ops
      (update/create-branch/create-checkpoint/get-history/merge-branch) now use
      `Database.resolve(doc, Markdown.Document)` (typed check included). Residual follow-up:
      `Database.load`'s bare `.tryLoad()` assumption still bites any other op taking refs
      from LLM args.
- [ ] **Agent-skill `planning` memoized test gated** (`it.scoped.skip`) — recordings embed
      nondeterministic tool-error recovery and cannot replay-converge; covered live by
      `planning.eval.ts`. Un-gate only if recording strategy changes.

- [x] **Possibly move Project type from @dxos/compute to plugin-projects at end** — rejected 2026-08-19: `pipeline-email` (core) consumes Project, and core cannot import a plugin; the compute/assistant-toolkit placement rule is recorded in `packages/core/compute/compute/src/types/AUDIT.md`.
- [x] **Review CompanionTo reuse for project chats** — superseded: `CompanionTo` is deleted; ALL chats (companion, project, agent) use the ECHO parent edge — see the parent-edge normalization entry below. Agent-roster linkage still open.
- [ ] **Promote the `Obj.setParent` ref-less-edge warning to an invariant** — landed on PR #12675:
      `Obj.setParent` warns when the parent holds no ref to the child (data or object annotation);
      `Chat.CompanionChatAnnotation` covers every chat link. Remaining: sweep the ~60 `setParent`
      call sites repo-wide (watch the parent-edge-without-a-ref warning in test logs) — known
      offenders: sub-task edges (parent task holds no ref down; hierarchy is the child's
      `parentTask`), some task-add paths, story fixtures — then replace the warn with `invariant`.
      Thread: https://github.com/dxos/dxos/pull/12675#discussion_r3816670221
- [x] **Rename `packages/core/echo/echo/src/Err.ts` → `Error.ts`** — DONE 2026-08-20: subpath is
      `@dxos/echo/Error`, barrel namespace is `Error`; modules that also use the global alias as
      `EchoError` locally.
- [ ] **Derive tool names from DXN keys** (approved 2026-08-19; chip spawned) — replace `makeToolName(meta.name)` with key-derived names (`markdown-create`), unify with `Skill.toolDefinitions`, add `Skill.toolName()` helper + bind-time uniqueness invariant, sweep hardcoded names, regenerate fixtures + the tool AUDIT. Decision record: `packages/core/compute/assistant/src/tool-runtime/AUDIT.md`.
- [ ] **Record the live-model fixture for the Project conversation test** — `packages/core/compute/assistant-toolkit/src/skills/project/conversation.test.ts` gates its live flavor with `.skip`; run `DX_UPDATE_MODEL_FIXTURES=1 moon run assistant-toolkit:test -- src/skills/project/conversation.test.ts` with 1p credentials, commit `.store/conversations/**`, drop the `.skip`.
- [x] **Normalize Chat ownership onto the ECHO parent edge** — DONE on this branch: `Filter.hasParent`
      landed in `@dxos/echo`; all `CompanionTo` write/read sites migrated to `Obj.setParent` /
      `children()` / `Obj.getParent`; `standaloneChatsQuery` is `hasParent(false)`; `CompanionTo`
      deleted (pure drop, no migration — pre-launch). Audit:
      `packages/core/compute/compute/src/types/AUDIT.md`.
- [ ] **Unify project-context binding** across companion and standalone chats (shared hook keyed on the chat's parent) — closes the late-added-skills gap.
- [ ] **Remove plugin-sidekick** — obviated (AUDIT.md notes it); deletion is a separate change.
- [ ] **Consider merging plugin-routine into plugin-projects** — boundary is thin post-Routine-move.
- [ ] **Editor.View accent focus defaults** — removed on this branch; NotebookCell opted back in; audit remaining call sites if focus affordances look off elsewhere.
- [ ] **Test gaps** — live-AI chat-binding story (instructions/skills actually reach the system prompt); Playwright e2e create-project → article → companion chat; Project.test.ts contextBindings objects assertion is count-only; commands.ts redundant Enter keymap cleanup.
- [ ] **Daily goals/priorities agent** (requested 2026-08-13) — an agent that asks the user a few
      questions each day about goals and priorities, and answers questions from current knowledge.
      Two separable halves: the SCHEDULE (a daily routine/trigger running the question loop and
      writing the answers back into the project) and the KNOWLEDGE side (answering from the
      project's existing Tasks/Plan/Milestones plus chat history, so the daily questions stay
      non-redundant and shrink as the model of the user's goals fills in — an agent that re-asks
      what it already knows is the failure mode to design against). Open: where the answers land.
      UPDATED by M6 (goals removed, milestones replace): the answers' likely home is the TaskSet's
      milestones (+ the outline for free-form notes) rather than a goals surface or a new type.
