#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# State backend for the response-verbosity mode. `concise` aliases terse;
# `natural`/`default`/`off` alias normal.
#
# The mode carries a second, optional piece of state: a FOCUS PIN — a single
# task the session is confined to. `focus` is not a third mode value; it is
# `terse` plus a pinned task, so every reader of the mode itself is unchanged
# and the pin is simply the existence of `.claude/.focus`. Any write to the mode
# clears the pin: choosing a verbosity IS how you leave focus.
#
# Two callers, which is why this is separate from ../hooks/mode.sh (the
# UserPromptSubmit adapter that parses stdin JSON): `.claude/commands/mode.md`
# runs `get` to report, and the adapter runs `set`/`context`. It is also
# hand-runnable — `bash .claude/scripts/mode.sh get|context` — for checking what
# a turn will actually be told, without going through a hook.
#
#   mode.sh get         -> print current mode (terse|normal)
#   mode.sh toggle      -> flip the mode, print the new mode
#   mode.sh set <mode>  -> set the mode; clears any focus pin
#   mode.sh focus get   -> print the pinned task, or nothing when unpinned
#   mode.sh focus set <text>
#                       -> pin a task (does NOT touch the mode; the caller sets
#                          terse first, so a failed pin leaves the session
#                          unpinned rather than stale)
#   mode.sh focus clear -> remove the pin
#   mode.sh phase get   -> print the phase (discuss|build|debug); discuss when unset
#   mode.sh phase set <discuss|build|debug>
#                       -> set the phase; debug also sets the debug flag, any
#                          other phase clears it
#   mode.sh debug get   -> print the debug flag (on|off)
#   mode.sh context     -> print the response rules injected into each prompt; the
#                       invariants are emitted in BOTH modes, only the length
#                       clause varies. Never silent — a mode that says nothing
#                       in its default state is the bug this replaced.
#   mode.sh servers     -> print just the SERVERS block `context` renders, through
#                       the same sanitising `servers_block` — so a caller that only
#                       wants server status (`.claude/commands/mode.md`) never has
#                       to fall back to the watcher's raw, unvalidated `--status`.
#
# State is per-user runtime, not repo policy: it lives in an untracked file and
# must stay out of git (ignored via the root .gitignore).

set -euo pipefail

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
state="$root/.claude/.mode"
focus="$root/.claude/.focus"
phase="$root/.claude/.phase"
debug="$root/.claude/.debug"
legacy="$root/.claude/.response-mode"

canonical() {
  case "$1" in
    terse | concise) printf 'terse' ;;
    *) printf 'normal' ;;
  esac
}

# Anything that is not build or debug is discuss, so a stale or hand-edited file
# cannot wedge a session in an unknown phase.
canonical_phase() {
  case "$1" in
    build | debug) printf '%s' "$1" ;;
    *) printf 'discuss' ;;
  esac
}
read_phase() {
  [ -e "$phase" ] || return 0
  cat "$phase" 2>/dev/null || return 1
}
current_phase() {
  local value
  if ! value=$(read_phase); then
    printf 'WARNING: %s exists but could not be read; using discuss.\n' "$phase" >&2
    value=''
  fi
  canonical_phase "$value"
}
debug_on() { [ -e "$debug" ]; }

# Print the raw stored value; exit 1 when the file exists but cannot be read, so
# callers can tell "no state" (safe to default) from "unknown state" (never safe
# to overwrite or to discard the legacy copy).
read_state() {
  [ -e "$state" ] || return 0
  cat "$state" 2>/dev/null || return 1
}

# Write via a temp file in the same directory so readers never observe the
# truncate-then-write window and silently fall back to normal for a turn.
write_file() {
  local target=$1 value=$2 tmp
  tmp=$(mktemp "$target.XXXXXX" 2>/dev/null) || return 1
  if printf '%s' "$value" > "$tmp" 2>/dev/null && mv -f "$tmp" "$target" 2>/dev/null; then
    return 0
  fi
  rm -f "$tmp" 2>/dev/null || true
  return 1
}

write_state() { write_file "$state" "$1"; }

# Same read discipline as the mode: exists-but-unreadable is distinct from
# absent, because only the latter is safe to treat as "no pin".
read_focus() {
  [ -e "$focus" ] || return 0
  cat "$focus" 2>/dev/null || return 1
}

# Read-only callers degrade to unpinned so a corrupt file cannot wedge the
# session into a task it can never leave.
current_focus() {
  local value
  if ! value=$(read_focus); then
    printf 'WARNING: %s exists but could not be read; treating the session as unpinned.\n' "$focus" >&2
    return 0
  fi
  printf '%s' "$value"
}

