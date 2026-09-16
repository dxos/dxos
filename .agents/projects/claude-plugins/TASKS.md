# DXOS Claude Code Plugins — Tasks

_Resume: PRs #12618 + #12620 MERGED — the `dxos` marketplace publishes `dxos` from `main`, and
`/dxos:project` is verified working in a live session. #12622 is open, carrying the
`history`/`spawn`/`help` verbs. The `mcp` backend has still never touched a running space: next is
the live round-trip (`dx mcp serve` up, `DX_PROJECT_BACKEND=mcp`, one list → new → track → tasks
cycle checked in Composer). Uncommitted: none. Last: added Phase 4 (consolidate to one MCP-native
`project` skill, from the 2026-08-19 project-skills audit) — gated on the Phase 2 round-trip.
2026-08-20: #12616 landed (skills are the atomic unit of MCP projection) — Phase 4's operation
contract is largely done (projectCreate projects, tools-list membership); next is the round-trip,
then absorb the deprecated toolkit skill and rename codeProject → project. 2026-08-21: #12692
replaced per-operation tools with the generic `queryOperations`/`invokeOperation`/`loadSkill`
surface (7 tools where there were 27) — the hook's `mcp` directive is rewritten for it, which
unblocks the round-trip. 2026-08-21: the consolidation landed — one `project` skill in
plugin-projects (toolkit skill absorbed, `codeProject` renamed, prose consolidated), full workspace
build green. NEXT: the live round-trip, then the plugin stub + bundled `dx mcp serve`._

## Phase 1: Extract into a distributable plugin

`/project` and the `task-planning` skill were repo-local: a hook wired into
`.claude/settings.json`, a command file, and a skill under `.agents/skills`.
Nothing about them is DXOS-specific, but nothing about them was portable either.
This phase makes them a plugin that works in any repo, without pulling the DXOS
SDK skills along.

### Tasks

- [x] **Scaffold the plugin** at `tools/claude/plugins/dxos` — `plugin.json`
      (namespace `dxos`, so invocation is `/dxos:project`), `hooks/hooks.json`
      registering `UserPromptSubmit`, `commands/project.md`, and the moved
      `skills/task-planning/SKILL.md`. `claude plugin validate` passes.
- [x] **Backend seam** — every directive now states the OPERATION only, and
      `resolve_backend` appends one `BACKEND:` line saying HOW. Configured by
      `DX_PROJECT_BACKEND` (`file`) and `DX_PROJECT_REGISTRY`
      (`.agents/projects/registry.yml`). Phase 2 replaces one function; the
      verbs, command file and skill are untouched.
- [x] **Handle a repo with no registry** — read verbs report the absence and
      offer `/dxos:project new`; `new` creates the file with empty `projects`/
      `ended` before adding its entry. Previously the file was assumed to exist.
- [x] **Genericise the skill** — registry location is described as
      backend-resolved rather than hardcoded; `<registry-dir>` replaces the
      literal `.agents/projects` in the scaffold rule.
- [x] **Accept both invocation forms** — `/dxos:project` (namespaced, as plugins
      always are) and bare `/project`, both first-line anchored.
- [x] **Marketplace manifest** at `.claude-plugin/marketplace.json` (name
      `dxos`), so `claude plugin marketplace add dxos/dxos` works with no new
      repo.
- [x] **Dogfood in this repo** — deleted `.claude/hooks/track.sh` and
      `.claude/commands/project.md`, moved the skill out of `.agents/skills`,
      and enabled `dxos@dxos` via `extraKnownMarketplaces` + `enabledPlugins`.
      Docs updated in `.claude/README.md` and `.claude/CLAUDE.md`.
- [x] **Verify in a foreign repo** — a scratch `git init` repo with no `.agents/`
      and no DXOS anything: read verbs report the missing registry, `new`
      dispatches, and after scaffolding the backend resolves to the real file.
      `DX_PROJECT_REGISTRY` override honoured.
- [x] **Live verification** — DONE 2026-08-15 without waiting for a restart: `claude -p` runs a real
      session, so the plugin path was driven headlessly from a scratch repo outside the monorepo
      (`git init`, a one-entry registry, a `.claude/settings.json` naming the marketplace).
      `/dxos:project list` rendered the numbered table and `track` created a well-formed
      `TASKS.md` at the registry's path — marketplace resolution, `${CLAUDE_PLUGIN_ROOT}` and the
      command namespace all exercised for real.
      **THE INSTALL GAP, which cost an afternoon of "nothing works":** `extraKnownMarketplaces` in
      `settings.json` registers the MARKETPLACE but `enabledPlugins` does NOT install the PLUGIN.
      The marketplace shows up in `claude plugin marketplace list` while `claude plugin list` stays
      empty, and every invocation returns `Unknown command`. The fix is one command, and it belongs
      in any onboarding doc: `claude plugin install dxos@dxos`.
