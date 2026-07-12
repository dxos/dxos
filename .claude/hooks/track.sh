#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the task-planning sentinels.
#
# 1. `$track <text>` (anywhere) or a line beginning `track: <text>` — record <text>
#    as a follow-up in the active TASKS.md (see the task-planning skill).
# 2. `$hydrate` / `$checkpoint` — checkpoint the current session (reconcile TASKS.md,
#    refresh the registry resume pointer, account for uncommitted work).
# 3. `$resume [name]` / `$rehydrate` — reload a session (from the registry) and report.
# 4. `$session new|list|end …` — manage the session registry.
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

# `$session new|list|end …` — capture the verb + rest.
session=$(printf '%s\n' "$prompt" \
  | grep -ioE '\$session[[:space:]]+.*' \
  | head -1 \
  | sed -E 's/^.*\$session[[:space:]]+//I' || true)

if [ -n "${session:-}" ]; then
  printf 'TASK-PLANNING SESSION DIRECTIVE: the user used the $session sentinel — "%s". Per the task-planning skill "Sessions (registry)", operate on .agents/sessions/registry.yml: `new <name> [summary]` adds an active entry (branch = current) and scaffolds .agents/sessions/<name>/{TASKS,DESIGN}.md unless the docs already live elsewhere; `list` prints active sessions; `end <name>` moves it to ended with the final PR/status. Confirm in one short line.\n' "$session"
fi

# Session-handoff sentinels (require the `$` prefix + a word boundary so the plain
# words "hydrate"/"resume" in prose don't trigger).
if printf '%s\n' "$prompt" | grep -iqE '\$(hydrate|checkpoint)([[:space:]]|$)'; then
  printf 'TASK-PLANNING HYDRATE: the user used the $hydrate sentinel. Follow the task-planning skill "Session handoff" → hydrate: identify the CURRENT session (the .agents/sessions/registry.yml entry whose branch matches HEAD), reconcile its TASKS.md (check off done, note next step on in-progress items), update its `resume:` field + the doc resume pointer, push decisions into its DESIGN.md and durable direction to memory, run git status and account for EVERY uncommitted file, then confirm the checkpoint in one short block (done / in-progress / next / uncommitted).\n'
fi

# `$resume [name]` — optional session name argument.
resume_name=$(printf '%s\n' "$prompt" \
  | grep -ioE '\$(resume|rehydrate)[[:space:]]+[a-z0-9][a-z0-9-]*' \
  | head -1 \
  | sed -E 's/^.*\$(resume|rehydrate)[[:space:]]+//I' || true)

if printf '%s\n' "$prompt" | grep -iqE '\$(resume|rehydrate)([[:space:]]|$)'; then
  printf 'TASK-PLANNING RESUME: the user used the $resume sentinel. Follow the task-planning skill "Session handoff" → resume: pick the session from .agents/sessions/registry.yml — %s. Read its `tasks` (TASKS.md) + `design` doc (memory is already loaded), check git status + recent git log, report a concise state (done / in-progress / next action / uncommitted), then continue with the next action unless the user directed otherwise.\n' \
    "$( [ -n "${resume_name:-}" ] && printf 'by name "%s"' "$resume_name" || printf 'the entry whose branch matches HEAD' )"
fi
