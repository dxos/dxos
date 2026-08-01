#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the unified `$project` sentinel (task-planning skill).
#
# Grammar: `$project [VERB] [ARGS]` anywhere in the message.
#   (bare) | list [all]   -> numbered table of the registry
#   new <name> [summary]  -> add an active entry + scaffold docs
#   end <name>            -> move the entry to ended
#   track <text>          -> record <text> in the active TASKS.md
#   hydrate | checkpoint  -> checkpoint the current project
#   resume [name]         -> reload a project and report (rehydrate = alias)
# Legacy sentinels ($track, $hydrate, $checkpoint, $resume, $rehydrate, and
# `track:` lines) map to the same directives with a nudge toward the new form.
# Stateless: emits one directive per matching sentinel and nothing otherwise.

set -euo pipefail

input=$(cat)
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty' 2>/dev/null || printf '')

legacy_note=''

emit_list() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `$project list` — args: "%s". Operate on .agents/projects/registry.yml per the task-planning skill. Render the active projects as a markdown table whose FIRST column is a 1-based row number (# | name | status | user | host | one-line summary). BY DEFAULT show only projects whose `user` matches the current user (run `whoami`); if none match, say so and show all. Args `all`: list every user. Then tell the user they can reply with a row number to resume that project — a lone number in their next message means "resume the project at that row" (same as `$project resume <name>`). Confirm in one short line.\n' "$1"
}

emit_new() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `$project new` — args: "%s". Per the task-planning skill, add an active entry to .agents/projects/registry.yml (user = `whoami`, host = `hostname -s`) and scaffold .agents/projects/<name>/{TASKS,DESIGN}.md unless the docs already live elsewhere (record that path instead). Confirm in one line.\n' "$1"
}

emit_end() {
  printf 'TASK-PLANNING PROJECT DIRECTIVE: `$project end` — args: "%s". Per the task-planning skill, move the entry to `ended` in .agents/projects/registry.yml, recording the final PR/status. Confirm in one line.\n' "$1"
}

emit_track() {
  printf 'TASK-PLANNING DIRECTIVE: `$project track`%s. Record this follow-up in the TASKS.md of the current unit of work (package or directory) per the task-planning skill — do NOT use a background task chip. Item: "%s". Confirm in one short line.\n' "$legacy_note" "$1"
}

emit_hydrate() {
  printf 'TASK-PLANNING HYDRATE: `$project hydrate`%s. Follow the task-planning skill "Project handoff" -> hydrate: identify the CURRENT project (the single `active` .agents/projects/registry.yml entry for the current user; if more than one, ask which), reconcile its TASKS.md (check off done, note next step on in-progress items), update its `resume:` field + the doc resume pointer, push decisions into its DESIGN.md and durable direction to memory, run git status and account for EVERY uncommitted file, then confirm the checkpoint in one short block (done / in-progress / next / uncommitted).\n' "$legacy_note"
}

emit_resume() {
  printf 'TASK-PLANNING RESUME: `$project resume`%s. Follow the task-planning skill "Project handoff" -> resume: pick the project from .agents/projects/registry.yml — %s. Stay in this session'\''s assigned worktree: NEVER cd into, edit in, or adopt another project'\''s worktree or branch — if the prior work lives on an unmerged branch elsewhere, report that and ask the user instead of following it. Read the project'\''s `tasks` (TASKS.md) + `design` doc (memory is already loaded), check git status + recent git log, report a concise state (done / in-progress / next action / uncommitted), then continue with the next action unless the user directed otherwise.\n' \
    "$legacy_note" "$1"
}

# --- unified `$project` sentinel ---------------------------------------------

raw=$(printf '%s\n' "$prompt" | grep -ioE '\$project([[:space:]]+[^[:cntrl:]]*)?' | head -1 || true)

if [ -n "${raw:-}" ]; then
  args=$(printf '%s' "$raw" | sed -E 's/^\$project[[:space:]]*//I')
  verb=$(printf '%s' "$args" | awk '{print tolower($1)}' | tr -cd 'a-z')
  rest=$(printf '%s' "$args" | sed -E 's/^[^[:space:]]+[[:space:]]*//')

  case "$verb" in
    '' | list)
      emit_list "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')"
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
      printf 'TASK-PLANNING: `$project %s` — verb not recognized (valid: list | new <name> | end <name> | track <text> | hydrate | resume [name]). If the user intended a command, ask which; if the mention was just prose, ignore this directive.\n' "$verb"
      ;;
  esac
fi

# --- legacy sentinels (map to the unified grammar with a nudge) ---------------

legacy_note=' (legacy sentinel — the current form is `$project <verb>`; mention this once)'

task=$(printf '%s\n' "$prompt" \
  | grep -ioE '(\$track[[:space:]]+|^[[:space:]]*track:)[[:space:]]*.*' \
  | head -1 \
  | sed -E 's/^[[:space:]]*(\$track|track:)[[:space:]]*//I' || true)
if [ -n "${task:-}" ]; then
  emit_track "$task"
fi

if printf '%s\n' "$prompt" | grep -iqE '\$(hydrate|checkpoint)([[:space:]]|$)'; then
  emit_hydrate
fi

if printf '%s\n' "$prompt" | grep -iqE '\$(resume|rehydrate)([[:space:]]|$)'; then
  resume_name=$(printf '%s\n' "$prompt" \
    | grep -ioE '\$(resume|rehydrate)[[:space:]]+[a-z0-9][a-z0-9-]*' \
    | head -1 \
    | sed -E 's/^.*\$(resume|rehydrate)[[:space:]]+//I' || true)
  if [ -n "${resume_name:-}" ]; then
    emit_resume "by name \"$resume_name\""
  else
    emit_resume 'the single active entry for the current user (ask if more than one)'
  fi
fi

exit 0