- [ ] **Decide whether the repo should self-install** — since `enabledPlugins` alone does not
      install, a fresh clone of this repo gets `Unknown command` until someone runs
      `claude plugin install`. Either document it in `.claude/README.md` or find a settings key that
      installs rather than merely enables.
- [ ] **Decide the `/mode` question** — `/mode` stays repo-local for now. It is
      equally generic and would fit the same plugin, but it was explicitly out of
      scope for this extraction.

## Phase 1b: Recovery, rename, and a two-plugin marketplace (2026-08-15)

Phase 1 was built in a worktree that was later deleted; its two commits survived only as dangling
objects, recoverable until the next `git gc`. This phase recovers them and settles the naming and
layout the marketplace publishes under.

### Tasks

- [x] **Recover the stranded commits** — cherry-picked `1b372e1ee0` (the extraction) and
      `f3747b9511` (the marketplace description) off the deleted worktree's dangling history. One
      conflict, in `SKILL.md`: main had added a `docs/` path segment while the plugin generalised
      the path to `<registry-dir>`; resolved to the generalised form without `docs/`, which is what
      every real registry entry actually uses.
- [x] **Rename `dx` -> `dxos-project` -> `dxos`** — `dx` collided with the DXOS CLI, and
      `dxos-project` produced the stutter `/dxos-project:project`, since the invocation is
      `/<plugin>:<command>` and both halves named the same concept. Settled on plugin `dxos` +
      command `project` = `/dxos:project`, which also leaves room to bundle further commands.
      Renamed across `plugin.json`, `marketplace.json`, `settings.json`, both READMEs, the command
      file, the skill, and the project docs. **The hook's own matcher is hardcoded to the namespace
      and does NOT fall out of a text rename** — the first pass left `/(dx:)?project` and the hook
      silently stopped firing on every verb. Widen it with the name, every time.
- [x] **Regression-test the matcher** — 9 cases: all six verbs fire, both invocation forms fire,
      `/projects` and prose mentioning the command stay silent.
- [x] **One home for Claude plugins** — moved `tools/composer-plugin-dev` (Dima's, unmaintained
      since 2026-05-01 apart from sweeps) to `tools/claude/plugins/composer-plugin-dev` and fixed
      its two self-referencing paths.
- [x] **Deleted `composer-plugin-dev`** (user, 2026-08-15) — first dropped from the marketplace
      manifest, then removed entirely. Reconciling its `SKILL.md` against
      `.agents/skills/composer-plugins/SKILL.md` settled it: the live skill has 27 commits since May
      and was last touched 2026-08-09, while the plugin's had none since it was created 2026-05-01.
      Worse than stale — its references teach `AppPlugin.add*Module`, which **PR #12414 deleted**
      (`AppPlugin` now appears in zero source files), so anyone following it wrote code that would
      not compile. `dxos` therefore publishes exactly one plugin.
      Lost with it, and worth rebuilding if community plugins become a priority: the
      external-author framing and the packaging/publishing topics (vite config, GitHub release with
      `manifest.json` + `plugin.mjs`, registration via `dxos/community-plugins`) — none of which the
      in-repo skill covers.
- [x] **Closed `task-planning-skill`** — moved to the registry's `ended` list (user, 2026-08-15).
      Its files now live in this plugin and its one open follow-up, testing the skill in a clean
      repo, was answered by the extraction itself.

## Phase 2: Composer MCP backend

Replace the file store with the DXOS Composer MCP server so projects and tasks
are live objects rather than committed YAML — shared across repos and machines,
and editable outside the agent.

### Tasks

- [x] **Implement `resolve_backend` for `mcp`** — the `BACKEND:` line now names the object mapping
      and the tools rather than a file path, built against the surface `dx mcp serve` actually
      exposes: `projectList`/`projectGet`/`projectUpdate`, `outlineGet`/`outlineUpdate`,
      `projectCreate`, and `taskList`/`taskCreate`/`taskComplete`/`taskAssign`. The mapping follows
      `plugin-projects/MILESTONE-5.md` §8: registry entry = `Project`, TASKS.md = `Project.outline`,
      checked items = promoted `Task`s, DESIGN.md = an artifact document. `DX_PROJECT_SPACE` names
      the space; otherwise the agent resolves it with `listSpaces`.
      `new` maps to `projectCreate`, which scaffolds the instructions/artifacts/TaskSet graph in one
      call and returns the `taskSet` reference for `taskCreate`.
