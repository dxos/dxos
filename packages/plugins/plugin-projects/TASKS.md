# plugin-projects — Tasks

_Resume: #12335, #12365, #12370, #12383, #12386 all MERGED — nothing in flight; the branch is level with `origin/main`. The project stays **active**: #12388 (docs-only, would have moved the registry entry to `ended`) was CLOSED unmerged. The two deliberately-unresolved items are now post-land follow-ups, not gates: (1) the context/artifact model across Chat/Routine/Project/Agent/Instructions (`instructions.objects` vs `Project.artifacts`) — the shipped change is UI-only, so the decision is still owed before any schema change; (2) MAJOR, needs Josiah: the URL binding for project chats. Next: re-open the context/artifact decision before any further schema work. Uncommitted: none._

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
      chats pre-bind the artifact-type skills, and `create-object` points at type-specific create tools.
      USER-VERIFIED LIVE on the #12386 preview, 2026-07-29. Model-behavioral, so a single run is not a
      guarantee — `assistant-evals` `projects.eval.ts` remains the repeatable check and has not been run.
- [x] **PR strategy decision** — moot: the three MS2 commits shipped inside #12335's squash; verified present on main (ProjectArticle `getReactiveOrUndefined`, format.ts `## Instructions` + `<label>`, Projects.stories.tsx, minimal plugin set).
- [ ] **PLUGIN.mdl for plugin-projects** — as-built record now that implementation settled.
- [ ] **Commands-authoring UI** — InstructionsEditor edits text/skills only; `commands` currently data-only despite autocomplete shipping.
- [x] **In-article routine creation** — `ProjectOperation.CreateRoutine` toolbar action scaffolds the blank template through `RoutineOperation.CreateRoutine`, links it into `project.routines`, and opens it. Routines and artifacts now share one `ObjectGallery` (masonry of `ObjectCard`, click to open, ⋮ delete).
- [x] **Hide `instructions.objects` from the form** — interim step toward the BLOCKING decision below: the field is no longer rendered by `InstructionsEditor` (so it no longer reads as a second artifacts list) but the schema field and every runtime consumer are untouched. Affects the routine form and the Agent article too.
- [ ] **App-graph Project node children: artifacts + routines** — Phase 3 adds the chat children and the branch-node plumbing; these two reuse it.
- [ ] **ProjectOperation.Create + operation-handler/events** — extension point 2 (other plugins create/target projects).
- [ ] **Project templates capability** — plugins contribute instructions+skills+routines presets (mirrors automation-templates).
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
   outright silently strips context from every routine (`RoutineCompanion` demonstrates exactly this
   wiring). A routine would need either its own context field or a project it inherits scope from.

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

- [ ] **Groundwork PR** — routine project-scope binding (`RunInstructions` + `CreateRoutine`);
      `ProjectOperation.Create` (+ `AddArtifact` alias); `ProjectsCapabilities.Template` + create-flow
      picker; `ARTIFACT_SKILL_KEYS` += table, sheet; ProjectArticle context section
      (`instructions.objects` rendered as labeled Context gallery with add/remove).
- [ ] **UC-A sender ledger** — plugin-inbox "Inbox research" project template + mailbox entry point;
      `stories-projects` package + `SenderLedger.stories.tsx`; idempotent-upsert test.
- [ ] **UC-B sender research** — CRM routine template ported to a project template; artifact filing
      dedupe verified; `SenderResearch.stories.tsx`.
- [ ] **UC-C fact summaries** — analyze-mailbox operation-action routine template; brain skill in
      project instructions; `FactSummaries.stories.tsx`; `sender-ledger`/`fact-summary` evals.
- [ ] **Operations-as-tools gaps (USE-CASES.md §2.7)** — authoring UI for operation-action routines
      (operation picker + input-mapping form; templates-only today); `{{project.*}}` trigger input
      substitution (scaffold-time ref literals bind a routine to one object forever); side-effect
      policy for model-invoked external operations (send/unsubscribe need a per-project allowance).

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

- [ ] **Possibly move Project type from @dxos/compute to plugin-projects at end** — revisit once the plugin's shape settles.
- [x] **Review CompanionTo reuse for project chats** — resolved in milestone 3: companion chat keeps `CompanionTo`; owned sessions use the ECHO parent edge. Agent-roster linkage still open.
- [ ] **Unify project-context binding** across companion and standalone chats (shared hook keyed on the chat's parent) — closes the late-added-skills gap.
- [ ] **Remove plugin-sidekick** — obviated (AUDIT.md notes it); deletion is a separate change.
- [ ] **Consider merging plugin-routine into plugin-projects** — boundary is thin post-Routine-move.
- [ ] **Editor.View accent focus defaults** — removed on this branch; NotebookCell opted back in; audit remaining call sites if focus affordances look off elsewhere.
- [ ] **Test gaps** — live-AI chat-binding story (instructions/skills actually reach the system prompt); Playwright e2e create-project → article → companion chat; Project.test.ts contextBindings objects assertion is count-only; commands.ts redundant Enter keymap cleanup.