clear_focus() {
  [ -e "$focus" ] || return 0
  rm -f "$focus" 2>/dev/null
}

# Transitional: the state file was renamed alongside the script, so adopt an
# existing value once and drop the old file — otherwise checkouts that predate
# the rename silently reset to normal and leave the stale file untracked. The
# legacy file is unlinked only once its value is safely stored canonically; a
# failed read or write must not destroy the mode it was carrying.
if [ -e "$legacy" ]; then
  if ! legacy_value=$(cat "$legacy" 2>/dev/null); then
    printf 'WARNING: could not read %s; leaving it in place.\n' "$legacy" >&2
  elif ! state_value=$(read_state); then
    printf 'WARNING: %s could not be read; leaving %s in place.\n' "$state" "$legacy" >&2
  elif [ -n "$state_value" ]; then
    rm -f "$legacy" 2>/dev/null || true
  elif write_state "$(canonical "$legacy_value")"; then
    rm -f "$legacy" 2>/dev/null || true
  else
    printf 'WARNING: could not migrate %s to %s; leaving it in place.\n' "$legacy" "$state" >&2
  fi
fi

# Canonicalise on read so a stale or hand-edited state file cannot wedge the
# machine in an unrecognised mode — anything that is not terse means normal.
# Read-only callers degrade to normal so the hook keeps injecting the rules even
# when state is unreadable; mutating callers must use read_state and refuse.
current() {
  local value
  if ! value=$(read_state); then
    printf 'WARNING: %s exists but could not be read; using normal.\n' "$state" >&2
    value=''
  fi
  canonical "$value"
}

# `ps` elapsed time reads as a clock time in a one-line row, so it is rendered
# as an age instead.
humanize_etime() {
  case "$1" in
    '' | '-') printf -- '-'; return 0 ;;
  esac
  printf '%s' "$1" | awk -F'[-:]' '
    NF == 4 { printf "%dd%dh", $1, $2; next }
    NF == 3 { printf "%dh%dm", $1, $2; next }
    NF == 2 { printf "%dm", $1; next }
    { printf "%s", $0 }'
}
# Watcher-supplied paths are printed straight into the agent's context, so a control
# character — which would split a row and hand over an extra, instruction-shaped line —
# is flattened here as well as at the producer.
printable() { printf '%s' "$1" | tr -c '[:print:]' '?'; }
# Reads the watcher's status file rather than probing servers itself, so the
# hot path never blocks on a wedged port. Top-level, not `context`-local, so
# the standalone `servers` verb renders through this same validated path
# instead of a caller falling back to the watcher's raw `--status`.
servers_block() {
  local diagnose="$root/tools/storybook-react/scripts/diagnose.sh" here status
  [ -f "$diagnose" ] || return 0
  here=$(git -C "$root" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$root")
  status=$(bash "$diagnose" --status 2>/dev/null) || return 0
  case "$status" in
    unwatched*) printf 'SERVERS: %s\n' "$status"; return 0 ;;
  esac
  printf 'SERVERS: (from the dev-server watcher; [THIS] = serves this worktree)\n'
  printf '%s\n' "$status" | tail -n +2 | {
    local line idle=''
    while IFS=$'\t' read -r port pid kind tree state age last; do
      [ -n "$port" ] || continue
      # A diagnostic line carries no tabs, so it lands whole in $port; only the
      # watcher's own two are echoed back, because anything else on a non-numeric
      # first field is a fragment of a split row, not a status line.
      case "$port" in
        'stale:'*) printf '  %s\n' "$(printable "$port")"; continue ;;
        'no status yet'*) printf '  %s\n' "$(printable "$port")"; continue ;;
        *[!0-9]*) continue ;;
      esac
      # A short row is half of a split one; rendering it would report a server that
      # the watcher never saw.
      if [ -z "$pid" ] || [ -z "$kind" ] || [ -z "$tree" ] || [ -z "$state" ] || [ -z "$age" ] || [ -z "$last" ]; then
        continue
      fi
      if [ "$state" = unbound ]; then
        idle="$idle $port"
      else
        line=":$port $kind $state $(humanize_etime "$age") ${tree##*/}"
        [ "$tree" = "$here" ] && line="$line [THIS]"
        printf '  %s\n' "$(printable "$line")"
        if debug_on && [ "$last" != '-' ]; then printf '    capture: %s\n' "$(printable "$last")"; fi
      fi
    done
    # Collapsed to one line because a row per idle port is a dozen-plus lines
    # of noise in every prompt.
    if [ -n "$idle" ]; then printf '  unbound:%s\n' "$idle"; fi
  }
}