- [x] **Decided the fallback rule** — NO cascade. When a needed tool is absent the agent says so and
      stops; it never degrades to the file backend. A write landing in a file the user believes is
      dead is the exact divergence this backend exists to prevent, and a silent fallback would make
      the two stores disagree without anyone noticing.
- [x] **Reconciled the two stores** — one or the other, selected by `DX_PROJECT_BACKEND`. Under
      `mcp` the directive states that `registry.yml` is a stale mirror and must not be read or
      written, which matches MILESTONE-5.md §8: once the loop is live the repo copy becomes the
      mirror, not the source.
- [ ] **Live round-trip** — none of this has touched a running space. Needs `dx mcp serve` (or the
      edge server) up, `DX_PROJECT_BACKEND=mcp`, and one `/dxos:project list` → `new` →
      `track` → `tasks` cycle checked in Composer. This is the acceptance test in MILESTONE-5.md §8
      ("readable from both Composer and MCP without divergence").
- [ ] **Migrate this repo's registry** once the round-trip passes — 34 active projects and their
      TASKS.md ledgers become Projects + outlines. Needs an import path, not hand-entry.

## Phase 3: Model the user

Tracked 2026-08-15 (user). Today the planning agent models the _work_ — projects, ledgers, open
items — and nothing about the person doing it. Every prioritisation it offers is therefore made
blind: it cannot tell what the user is trying to achieve this week, which of 34 active projects
actually matters, whether they have ten minutes or a day, or that a "next action" it proposes needs
someone who is asleep.

### Tasks

- [ ] **Model the user alongside the work** — state, goals, priorities, availability. Open design
      questions, all of which need answering before any of it is built:
  - **What is modelled.** Goals and priorities are durable and user-authored; state and
    availability are volatile and mostly inferred. Those two halves probably want different
    storage and different trust rules.
  - **Where it lives.** A `Person`/`Actor` object in the space is the obvious home under the `mcp`
    backend, and it makes the model editable in Composer rather than trapped in the agent. The
    `file` backend has no equivalent — worth deciding whether this is `mcp`-only.
  - **How it is populated.** Asking the user directly is reliable but expensive (the
    minimise-round-trips rule cuts against it); inference from session history is cheap and
    frequently wrong. A user-confirmed inference is likely the shape.
  - **What consumes it.** At minimum: which project `/dxos:project` resolves to, how the
    `list` table is ordered, and what "next action" a resume proposes. Availability should also
    gate whether the agent asks a blocking question at all.
  - **The privacy boundary.** This is a model of a person, committed to a repo or synced to a
    space. Decide what is never recorded before recording anything.

## Phase 4: Consolidate to one MCP-native `project` skill

Planned 2026-08-19 from the project-skills audit. The workflow prose exists in three places today —
the plugin's `SKILL.md`, the per-verb hook directives, and plugin-projects'
`code-project-skill.md` (deliberately verb-parallel, ECHO-native) — plus a fourth relative,
assistant-toolkit's `org.dxos.skill.project` (artifact filing; that name collision is the only
reason the runtime skill is called `codeProject`). End-state: ONE skill definition + operation set
in `plugin-projects`, projected by `@dxos/mcp-server`, consumed by this plugin over a bundled stdio
server; the plugin keeps `/dxos:project` as a thin alias. Gated on Phase 2's live round-trip.
Sibling work-streams: `plugin-projects` (runtime types/ops), `mcp` (server + projection),
edge `mcp-operations` (tool surface).

### Complete the operation contract

Largely landed by #12616 ("skills are the atomic unit of MCP projection", merged 2026-08-20 as
63e500bb): the skill's `tools` list now decides projection (`Operation.mcpTool` deleted),
`ProjectOperation.Create` is keyed `projectCreate` and sits in `ProjectSkill.operations`,
safety became `Operation.mutation`, observability moved to registered `ObservabilityMapping`s, and
plugin-space CRUD projects from one definition for both hosts (the CLI's hand-written object
toolkit is deleted; `Gateway`/`Server` became `McpRegistry`/`McpServer`).

