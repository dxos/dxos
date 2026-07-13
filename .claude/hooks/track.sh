#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the task-planning sentinels.
#
# 1. `$track <text>` (anywhere) or a line beginning `track: <text>` — record <text>
#    as a follow-up in the active TASKS.md (see the task-planning skill).
# 2. `$hydrate` / `$checkpoint` — checkpoint the current project (reconcile TASKS.md,
#    refresh the registry resume pointer, account for uncommitted work).
# 3. `$resume [name]` / `$rehydrate` — reload a project (from the registry) and report.
# 4. `$project [new|list|end …]` — manage the project registry; bare `$project`
#    (or `list`) prints a numbered table you resume from by replying with a row number.
# Stateless: emits one directive per matching sentinel and nothing otherwise.

set -euo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

# `$track ...` (whitespace required after, so `$tracking`/`$tracked` don't match)
# anywhere, or a line starting with `track: ...`.
task=$(printf '%s\n' "$prompt" \
  | grep -ioE '(\$track[[:space:]]+|^[[:space:]]*track:)[[:space:]]*.*' \
  | head -1 \
  | sed -E 's/^[[:space:]]*(\$track|track:)[[:space:]]*//I' || true)

if [ -n "${task:-}" ]; then
  printf 'TASK-PLANNING DIRECTIVE: the user used the track sentinel. Record this follow-up in the TASKS.md of the current unit of work (package or directory) per the task-planning skill — do NOT use a background task chip. Item: "%s". Confirm in one short line.\n' "$task"
fi

# `$project [new|list|end …]` — bare `$project` (or `$project list`) lists the
# registry; capture any verb + args (empty for a bare list).
if printf '%s\n' "$prompt" | grep -iqE '\$project([[:space:]]|$)'; then
  project_args=$(printf '%s\n' "$prompt" \
    | grep -ioE '\$project[[:space:]]+[^[:space:]].*' \
    | head -1 \
    | sed -E 's/^.*\$project[[:space:]]+//I' || true)
  printf 'TASK-PLANNING PROJECT DIRECTIVE: the user used the $project sentinel — args: "%s". Per the task-planning skill "Projects (registry)", operate on .agents/projects/registry.yml. Empty args or `list`: render the active projects as a markdown table whose FIRST column is a 1-based row number (# | name | status | user | host | one-line summary). BY DEFAULT show only projects whose `user` matches the current user (run `whoami`); if none match, say so and show all. `list all` (or `all`) lists every user. Then tell the user they can reply with a row number to resume that project — a lone number in their next message means "resume the project at that row", which runs the "Project handoff" → resume steps for that entry (same as $resume <name>). `new <name> [summary]`: add an active entry (user = `whoami`, host = `hostname -s`) and scaffold .agents/projects/<name>/{TASKS,DESIGN}.md unless the docs already live elsewhere. `end <name>`: move it to ended with the final PR/status. Confirm in one short line.\n' "$project_args"
fi

# Session-handoff sentinels (require the `$` prefix + a word boundary so the plain
# words "hydrate"/"resume" in prose don't trigger).
if printf '%s\n' "$prompt" | grep -iqE '\$(hydrate|checkpoint)([[:space:]]|$)'; then
  printf 'TASK-PLANNING HYDRATE: the user used the $hydrate sentinel. Follow the task-planning skill "Project handoff" → hydrate: identify the CURRENT project (the single `active` .agents/projects/registry.yml entry for the current user; if more than one, ask which), reconcile its TASKS.md (check off done, note next step on in-progress items), update its `resume:` field + the doc resume pointer, push decisions into its DESIGN.md and durable direction to memory, run git status and account for EVERY uncommitted file, then confirm the checkpoint in one short block (done / in-progress / next / uncommitted).\n'
fi

# `$resume [name]` — optional project name argument.
resume_name=$(printf '%s\n' "$prompt" \
  | grep -ioE '\$(resume|rehydrate)[[:space:]]+[a-z0-9][a-z0-9-]*' \
  | head -1 \
  | sed -E 's/^.*\$(resume|rehydrate)[[:space:]]+//I' || true)

if printf '%s\n' "$prompt" | grep -iqE '\$(resume|rehydrate)([[:space:]]|$)'; then
  printf 'TASK-PLANNING RESUME: the user used the $resume sentinel. Follow the task-planning skill "Project handoff" → resume: pick the project from .agents/projects/registry.yml — %s. Read its `tasks` (TASKS.md) + `design` doc (memory is already loaded), check git status + recent git log, report a concise state (done / in-progress / next action / uncommitted), then continue with the next action unless the user directed otherwise.\n' \
    "$( [ -n "${resume_name:-}" ] && printf 'by name "%s"' "$resume_name" || printf 'the single active entry for the current user (ask if more than one)' )"
fi