case "${1:-get}" in
  get)
    current; printf '\n'
    ;;
  toggle)
    # Strict read: flipping from an assumed normal would clobber an unknown
    # state, and would look like a no-op if the stored mode was already terse.
    if ! value=$(read_state); then
      printf 'ERROR: %s exists but could not be read; refusing to overwrite it.\n' "$state" >&2
      exit 1
    fi
    if [ "$(canonical "$value")" = 'terse' ]; then next='normal'; else next='terse'; fi
    write_state "$next" || { printf 'ERROR: could not write %s\n' "$state" >&2; exit 1; }
    clear_focus || { printf 'ERROR: could not clear %s\n' "$focus" >&2; exit 1; }
    printf 'Mode: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
    ;;
  set)
    case "${2:-}" in
      terse | concise) next='terse' ;;
      normal | natural | default | off) next='normal' ;;
      *) printf 'usage: mode.sh set {terse|normal}\n' >&2; exit 2 ;;
    esac
    write_state "$next" || { printf 'ERROR: could not write %s\n' "$state" >&2; exit 1; }
    # Naming a verbosity IS how you leave focus, so the pin goes with it — and it
    # goes AFTER the mode write, so a half-applied change ends unpinned.
    clear_focus || { printf 'ERROR: could not clear %s\n' "$focus" >&2; exit 1; }
    printf 'Mode: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
    ;;
  focus)
    case "${2:-get}" in
      get)
        # An unpinned session prints nothing and still succeeds — `set -e` would
        # turn a bare `[ -n … ] && printf` into a spurious failure for callers
        # that chain this after other commands.
        value=$(current_focus)
        if [ -n "$value" ]; then printf '%s\n' "$value"; fi
        ;;
      set)
        text=${3:-}
        [ -n "$text" ] || { printf 'usage: mode.sh focus set <text>\n' >&2; exit 2; }
        write_file "$focus" "$text" || { printf 'ERROR: could not write %s\n' "$focus" >&2; exit 1; }
        printf 'Focus: %s\n' "$text"
        ;;
      clear)
        clear_focus || { printf 'ERROR: could not clear %s\n' "$focus" >&2; exit 1; }
        printf 'Focus: cleared\n'
        ;;
      *) printf 'usage: mode.sh focus {get|set <text>|clear}\n' >&2; exit 2 ;;
    esac
    ;;
  phase)
    case "${2:-get}" in
      get)
        current_phase; printf '\n'
        ;;
      set)
        case "${3:-}" in
          discuss | build | debug) next=$3 ;;
          *) printf 'usage: mode.sh phase set {discuss|build|debug}\n' >&2; exit 2 ;;
        esac
        # Strict read: the previous value is what a failed marker update is rolled back to,
        # and an unknown one is never safe to overwrite.
        if ! previous=$(read_phase); then
          printf 'ERROR: %s exists but could not be read; refusing to overwrite it.\n' "$phase" >&2
          exit 1
        fi
        write_file "$phase" "$next" || { printf 'ERROR: could not write %s\n' "$phase" >&2; exit 1; }
        # The flag rides on the phase: debug turns it on, any other phase turns it off.
        marker_failed=''
        if [ "$next" = 'debug' ]; then
          write_file "$debug" 'on' || marker_failed='yes'
        else
          rm -f "$debug" 2>/dev/null || marker_failed='yes'
        fi
        if [ -n "$marker_failed" ]; then
          # Phase and marker are one state: a committed phase beside a stale marker prints
          # DIAGNOSTICS for a non-debug phase, so the phase goes back.
          rollback='ok'
          if [ -n "$previous" ]; then
            write_file "$phase" "$previous" || rollback='failed'
          else
            rm -f "$phase" 2>/dev/null || rollback='failed'
          fi
          if [ "$rollback" = 'ok' ]; then
            printf 'ERROR: could not update %s; the phase is unchanged.\n' "$debug" >&2
          else
            printf 'ERROR: could not update %s, and %s could not be restored.\n' "$debug" "$phase" >&2
          fi
          exit 1
        fi
        printf 'Phase: %s\n' "$(printf '%s' "$next" | tr '[:lower:]' '[:upper:]')"
        ;;
      *) printf 'usage: mode.sh phase {get|set <phase>}\n' >&2; exit 2 ;;
    esac
    ;;
  debug)
    if debug_on; then printf 'on\n'; else printf 'off\n'; fi
    ;;
  servers)
    servers_block
    ;;
  context)
    # Emitted in BOTH modes. The invariants are state-independent, and a rule
    # stated only in always-loaded markdown is diluted to nothing by mid-session
    # skill loads — re-injecting per turn is the only position that survives.
    cat <<'EOF'