- [x] **Project `projectCreate`** — landed in #12616 via `ProjectSkill.operations` membership.
      Residual: the handler still resolves templates via `Capability.getAll` — the live round-trip
      must confirm headless invoke works in the CLI registry (blank-template fallback exists).
- [x] **Operation ownership** — resolved by #12616's design, without moving code: membership lives
      solely in the skill's `tools` list; `task*`/`milestone*`/`outline*` stay in `plugin-tasks`
      (`skill-keys.ts` deleted).
- [x] **Absorbed `org.dxos.skill.project`** (2026-08-21) — `artifactAdd`/`artifactList` moved into
      `ProjectOperation` (keys under `org.dxos.operation.projects.*`) with handlers in
      plugin-projects; the toolkit skill is deleted. Consumers updated in the same change, no
      shims: `Project`'s `SkillsAnnotation`, both routine templates + tests, plugin-assistant's
      registrations, the CLI host, and two assistant-evals files (which needed a new
      `plugin-projects` dependency).
      **Consequence to watch:** the annotation is what binds skills into a chat opened on a Project
      (`create-chat.ts`, `ChatCompanion.tsx`), so a Composer project chat now loads the full
      workflow doc where it used to load ~15 lines of artifact-filing prose. If that reads as too
      much context, restructure the instructions — do not re-split the skill.
- [x] **Renamed `…skill.codeProject` → `…skill.project`** (2026-08-21) — prompt is now `/project`.
      Files renamed `ProjectSkill.ts` / `project-skill.md`; public subpath is
      `@dxos/plugin-projects/ProjectSkill`. Changeset added for the breaking export changes.
- [ ] **Skill lives in the plugin; factoring it back down is blocked** — a headless host has to
      pull the plugins in to serve the project skill. The blocker is where the operations live:
      every verb in `ProjectSkill.operations` is defined by a plugin (`plugin-space`,
      `plugin-tasks`, plugin-projects), so a lower home could only name them as strings again —
      the failure mode that put the skill here. Moving the operation definitions down is the
      prerequisite; moving the skill is not the first step.
- [ ] **An unresolvable tool is dropped, not reported** — `ToolResolverService.resolveToolkit`
      (`packages/core/compute/ai/src/tools/tool-resolver-service.ts`) demotes a resolver defect to
      `AiToolNotFoundError` and filters it out with only a `log.warn`, so a re-keyed or
      unprojectable operation costs the model a tool and nothing fails.
      `skills/project/tool-resolution.test.ts` exists solely to catch that per-skill. Make the drop
      a typed failure the caller must handle and the guard test dissolves.

### One prose source

- [x] **`project-skill.md` is the canonical doc** (2026-08-21) — gained the `spawn`/`help`/`history`
      verbs, the never-a-chip discipline rule, the resume worktree guidance, three mistake rows and
      an Artifacts section for the absorbed verbs. **`history` cannot work against the space store:**
      `Project` records no PRs, so the doc says so and stops rather than guessing from git — a real
      gap in the file→space migration, and the one verb the file backend still does better.
