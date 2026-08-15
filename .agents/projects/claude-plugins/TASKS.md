# DXOS Claude Code Plugins — Tasks

_Resume: phase 1 rebuilt and both plugins staged for one PR; verify `/dxos-project:project` fires
live after a session restart. Uncommitted: none. Last: recovered the stranded plugin commits,
renamed `dx` -> `dxos-project`, moved `composer-plugin-dev` under `tools/claude/plugins/`, and listed
both in the marketplace._

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
- [x] **List both plugins in the marketplace** — `composer-plugin-dev` was on main but in no
      manifest, so it had always been uninstallable.
- [ ] **Decide `composer-plugin-dev`'s fate** — it is deprecated in the user's view but still the
      only portable Composer-authoring artifact; `.agents/skills/composer-plugins/SKILL.md` (656
      lines, in-repo audience) is the live one. Either fold the in-repo skill's content into its 22
      reference files, or drop the plugin from the manifest.
- [ ] **Fold in or close `task-planning-skill`** — that registry entry now points at this plugin's
      files and its one open follow-up ("test the skill in a clean repo") is subsumed by this
      project's foreign-repo verification. Two active entries for one work-stream.

## Phase 2: Composer MCP backend

Replace the file store with the DXOS Composer MCP server so projects and tasks
are live objects rather than committed YAML — shared across repos and machines,
and editable outside the agent.

### Tasks

- [ ] **Implement `resolve_backend` for `mcp`** — emit a `BACKEND:` line naming
      the MCP tools instead of a file path. The seam exists; this is the fill-in.
- [ ] **Decide the fallback rule** — what happens when the MCP server is
      unreachable: fail, or degrade to the file backend. The unrecognised-backend
      branch already refuses to guess, which is the right default shape.
- [ ] **Reconcile the two stores** — a repo with an existing
      `registry.yml` and a Composer workspace needs an import path, or an
      explicit "one or the other" rule.

### References

- Plugin: `tools/claude/plugins/dxos-project/` · [README](../../../tools/claude/plugins/dxos-project/README.md)
- Predecessor work: `.agents/projects/agent-directives/` (PRs #12453, #12463)
- Hook reference: https://code.claude.com/docs/en/hooks
- Plugin reference: https://code.claude.com/docs/en/plugins-reference
