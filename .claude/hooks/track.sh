#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the `/legacy-project` command (task-planning skill).
#
# Grammar: `/legacy-project [VERB] [ARGS]`, on the FIRST LINE, where a slash command
# must appear anyway.
#   (bare)                -> status of the CURRENT project
#   list [all]            -> numbered table of the registry
#   tasks [all|<phase>]   -> open items from the current project's TASKS.md
#   new <name> [summary]  -> add an active entry + scaffold docs
#   end <name>            -> move the entry to ended
#   track <text>          -> record <text> in the active TASKS.md
#   hydrate | checkpoint  -> checkpoint the current project
#   resume [name]         -> reload a project and report (rehydrate = alias)
#
# This event carries the RAW typed text and fires before the command expands, so
# the directive is emitted deterministically rather than depending on the agent
# to act on the expansion (same recipe as hooks/mode.sh — see .claude/README.md).
#
# Anchoring to the first line is load-bearing. The predecessor `$project`
# sentinel matched anywhere in the message, so prose ABOUT the command fired it —
# observed 2026-08-04, when a message asking to convert "$project" ran
# `$project list`. The legacy `$track` / `$hydrate` / `$checkpoint` / `$resume` /
# `$rehydrate` / `track:` forms shared that flaw and went with it.
#
# Stateless: emits one directive per invocation and nothing otherwise.

set -euo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

emit_info() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `/legacy-project` (bare) — report the CURRENT project, do NOT list the registry. Resolve it from .agents/projects/registry.yml: prefer the entry whose name matches this branch (strip the `claude/` prefix and the trailing `-<hash>` from `git branch --show-current`); otherwise the single `active` entry for the current user (`whoami`). If neither resolves, say so and suggest `/legacy-project list`. Then report, compactly: (1) worktree directory + branch; (2) the project name, status, and its `tasks`/`design` paths and `prs`; (3) tracked-file state — `git status --short` and whether the branch is ahead of origin, naming every uncommitted file rather than summarising. Render EVERY file path in the report as a repo-relative markdown link so it is clickable: the `tasks`/`design` docs and each uncommitted file, e.g. `[TASKS.md](.agents/projects/<name>/TASKS.md)`. (4) the next action from the entry, taken from its `resume` field and condensed to one line. No numbered options unless something genuinely needs a decision.\n'
}

emit_tasks() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `/legacy-project tasks` — args: "%s". Read the CURRENT project'\''s TASKS.md (resolve the project exactly as for bare `/legacy-project`: by branch name, else the single `active` entry for the current user; the path is the entry'\''s `tasks` field). Report the OPEN work only — every unchecked `- [ ]` item, grouped under its `##` phase, each as one line: the bold headline plus the shortest note that makes it actionable. Number them 1..N across the whole list so the user can refer to one, and link the file itself. Then give a one-line count of what is done vs open, and name the next action. Do NOT reproduce completed `- [x]` items unless the args ask for `all`; if the args name a phase, restrict to it. If the entry has no `tasks` file, say so and suggest `/legacy-project`.\n' "$1"
}

emit_list() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `/legacy-project list` — args: "%s". Operate on .agents/projects/registry.yml per the task-planning skill. Render the active projects as a markdown table whose FIRST column is a 1-based row number (# | name | status | user | host | one-line summary). BY DEFAULT show only projects whose `user` matches the current user (run `whoami`); if none match, say so and mention `/legacy-project list all` — do not show other users unasked. Args `all`: list every user. Then tell the user they can reply with a row number to resume that project — a lone number in their next message means "resume the project at that row" (same as `/legacy-project resume <name>`). Confirm in one short line.\n' "$1"
}

emit_new() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `/legacy-project new` — args: "%s". Per the task-planning skill, add an active entry to .agents/projects/registry.yml (user = `whoami`, host = `hostname -s`) and scaffold .agents/projects/<name>/{TASKS,DESIGN}.md unless the docs already live elsewhere (record that path instead). Confirm in one line.\n' "$1"
}

emit_end() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `/legacy-project end` — args: "%s". Per the task-planning skill, move the entry to `ended` in .agents/projects/registry.yml, recording the final PR/status. Confirm in one line.\n' "$1"
}

emit_track() {
  printf 'TASK-PLANNING DIRECTIVE: `/legacy-project track`. Record this follow-up in the TASKS.md of the current unit of work (package or directory) per the task-planning skill — do NOT use a background task chip. Item: "%s". Confirm in one short line.\n' "$1"
}

emit_hydrate() {
  printf 'TASK-PLANNING HYDRATE: `/legacy-project hydrate`. Follow the task-planning skill "Project handoff" -> hydrate: identify the CURRENT project (the single `active` .agents/projects/registry.yml entry for the current user; if more than one, ask which), reconcile its TASKS.md (check off done, note next step on in-progress items), update its `resume:` field + the doc resume pointer, push decisions into its DESIGN.md and durable direction to memory, run git status and account for EVERY uncommitted file, then confirm the checkpoint in one short block (done / in-progress / next / uncommitted).\n'
}

emit_resume() {
  printf 'TASK-PLANNING RESUME: `/legacy-project resume`. Follow the task-planning skill "Project handoff" -> resume: pick the project from .agents/projects/registry.yml — %s. Stay in this session'\''s assigned worktree: NEVER cd into, edit in, or adopt another project'\''s worktree or branch — if the prior work lives on an unmerged branch elsewhere, report that and ask the user instead of following it. Read the project'\''s `tasks` (TASKS.md) + `design` doc (memory is already loaded), check git status + recent git log, report a concise state (done / in-progress / next action / uncommitted), then continue with the next action unless the user directed otherwise.\n' "$1"
}

# First line only — a slash command leads the message, and restricting the match
# here is what stops a later line that merely quotes `/legacy-project …` from firing.
first_line=$(printf '%s' "$prompt" | head -1)

# Boundary rule: `/legacy-project` must not be followed by an identifier char, so
# `/projects` is prose while `/legacy-project` and `/legacy-project list` fire.
raw=$(printf '%s\n' "$first_line" | grep -ioE '^[[:space:]]*/legacy-project($|[^a-zA-Z0-9_][^[:cntrl:]]*)' | head -1 || true)

if [ -n "${raw:-}" ]; then
  args=$(printf '%s' "$raw" | sed -E 's|^[[:space:]]*/legacy-project[[:space:]]*||I')
  verb=$(printf '%s' "$args" | awk '{print tolower($1)}' | tr -cd 'a-z')
  rest=$(printf '%s' "$args" | sed -E 's/^[^[:space:]]+[[:space:]]*//')

  case "$verb" in
    '')
      emit_info
      ;;
    list)
      emit_list "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')"
      ;;
    tasks)
      emit_tasks "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')"
      ;;
    new)
      emit_new "$rest"
      ;;
    end)
      emit_end "$rest"
      ;;
    track)
      emit_track "$rest"
      ;;
    hydrate | checkpoint)
      emit_hydrate
      ;;
    resume | rehydrate)
      name=$(printf '%s' "$rest" | grep -ioE '^[a-z0-9][a-z0-9-]*' || true)
      if [ -n "${name:-}" ]; then
        emit_resume "by name \"$name\""
      else
        emit_resume 'the single active entry for the current user (ask if more than one)'
      fi
      ;;
    *)
      printf 'TASK-PLANNING: `/legacy-project %s` — verb not recognized (valid: bare | list [all] | tasks [all] | new <name> | end <name> | track <text> | hydrate | resume [name]). Ask which was meant.\n' "$verb"
      ;;
  esac
fi

exit 0
