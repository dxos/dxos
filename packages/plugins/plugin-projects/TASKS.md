# plugin-projects — Tasks

_Resume: milestone 3 (project chats) is DESIGNED AND APPROVED, not yet implemented — start at the first Phase 3 task (`bindings` input on `AssistantOperation.CreateChat`). PR #12335 MERGED (2026-07-25, squash f7d7735615) carried milestones 1–2; nothing unpushed from those. This worktree branches from main tip; local commits are docs only. Uncommitted: none._

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
- [ ] **P1 remaining: delete flow** — verify navtree ⋮ delete for projects; ALSO: intermittent "first click into empty deck attends but opens no plank" (repro needed).
- [x] **PR strategy decision** — moot: the three MS2 commits shipped inside #12335's squash; verified present on main (ProjectArticle `getReactiveOrUndefined`, format.ts `## Instructions` + `<label>`, Projects.stories.tsx, minimal plugin set).
- [ ] **PLUGIN.mdl for plugin-projects** — as-built record now that implementation settled.
- [ ] **Commands-authoring UI** — InstructionsEditor edits text/skills/objects only; `commands` currently data-only despite autocomplete shipping.
- [ ] **In-article routine creation** — (the project-scoped chat list moved to Phase 3).
- [ ] **App-graph Project node children: artifacts + routines** — Phase 3 adds the chat children and the branch-node plumbing; these two reuse it.
- [ ] **ProjectOperation.Create + operation-handler/events** — extension point 2 (other plugins create/target projects).
- [ ] **Project templates capability** — plugins contribute instructions+skills+routines presets (mirrors automation-templates).
- [ ] **"/" completion of commands (and "@", "$")** — unify chat-prompt completion triggers.
- [ ] **inbox naming sweep** — action id 'create-topic' + Attention.linkedSegment('topic') → 'project' (verify companion segment resolution after rename).

## Phase 3 / milestone 3: project chats

Start a chat session from a project with the project already in scope, and see that
session in the navtree under its project. Design: the "Milestone 3: project chats"
section of [`./DESIGN.md`](./DESIGN.md). Decisions (user, 2026-07-27): ECHO parent edge (no schema
change), new chat opens as a deck plank, toolbar scoped to chat creation only, bindings
applied once at creation.

### Tasks

- [ ] **`bindings` input on `AssistantOperation.CreateChat`** — optional
      `{ skills?, objects? }` passed to the binder it already constructs.
- [ ] **`ProjectOperation.CreateChat`** — invoke `AssistantOperation.CreateChat` with
      `Project.contextBindings(project)` + the project ref, `Obj.setParent(chat, project)`,
      `LayoutOperation.Open`. No `SpaceOperation.AddObject` (would file it in the root
      collection).
- [ ] **`projectChats` graph extension** — `children()` query → `AppNode.makeObject` per
      chat; `url` reuses the `chat` key with a parent-resolving dynamic path.
- [ ] **Exclude project chats from the top-level Chats section** — plugin-assistant's
      section query, alongside the existing `CompanionTo` exclusion.
- [ ] **`ProjectArticle` toolbar** — `Panel.Toolbar` + `IconButton`; same action on the
      project's navtree node (`list-item-primary`).
- [ ] **Tests** — unit (enumeration, parenting + binding pass-through), story play test
      (toolbar creates a chat, appears in the list), live verify (instructions reach the
      system prompt in a standalone plank; navtree children survive a cold deep link).
- [ ] **Watch item** — if `children()` does not re-emit in the graph connector when a chat
      is newly parented, fall back to a `chats: Ref<Collection>` field on Project
      (0.2.0 → 0.3.0 bump + migration); only the enumeration source changes.

## Follow-ups / deferred (design reviews)

- [ ] **Possibly move Project type from @dxos/compute to plugin-projects at end** — revisit once the plugin's shape settles.
- [x] **Review CompanionTo reuse for project chats** — resolved in milestone 3: companion chat keeps `CompanionTo`; owned sessions use the ECHO parent edge. Agent-roster linkage still open.
- [ ] **Unify project-context binding** across companion and standalone chats (shared hook keyed on the chat's parent) — closes the late-added-skills gap.
- [ ] **Remove plugin-sidekick** — obviated (AUDIT.md notes it); deletion is a separate change.
- [ ] **Consider merging plugin-routine into plugin-projects** — boundary is thin post-Routine-move.
- [ ] **Editor.View accent focus defaults** — removed on this branch; NotebookCell opted back in; audit remaining call sites if focus affordances look off elsewhere.
- [ ] **Test gaps** — live-AI chat-binding story (instructions/skills actually reach the system prompt); Playwright e2e create-project → article → companion chat; Project.test.ts contextBindings objects assertion is count-only; commands.ts redundant Enter keymap cleanup.