- [ ] **Plugin `SKILL.md` → stub** — trigger frontmatter + `allowed-tools` +
      "call `loadSkill('project')`, follow it" (the tool was renamed from `skillLoad` in #12692). Optional: a build-time copy of the canonical
      markdown with a hash check (the `skills-lock.json` pattern) if offline readability matters.
- [x] **Rewrote the `mcp` backend directive for the generic surface** (2026-08-21) — it named ten
      per-operation tools that #12692 deleted, so the round-trip would have hit the
      no-silent-fallback rule and stopped. It now describes find → `loadSkill` → `invokeOperation`
      and names operation KEYS (`org.dxos.plugin.{projects,tasks}.operation.*`, resolvable by final
      segment) instead of tool names. All ten verbs re-tested; prose stays inert.
- [ ] **Hook directives shrink to verb + args** — the HOW moves to the skill. What irreducibly
      stays hook-side: bare `/project` raw-text matching (or decide to retire the bare form and
      delete the hook entirely), plus the "needed tool absent → say so and STOP" invariant.
      Determinism is relocated, not lost: prose-directive + hand-edited YAML becomes command
      expansion + typed tool schemas validated server-side.
- [ ] **`commands/project.md` → `$ARGUMENTS` alias** over the generic surface; `allowed-tools` can
      pre-approve only `queryOperations` and `loadSkill`, using the full plugin-scoped prefix
      (`mcp__plugin_dxos_<server>__*` — matchers without the `plugin_` segment never fire for
      plugin-bundled servers). **`invokeOperation` cannot be auto-approved**: #12692 marks it
      possibly-destructive because some operation behind it is, so every verb that writes prompts.
      If that friction bites, the fix is the read/write split deferred at Milestone 9 question 2,
      not a per-operation tool — do not re-litigate it here.

### Plugin bundles the server

- [x] **Server bundled in `plugin.json`** — `mcpServers.composer`, HTTP against the deployed
      `https://composer.dxos.network/mcp`, so enabling the plugin plus one `/mcp` authenticate is
      the whole setup. Inline in the manifest rather than a sibling `.mcp.json`, which keeps one
      file to read. Named `composer` because the name is carried in every tool
      (`mcp__plugin_dxos_composer__whoami`).
- [x] **`/dxos:project setup`** — the binding verb. Necessary, not cosmetic: the hook matches bare
      `/project` too, so typing the skill's own `/project setup` was intercepted and answered with
      "verb not recognized". The directive loads the `project` skill and follows its setup section
      rather than restating the procedure, so the skill stays the single source.
- [ ] **Directive's deployed-host shape may be stale** — `resolve_backend` still says the deployed
      host "projects each verb as its own tool", but #12692 replaced per-operation tools with the
      generic `queryOperations`/`invokeOperation`/`loadSkill` surface. Confirm against the live
      worker before trusting either branch of that sentence.
- [ ] **Bundle the stdio host too** — the deployed server is the one that ships; `dx mcp serve`
      still has to be wired by hand. Blocked on a way to express both without a second plugin, or
      on deciding that overriding the entry's `url` is the whole answer.
- [ ] **Rename the plugin to `composer`** — the name `dxos` is the marketplace, the repo and the
      plugin at once, and now also sits in the middle of every bundled tool name. Costs the
      published command names (`/dxos:project` → `/composer:project`) and a reinstall for everyone
      already on `dxos@dxos`, so it wants doing before the plugin has real users, or not at all.
- [ ] **Space binding moves server-side** — serve reads `.agents/projects/space.yml` (or
      `DX_PROJECT_SPACE`) so tools arrive pre-scoped; `setup` writes the file; a missing binding is
      a typed tool error, replacing the hook's registry `stat`.

### Bridge and retirement

- [ ] **Bridge posture while the server churns** — two distinguishable surfaces: `/dxos:project` +
      `file` stays the daily driver; the space-backed `project` skill dogfoods under its own name;
      `DX_PROJECT_BACKEND` stays as the session kill switch. Never dual-write — the Phase 2
      no-cascade decision generalises to one writable store per project.
- [ ] **Optional middle step: per-project ownership** — a registry/space.yml field names the store
      per project; `list`/`resume` merge and label both stores. Gradual cutover with per-project
      rollback, at the cost of routing logic.
- [ ] **Decide the offline story BEFORE deleting the `file` branch** — either a read-only generated
      mirror (`hydrate` exports TASKS.md marked generated, plus a follow-up inbox file imported on
      next contact) or nothing (cloud sandbox/CI sessions lose project context). Hooks already do
      not run in the sandbox, so everything moved out of the hook is a net gain there.
- [ ] **Retire** — per-repo import (Phase 2's registry migration), delete the `file` branch from
      `resolve_backend` + `DX_PROJECT_BACKEND` (or keep `file` one release as a read-only
      tombstone), update docs, bump the plugin (enabling is not installing — users pick this up on
      plugin update, not repo merge).

### References

- Plugin: `tools/claude/plugins/dxos/` · [README](../../../tools/claude/plugins/dxos/README.md)
- Predecessor work: `.agents/projects/agent-directives/` (PRs #12453, #12463)
- Hook reference: https://code.claude.com/docs/en/hooks
- Plugin reference: https://code.claude.com/docs/en/plugins-reference
- Skill projection: `packages/core/compute/mcp-server/src/internal/view.ts` (prompt name = key's
  final segment; collisions throw; prompts take no parameters — `skillLoad` is the model-side
  fetch). Was `internal/projection.ts` until #12692 split it into `view.ts`/`input.ts` and folded
  `McpRegistry` into `McpServer`; the CLI host is now `commands/mcp/local-server.ts`.
- Runtime skill: `packages/plugins/plugin-projects/src/skills/project/ProjectSkill.ts` +
  `project-skill.md` (the assistant-toolkit artifact skill was absorbed into it)
