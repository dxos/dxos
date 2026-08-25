# Claude Specific Instructions

## IMPORTANT

- When performing complex tasks maintain a plan.
- NEVER use the `send_later` tool.

## Mode

- The response-verbosity mode is set with **`/mode terse`** or **`/mode normal`**.
  `concise` aliases `terse`; `natural`/`default`/`off` alias `normal`. It must
  lead the message, as a slash command does — so a mid-sentence mention of the
  command cannot flip the mode. The `$mode` sentinel has been removed.
- **Bare `/mode` changes nothing and re-orients**: reply with the worktree and
  branch, the instruction files actually consulted (including skills loaded this
  session), and the current mode — never the modes as numbered options, since a
  numeric reply is the one form the hook cannot catch. This is how
  the user asks for the worktree line again — it is a first-reply rule and is
  deliberately not re-injected every turn.
- A `UserPromptSubmit` hook (`.claude/hooks/mode.sh`) does the work: that event
  carries the **raw typed text**, so it catches `/mode …` before the command
  expands and writes the state deterministically — the expansion itself could
  only ask the agent to comply. The same hook injects the `RESPONSE RULES` block
  into **every** prompt. State lives in the untracked `.claude/.mode`; `normal`
  is the default when absent.
- The block is emitted in both modes — the invariants (numbered options, lead
  with the answer) are state-independent and only the length clause varies.
  Follow it whenever it is present. The worktree + files-read line is NOT in it:
  that is a first-reply rule, carried by the `SessionStart` hook.
- The rules themselves are canonical in `AGENTS.md` → "Responding to the user";
  the machinery is documented in `.claude/README.md`.

## Task planning

- One command: `/dxos:project VERB [ARGS]`, leading the message (bare `/project`
  also matches). It is shipped by the **`dxos` plugin**
  (`tools/claude/plugins/dxos`), enabled for this repo via `extraKnownMarketplaces`
  - `enabledPlugins` in `.claude/settings.json` — it is NOT a `.claude/` hook any
    more. **Enabling is not installing:** run `bash .claude/scripts/bootstrap-plugins.sh`
    once per machine — and per cloud container, where `.config/claude-code-setup.sh`
    runs it — or every invocation answers `Unknown command`. The plugin's
    `UserPromptSubmit` hook reads the raw text before the command expands and
    injects the matching directive, ending with a `BACKEND:` line naming the
    store — follow the directive and obey that line.
  * `/dxos:project` (bare) — status of the CURRENT project: worktree + branch, the
    registry entry's status/docs/PRs, uncommitted files (as clickable links),
    and the next action.
  * `/dxos:project list [all]` — numbered table of the registry
    (backend-resolved; `.agents/projects/registry.yml` here); reply with a row
    number to resume.
  * `/dxos:project tasks [all|<phase>]` — the open `- [ ]` items from the current
    project's `TASKS.md`, numbered and grouped by phase.
  * `/dxos:project new <name>` / `/dxos:project end <name>` — manage entries;
    each project has a `TASKS.md` + `DESIGN.md`.
  * `/dxos:project track <text>` — record a follow-up in the active `TASKS.md`
    (never a background task chip).
  * `/dxos:project spawn <N...>` — spin the numbered open tasks (same numbering
    `tasks` renders) out into background task chips. This is the ONE sanctioned
    use of a chip; a newly discovered follow-up still goes to `track`.
  * `/dxos:project history [all]` — table of the PRs a project produced (date,
    author, one-sentence summary), sourced from the registry entry's `prs` and
    enriched via `gh`.
  * `/dxos:project help` — table of every verb and what it does.
  * `/dxos:project hydrate` (alias `checkpoint`) — checkpoint before stopping or
    opening a PR.
  * `/dxos:project resume [name]` — reload state at session start, always in the
    session's assigned worktree.
- The `$project` sentinel and the legacy `$track`/`$hydrate`/`$checkpoint`/
  `$resume`/`$rehydrate` forms are **removed** — they matched anywhere in a
  message, so prose about them fired them.
- See the `task-planning` skill for the file format, workflow, registry, and
  handoff steps.
