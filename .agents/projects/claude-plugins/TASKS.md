# DXOS Claude Code Plugins — Tasks

_Resume: PR #12618 MERGED 2026-08-15 (`526147b39e`) — phases 1, 1b and 2's code all landed, and the
`dxos` marketplace publishes `dxos-project` from `main`. The `mcp` backend has still never touched a
running space: next is the live round-trip (`dx mcp serve` up, `DX_PROJECT_BACKEND=mcp`, one list →
new → track → tasks cycle checked in Composer). Two local steps first — restart so the plugin loads
from `main`, and re-point the local `dxos` marketplace, which still sources from a deleted worktree.
Uncommitted: none. Last: tracked Phase 3, modelling the user._

## Phase 1: Extract into a distributable plugin

`/project` and the `task-planning` skill were repo-local: a hook wired into
`.claude/settings.json`, a command file, and a skill under `.agents/skills`.
Nothing about them is DXOS-specific, but nothing about them was portable either.
This phase makes them a plugin that works in any repo, without pulling the DXOS
SDK skills along.

### Tasks

- [x] **Scaffold the plugin** at `tools/claude/plugins/dxos-project` — `plugin.json`
      (namespace `dxos-project`, so invocation is `/dxos-project:project`), `hooks/hooks.json`
      registering `UserPromptSubmit`, `commands/project.md`, and the moved
      `skills/task-planning/SKILL.md`. `claude plugin validate` passes.
- [x] **Backend seam** — every directive now states the OPERATION only, and
      `resolve_backend` appends one `BACKEND:` line saying HOW. Configured by
      `DX_PROJECT_BACKEND` (`file`) and `DX_PROJECT_REGISTRY`
      (`.agents/projects/registry.yml`). Phase 2 replaces one function; the
      verbs, command file and skill are untouched.
- [x] **Handle a repo with no registry** — read verbs report the absence and
      offer `/dxos-project:project new`; `new` creates the file with empty `projects`/
      `ended` before adding its entry. Previously the file was assumed to exist.
- [x] **Genericise the skill** — registry location is described as
      backend-resolved rather than hardcoded; `<registry-dir>` replaces the
      literal `.agents/projects` in the scaffold rule.
- [x] **Accept both invocation forms** — `/dxos-project:project` (namespaced, as plugins
      always are) and bare `/project`, both first-line anchored.
- [x] **Marketplace manifest** at `.claude-plugin/marketplace.json` (name
      `dxos`), so `claude plugin marketplace add dxos/dxos` works with no new
      repo.
- [x] **Dogfood in this repo** — deleted `.claude/hooks/track.sh` and
      `.claude/commands/project.md`, moved the skill out of `.agents/skills`,
      and enabled `dxos-project@dxos` via `extraKnownMarketplaces` + `enabledPlugins`.
      Docs updated in `.claude/README.md` and `.claude/CLAUDE.md`.
- [x] **Verify in a foreign repo** — a scratch `git init` repo with no `.agents/`
      and no DXOS anything: read verbs report the missing registry, `new`
      dispatches, and after scaffolding the backend resolves to the real file.
      `DX_PROJECT_REGISTRY` override honoured.
- [ ] **Live verification after a session restart** — every test so far feeds
      JSON to the hook directly. The plugin path (marketplace resolution,
      `${CLAUDE_PLUGIN_ROOT}` expansion, `/dxos-project:project` autocomplete) is only
      exercised once Claude Code reloads plugins. Run `/dxos-project:project` and confirm
      the directive arrives from the plugin rather than a stale `.claude/` hook.
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
- [x] **Rename `dx` -> `dxos-project`** — the plugin name collided with the DXOS `dx` CLI. Renamed
      across `plugin.json`, `marketplace.json`, `settings.json`, both READMEs, the command file, the
      skill, and the project docs. **The hook's own matcher was hardcoded to `/(dx:)?project` and did
      not fall out of the text rename** — it silently stopped firing on every verb until the regex
      was widened to `/(dxos-project:)?project`.
- [x] **Regression-test the matcher** — 9 cases: all six verbs fire, both invocation forms fire,
      `/projects` and prose mentioning the command stay silent.
- [x] **One home for Claude plugins** — moved `tools/composer-plugin-dev` (Dima's, unmaintained
      since 2026-05-01 apart from sweeps) to `tools/claude/plugins/composer-plugin-dev` and fixed
      its two self-referencing paths.
- [x] **Decided `composer-plugin-dev`'s fate** — DROPPED from the marketplace manifest (user,
      2026-08-15). It was briefly listed, since it had sat on main in no manifest and so had always
      been uninstallable; the decision is not to publish it. The files stay at
      `tools/claude/plugins/composer-plugin-dev/` but ship to nobody, and the live Composer-authoring
      guidance remains `.agents/skills/composer-plugins/SKILL.md` (656 lines, in-repo audience).
      `dxos` therefore publishes exactly one plugin.
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
      edge server) up, `DX_PROJECT_BACKEND=mcp`, and one `/dxos-project:project list` → `new` →
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
  - **What consumes it.** At minimum: which project `/dxos-project:project` resolves to, how the
    `list` table is ordered, and what "next action" a resume proposes. Availability should also
    gate whether the agent asks a blocking question at all.
  - **The privacy boundary.** This is a model of a person, committed to a repo or synced to a
    space. Decide what is never recorded before recording anything.

### References

- Plugin: `tools/claude/plugins/dxos-project/` · [README](../../../tools/claude/plugins/dxos-project/README.md)
- Predecessor work: `.agents/projects/agent-directives/` (PRs #12453, #12463)
- Hook reference: https://code.claude.com/docs/en/hooks
- Plugin reference: https://code.claude.com/docs/en/plugins-reference
