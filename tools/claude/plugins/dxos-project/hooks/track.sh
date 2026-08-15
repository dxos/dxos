#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the `/dxos-project:project` command.
#
# Grammar: `/dxos-project:project [VERB] [ARGS]` (or bare `/project`) on the FIRST LINE,
# where a slash command must appear anyway.
#   (bare)                -> status of the CURRENT project
#   list [all]            -> table of the registry
#   tasks [all|<phase>]   -> open items from the current project's TASKS.md
#   new <name> [summary]  -> add an active entry + scaffold docs
#   end <name>            -> move the entry to ended
#   track <text>          -> record <text> in the active TASKS.md
#   hydrate | checkpoint  -> checkpoint the current project
#   resume [name]         -> reload a project and report (rehydrate = alias)
#
# This event carries the RAW typed text and fires before the command expands, so
# the directive is emitted deterministically rather than depending on the agent
# to act on the expansion. Anchoring to the first line is load-bearing: a
# free-floating marker fires on prose that merely mentions it.
#
# STORAGE SEAM. Every directive below states an OPERATION only; `resolve_backend`
# appends one BACKEND line saying HOW to perform it. Swapping the store (e.g. to
# an MCP server) is a change to that one function — the verbs, the command file
# and the skill are untouched. Configure with:
#   DX_PROJECT_BACKEND   file (default) | mcp
#   DX_PROJECT_REGISTRY  path to the registry, relative to the project root
#                        (default .agents/projects/registry.yml) — `file` only
#   DX_PROJECT_SPACE     space to resolve projects in — `mcp` only; when unset
#                        the agent resolves it with the `listSpaces` tool
#
# The two stores are alternatives, never a cascade: `mcp` refuses to degrade to
# `file` when a tool is missing, since a write landing in a file the user
# believes is dead is the divergence the backend exists to prevent.

set -euo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
backend="${DX_PROJECT_BACKEND:-file}"
registry="${DX_PROJECT_REGISTRY:-.agents/projects/registry.yml}"

# One line appended to every directive, describing the store rather than the
# operation. Keep the operation text above backend-agnostic.
resolve_backend() {
  case "$backend" in
    file)
      if [ -f "$root/$registry" ]; then
        printf 'BACKEND: file · `%s` — read/write it as YAML per the registry schema in the task-planning skill.' "$registry"
      else
        printf 'BACKEND: file · `%s` — DOES NOT EXIST YET. For a read verb, say the repo has no project registry and offer to create one with `/dxos-project:project new <name>`; do NOT invent entries. For `new`, create the file with a top-level `projects: []` and `ended: []` before adding the entry.' "$registry"
      fi
      ;;
    mcp)
      printf 'BACKEND: mcp · DXOS Composer — the store is a live object graph reached through this session'"'"'s MCP tools, NOT a file. Do not read or write `%s`; if it exists it is a stale mirror. Object mapping: a registry entry IS a `Project`; the project'"'"'s TASKS.md ledger IS `Project.outline`, one markdown document holding the phases and `- [ ]` items; a durable task is a `Task` under the project'"'"'s TaskSet; DESIGN.md and other specs are artifact documents. Tools: `projectList` (list), `projectGet` (bare/resume/status), `projectUpdate` (end, status, pointer), `outlineGet` (tasks/resume), `outlineUpdate` (track, hydrate, checking items off), `taskList`/`taskCreate`/`taskComplete`/`taskAssign` for durable tasks, and `createObject` for `new` — there is no `projectCreate` over MCP, since it resolves a Capability.Service that exists only inside the app. Resolve the space with `listSpaces` unless DX_PROJECT_SPACE names one (%s). If a tool the operation needs is not available in this session, say so and STOP — never silently fall back to the file backend, because a write that lands in a file the user believes is dead is exactly the divergence this backend exists to prevent.' "$registry" "${DX_PROJECT_SPACE:-unset}"
      ;;
    *)
      printf 'BACKEND: %s — UNRECOGNISED. Tell the user DX_PROJECT_BACKEND is set to an unsupported value and that only `file` and `mcp` are implemented; do not guess a store.' "$backend"
      ;;
  esac
}

emit() {
  printf '%s\n%s\n' "$1" "$(resolve_backend)"
}

emit_info() {
  emit 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos-project:project` (bare) — report the CURRENT project, do NOT list the registry. Resolve it: prefer the entry whose name matches this branch (strip a leading `claude/` and a trailing `-<hash>` from `git branch --show-current`); otherwise the single `active` entry for the current user (`whoami`). If neither resolves, say so and suggest `/dxos-project:project list`. Then report, compactly: (1) worktree directory + branch; (2) the project name, status, and its `tasks`/`design` paths and `prs`; (3) tracked-file state — `git status --short` and whether the branch is ahead of origin, naming every uncommitted file rather than summarising. Render EVERY file path as a repo-relative markdown link so it is clickable. (4) the next action, taken from the entry`s `resume` field and condensed to one line. No numbered options unless something genuinely needs a decision.'
}