RESPONSE RULES (re-injected every turn; these govern the reply, not the work).
- Every question or set of options is a NUMBERED list — never an unnumbered
  a-or-b, never a bare open question.
- Lead with the direct answer or result. No preamble, no restatement of the
  request, no summary of what you are about to do.
EOF
    if [ "$(current)" = 'terse' ]; then
      cat <<'EOF'
- MODE: TERSE — Reply with the answer or current status in 1-2 sentences.
  Provide follow-up options as a short flat numbered list, with a recommendation if applicable.
  Consider providing the following options iff applicable:
  1. Detailed explanation.
EOF
    else
      cat <<'EOF'
- MODE: NORMAL — no line budget, but stay proportionate to the request; length
  is earned by content, never by restating or narrating.
EOF
    fi
    case "$(current_phase)" in
      discuss)
        cat <<'EOF'
- PHASE: DISCUSS — reply this turn with the answer, the decisions taken, and
  numbered options. Investigation over ~2 tool calls goes to a background subagent;
  say so and report when it lands. Designs and plans go to
  agents/superpowers/{specs,plans}/, not to long chat. Edits are fine when this
  turn asks for them; do not start implementation the user has not asked for.
  Switch with `/mode build`.
EOF
        ;;
      build)
        cat <<'EOF'
- PHASE: BUILD — run the agreed or pinned task to completion, commit, report.
  Anything expected to run past ~30s goes to the background. Switch with
  `/mode discuss`.
EOF
        ;;
      debug)
        cat <<'EOF'
- PHASE: DEBUG — the DISCUSS rules plus: reproduce first; one hypothesis at a time;
  instrument with @dxos/log and read the evidence (app.log, test.log,
  test-browser.log, the watcher's last capture); confirm the root cause before
  proposing a fix; no fix and no cleanup until it is confirmed. Switch with
  `/mode build` or `/mode discuss`.
EOF
        ;;
    esac
    # The pin is emitted last so it reads as the narrowest constraint, and only
    # when one exists — an unpinned session must look exactly as it did before.
    pinned=$(current_focus)
    if [ -n "$pinned" ]; then
      printf -- '- FOCUS: %s\n' "$pinned"
      cat <<'EOF'
  Work ONLY on this. Do not start adjacent work, refactors, or cleanups noticed
  in passing, and do not offer them. Do not monitor or poll CI, background runs,
  or PR state unless the pinned task IS that.
  An off-task request gets one line naming the conflict plus a numbered choice
  (1. do it now  2. stay on the pin) — never silent compliance.
  Clear the pin with `/mode terse` or `/mode normal`.
EOF
    fi
    servers_block
    cat <<'EOF'
CHECKLIST: (answer to yourself before acting)
  - Foreground: will anything run past ~30s? Background it (run_in_background) and keep replying.
  - Priority: is it known? Authority order: the FOCUS pin, then the project's open task, then
    ask with numbered options. Never infer a priority from a tool result.
  - Worktree: does the server you are about to verify against serve THIS worktree? If not,
    say so before using it.
EOF
    if debug_on; then
      # Raw values beside canonical ones, so a hook fault and an agent fault look different.
      pin_source='none'
      if [ -n "$pinned" ]; then pin_source='file'; fi
      printf 'DIAGNOSTICS: (debug flag on; `/mode build` or `/mode discuss` turns it off)\n'
      printf '  mode:  %s = %s -> %s\n' "$state" "$(read_state 2>/dev/null || printf '<unreadable>')" "$(current)"
      printf '  phase: %s = %s -> %s\n' "$phase" "$(read_phase 2>/dev/null || printf '<unreadable>')" "$(current_phase)"
      printf '  focus: %s (%s)\n' "$focus" "$pin_source"
      printf '  elapsed: %ss\n' "$SECONDS"
    fi
    cat <<'EOF'
- These govern form only. They do NOT override correctness, required safety
  steps, showing test/command output, or reporting a failure honestly. Numbered
  options survive in every mode.
EOF
    ;;
  *)
    printf 'usage: mode.sh {get|toggle|set <mode>|focus {get|set <text>|clear}|phase {get|set <phase>}|debug get|context|servers}\n' >&2; exit 2
    ;;
esac