emit_tasks() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos-project:project tasks` — args: "%s". Read the CURRENT project'"'"'s TASKS.md (resolve the project exactly as for bare `/dxos-project:project`; the path is the entry'"'"'s `tasks` field). Report the OPEN work only — every unchecked `- [ ]` item, grouped under its `##` phase, each as one line: the bold headline plus the shortest note that makes it actionable. Number them 1..N across the whole list so the user can refer to one, and link the file itself. Then give a one-line count of done vs open, and name the next action. Do NOT reproduce completed `- [x]` items unless the args ask for `all`; if the args name a phase, restrict to it. If the entry has no `tasks` file, say so and suggest `/dxos-project:project`.' "$1")"
}

emit_list() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos-project:project list` — args: "%s". Render the active projects as a markdown table whose FIRST column is a 1-based row number (# | name | status | user | host | one-line summary). BY DEFAULT show only projects whose `user` matches the current user (run `whoami`); if none match, say so and mention `/dxos-project:project list all` — do not show other users unasked. Args `all`: list every user. Then tell the user they can reply with a row number to resume that project — a lone number in their next message means "resume the project at that row" (same as `/dxos-project:project resume <name>`). Confirm in one short line.' "$1")"
}

emit_new() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos-project:project new` — args: "%s". Add an `active` registry entry (user = `whoami`, host = `hostname -s`, created = today) and scaffold `<registry-dir>/<name>/{TASKS,DESIGN}.md` unless the docs already live elsewhere (record that path instead). Confirm in one line.' "$1")"
}

emit_end() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos-project:project end` — args: "%s". Move the entry to `ended` in the registry, recording the final PR/status. Confirm in one line.' "$1")"
}

emit_track() {
  emit "$(printf 'TASK-PLANNING DIRECTIVE: `/dxos-project:project track`. Record this follow-up in the TASKS.md of the current unit of work (package or directory) per the task-planning skill — do NOT use a background task chip. Item: "%s". Confirm in one short line.' "$1")"
}

emit_hydrate() {
  emit 'TASK-PLANNING HYDRATE: `/dxos-project:project hydrate`. Follow the task-planning skill "Project handoff" -> hydrate: identify the CURRENT project (the single `active` entry for the current user; if more than one, ask which), reconcile its TASKS.md (check off done, note next step on in-progress items), update its `resume` field + the doc resume pointer, push decisions into its DESIGN.md and durable direction to memory, run git status and account for EVERY uncommitted file, then confirm the checkpoint in one short block (done / in-progress / next / uncommitted).'
}

emit_resume() {
  emit "$(printf 'TASK-PLANNING RESUME: `/dxos-project:project resume`. Follow the task-planning skill "Project handoff" -> resume: pick the project — %s. Stay in this session'"'"'s assigned worktree: NEVER cd into, edit in, or adopt another project'"'"'s worktree or branch — if the prior work lives on an unmerged branch elsewhere, report that and ask the user instead of following it. Read the project'"'"'s `tasks` (TASKS.md) + `design` doc, check git status + recent git log, report a concise state (done / in-progress / next action / uncommitted), then continue with the next action unless the user directed otherwise.' "$1")"
}

# First line only — a slash command leads the message, and restricting the match
# here is what stops a later line that merely quotes the command from firing.
first_line=$(printf '%s' "$prompt" | head -1)

# Accept the namespaced plugin form and the bare form. The boundary rule keeps
# `/projects` as prose while `/dxos-project:project` and `/dxos-project:project list` fire.
raw=$(printf '%s\n' "$first_line" \
  | grep -ioE '^[[:space:]]*/(dxos-project:)?project($|[^a-zA-Z0-9_:-][^[:cntrl:]]*)' | head -1 || true)

if [ -n "${raw:-}" ]; then
  args=$(printf '%s' "$raw" | sed -E 's|^[[:space:]]*/(dxos-project:)?project[[:space:]]*||I')
  verb=$(printf '%s' "$args" | awk '{print tolower($1)}' | tr -cd 'a-z')
  rest=$(printf '%s' "$args" | sed -E 's/^[^[:space:]]+[[:space:]]*//')

  case "$verb" in
    '') emit_info ;;
    list) emit_list "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')" ;;
    tasks) emit_tasks "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')" ;;
    new) emit_new "$rest" ;;
    end) emit_end "$rest" ;;
    track) emit_track "$rest" ;;
    hydrate | checkpoint) emit_hydrate ;;
    resume | rehydrate)
      name=$(printf '%s' "$rest" | grep -ioE '^[a-z0-9][a-z0-9-]*' || true)
      if [ -n "${name:-}" ]; then
        emit_resume "by name \"$name\""
      else
        emit_resume 'the single active entry for the current user (ask if more than one)'
      fi
      ;;
    *)
      printf 'TASK-PLANNING: `/dxos-project:project %s` — verb not recognized (valid: bare | list [all] | tasks [all] | new <name> | end <name> | track <text> | hydrate | resume [name]). Ask which was meant.\n' "$verb"
      ;;
  esac
fi

exit 0
