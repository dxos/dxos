#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# UserPromptSubmit hook for the `/dxos:project` command.
#
# Grammar: `/dxos:project [VERB] [ARGS]` (or bare `/project`) on the FIRST LINE,
# where a slash command must appear anyway.
#   (bare)                -> status of the CURRENT project
#   list [all]            -> table of the registry
#   tasks [all|<phase>]   -> open items from the current project's TASKS.md
#   new <name> [summary]  -> add an active entry + scaffold docs
#   end <name>            -> move the entry to ended
#   track <text>          -> record <text> in the active TASKS.md
#   history [all|<name>]  -> table of the PRs a project has produced
#   spawn <N...>          -> task chips for the numbered open tasks
#   help                  -> table of the verbs
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
        printf 'BACKEND: file · `%s` — DOES NOT EXIST YET. For a read verb, say the repo has no project registry and offer to create one with `/dxos:project new <name>`; do NOT invent entries. For `new`, create the file with a top-level `projects: []` and `ended: []` before adding the entry.' "$registry"
      fi
      ;;
    mcp)
      printf 'BACKEND: mcp · DXOS Composer — the store is a live object graph reached through this session'"'"'s MCP tools, NOT a file. Do not read or write `%s`; if it exists it is a stale mirror. Object mapping: a registry entry IS a `Project`; the project'"'"'s TASKS.md ledger IS `Project.outline`, one markdown document holding the phases and `- [ ]` items; a durable task is a `Task` under the project'"'"'s TaskSet; DESIGN.md and other specs are artifact documents. TWO HOST SHAPES, so look at what this session actually advertises before assuming: a LOCAL host (`dx mcp serve`) exposes four tools — `loadSkill` (the workflow prose; call it first), `queryOperations` (find operations; a `keys` lookup returns full input/output schemas), `invokeOperation` (`{ key, input, spaceId? }`, the ONLY way to run a verb there), and `whoami`; the DEPLOYED host projects each verb as its own tool and adds generic object tools (`listSpaces`, `queryObjects`, `createObject`, `updateObject`, `getObject`). Use whichever seam is present. Operation KEYS, in full — do NOT build one by joining a namespace to a suffix: `org.dxos.operation.projects.create` (new — it scaffolds the project'"'"'s instructions, artifacts collection and TaskSet in one call, and returns the `taskSet` reference to pass to task create), `org.dxos.operation.projects.get` (bare/resume/status), `org.dxos.operation.tasks.getOutline` (tasks/resume), `org.dxos.operation.tasks.updateOutline` (track, hydrate, checking items off), and `org.dxos.operation.tasks.list` / `org.dxos.operation.tasks.create` / `org.dxos.operation.tasks.update` for durable tasks — `.update` carries `status` and `assignee`, which no longer have verbs of their own. Three things this workflow needs have NO project-specific verb and use the generic object ones: LISTING projects is a query by typename `org.dxos.type.project` (`queryObjects`, or `.space.queryObjects` through `invokeOperation`); PATCHING a project (end, status) is `updateObject` / `.space.updateObject`; creating a loose object is `createObject` / `.space.addObject`. Look a key up with `queryOperations` rather than guessing its input shape — the catalog is the authority and this list rots. The space comes from the skill'"'"'s binding gate — the repo'"'"'s committed `.agents/projects/space.yml`, confirmed against the session'"'"'s spaces (`listSpaces` where it exists, else `whoami`); never a session default. DX_PROJECT_SPACE (%s) does NOT override that binding: if it is set and names a different space, stop and say so rather than writing to it. If neither seam is present in this session — no `invokeOperation` and no projected verb — or a verb this operation needs is absent from the catalog, say so and STOP — never silently fall back to the file backend, because a write that lands in a file the user believes is dead is exactly the divergence this backend exists to prevent.' "$registry" "${DX_PROJECT_SPACE:-unset}"
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
  emit 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project` (bare) — report the CURRENT project, do NOT list the registry. Resolve it: prefer the entry whose name matches this branch (strip a leading `claude/` and a trailing `-<hash>` from `git branch --show-current`); otherwise the single `active` entry for the current user (`whoami`). If neither resolves, say so and suggest `/dxos:project list`. Then report, compactly: (1) worktree directory + branch; (2) the project name, status, and its `tasks`/`design` paths and `prs`; (3) tracked-file state — `git status --short` and whether the branch is ahead of origin, naming every uncommitted file rather than summarising. Render EVERY file path as a repo-relative markdown link so it is clickable. (4) the next action, taken from the entry'"'"'s `resume` field and condensed to one line. No numbered options unless something genuinely needs a decision.'
}

emit_tasks() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project tasks` — args: "%s". Read the CURRENT project'"'"'s TASKS.md (resolve the project exactly as for bare `/dxos:project`; the path is the entry'"'"'s `tasks` field). Report the OPEN work only — every unchecked `- [ ]` item, grouped under its `##` phase, each as one line: the bold headline plus the shortest note that makes it actionable. Number them 1..N across the whole list so the user can refer to one, and link the file itself. Then give a one-line count of done vs open, and name the next action. Do NOT reproduce completed `- [x]` items unless the args ask for `all`; if the args name a phase, restrict to it. If the entry has no `tasks` file, say so and suggest `/dxos:project`.' "$1")"
}

emit_list() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project list` — args: "%s". Render the active projects as a markdown table whose FIRST column is a 1-based row number (# | name | status | user | host | one-line summary). BY DEFAULT show only projects whose `user` matches the current user (run `whoami`); if none match, say so and mention `/dxos:project list all` — do not show other users unasked. Args `all`: list every user. Then tell the user they can reply with a row number to resume that project — a lone number in their next message means "resume the project at that row" (same as `/dxos:project resume <name>`). Confirm in one short line.' "$1")"
}

emit_setup() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project setup` — args: "%s". Bind this repo to the ECHO space its projects live in, by writing the committed `.agents/projects/space.yml` (`spaceId: <id>`). The procedure belongs to the `project` skill the MCP server serves, so LOAD THAT SKILL FIRST (`loadSkill` where present, else the projected `project` prompt) and follow its setup section rather than improvising one: it lists the spaces by name, asks which, cross-checks the pick against the spaces this session can actually write to, and writes the file. The space is ALWAYS an explicit choice by the user — never infer one from a name resembling the repo, and a single space is not consent. Args, when present, name the space, and skip the question only when they match exactly one. If the BACKEND line below says `file`, write the binding anyway and say plainly that nothing reads it until DX_PROJECT_BACKEND is `mcp`. If the session advertises no MCP tools at all, say so and STOP rather than hand-writing a spaceId you cannot verify.' "$1")"
}

emit_new() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project new` — args: "%s". Add an `active` registry entry (user = `whoami`, host = `hostname -s`, created = today) and scaffold `<registry-dir>/<name>/{TASKS,DESIGN}.md` unless the docs already live elsewhere (record that path instead). Set this session'"'"'s title to the project name via the session-management set_session_title tool (session_id "self") when that tool is available. Confirm in one line.' "$1")"
}

emit_end() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project end` — args: "%s". Move the entry to `ended` in the registry, recording the final PR/status. Confirm in one line.' "$1")"
}

emit_track() {
  emit "$(printf 'TASK-PLANNING DIRECTIVE: `/dxos:project track`. Record this follow-up in the TASKS.md of the current unit of work (package or directory) per the task-planning skill — do NOT use a background task chip. Item: "%s". Confirm in one short line.' "$1")"
}

emit_history() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project history` — args: "%s". Report the PRs a project has produced, newest first. Default to the CURRENT project (resolve it exactly as for bare `/dxos:project`); args `all` covers every project belonging to the current user (`whoami`); a bare name restricts to that project. The project entry`s `prs` list — read through the store named by the BACKEND line below — is the SOURCE OF TRUTH for which PRs count as tracked; never enumerate the branch`s commits or the repo`s PR list instead, since those include work this project never claimed. Enrich each number with `gh pr view <n> --json number,title,url,author,mergedAt,createdAt,state` (one call per PR — do NOT batch through `gh pr list`, whose defaults (`--state open`, `--limit 30`) silently drop the merged PRs that make up most of a history). Render ONE markdown table, columns: # | PR (as a markdown link to the PR URL) | date (merged date, else created, ISO yyyy-mm-dd) | user (the GitHub author login) | summary. The summary is ONE sentence in your own words describing what the PR changed — derive it from the title and the project ledger, never paste the raw title if it is uninformative. Add a `project` column only when covering more than one project. If `gh` is unavailable or unauthenticated, say so in one line and still render the table with the PR numbers and whatever the registry knows, leaving date and user blank rather than guessing. If the project has no `prs`, say so in one line and stop.' "$1")"
}

emit_help() {
  emit 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project help` — render the verbs as a markdown table with columns: command | description. Rows, in this order and no others: `/dxos:project` (status of the current project — worktree, branch, docs, PRs, uncommitted files, next action); `/dxos:project setup [space]` (bind this repo to the ECHO space its projects live in — `mcp` backend only); `/dxos:project list [all]` (numbered table of active projects; reply with a row number to resume — `all` covers every user); `/dxos:project tasks [all|<phase>]` (open `- [ ]` items from the current project, numbered and grouped by phase); `/dxos:project spawn <N...>` (spin the numbered open tasks out into background task chips); `/dxos:project history [all]` (table of the PRs the project produced — date, author, one-sentence summary); `/dxos:project new <name>` (register a project and scaffold its TASKS.md + DESIGN.md); `/dxos:project end <name>` (move the entry to `ended`, recording final status); `/dxos:project track <text>` (record a follow-up in the active TASKS.md — never a task chip); `/dxos:project hydrate` (checkpoint before stopping or opening a PR; alias `checkpoint`); `/dxos:project resume [name]` (reload project state at the start of a session). Then add ONE line noting that bare `/project` also matches every verb, and ONE line naming the store from the BACKEND line below. Add nothing else — no preamble, no numbered options, no next-action suggestion.'
}

emit_spawn() {
  emit "$(printf 'TASK-PLANNING PROJECT DIRECTIVE: `/dxos:project spawn` — args: "%s". Spin the named open task(s) out into background task chips. Resolve the CURRENT project exactly as for bare `/dxos:project`, then read its OPEN tasks through the store named by the BACKEND line below — the ledger file under the `file` backend, the project`s TaskSet/outline under `mcp` — and number them 1..N in the SAME order `/dxos:project tasks` renders them; the numbering must agree, since the user is quoting a row they just saw. The args are those row numbers (space or comma separated, e.g. `1 3`); with NO args, do not guess — render the numbered open list and ask which. For each selected item call this session`s task-chip tool once (`mcp__ccd_session__spawn_task` where present), with: a `title` that is a short imperative phrase from the item headline; a `prompt` that STANDS ALONE — the agent receiving it has none of this conversation, so include the project name, the item headline and every sub-bullet verbatim, any file paths, PR numbers or commands the item references, and the ledger location the store gives you (a repo-relative path under `file`; the project/TaskSet identifier under `mcp`); and a `tldr` of one or two plain sentences. If this session has NO task-chip tool, say so and stop — do NOT substitute a subagent, which would run the work now instead of handing it off, and do not silently do the task yourself. Do NOT start the work yourself and do NOT check the item off — a chip is a handoff, and the item stays open until the spawned session finishes it. Then confirm in one line per chip, naming the row number and title. If a row number does not exist, say so and list the valid range rather than spawning something adjacent. NOTE the standing rule this does NOT break: a follow-up you discover mid-task still belongs in TASKS.md via `track`, never a chip — `spawn` only ever acts on an item ALREADY recorded there.' "$1")"
}

emit_hydrate() {
  emit 'TASK-PLANNING HYDRATE: `/dxos:project hydrate`. Follow the task-planning skill "Project handoff" -> hydrate: identify the CURRENT project (the single `active` entry for the current user; if more than one, ask which), reconcile its TASKS.md (check off done, note next step on in-progress items), update its `resume` field + the doc resume pointer, push decisions into its DESIGN.md and durable direction to memory, run git status and account for EVERY uncommitted file, then confirm the checkpoint in one short block (done / in-progress / next / uncommitted). If the checkpoint records a PR in the entry'"'"'s `prs` (opening one is the usual reason to hydrate), set this session'"'"'s title to `<project> - #<PR>` — the NEWEST PR when the entry lists several — via the session-management set_session_title tool (session_id "self") when that tool is available.'
}

emit_resume() {
  emit "$(printf 'TASK-PLANNING RESUME: `/dxos:project resume`. Follow the task-planning skill "Project handoff" -> resume: pick the project — %s. Stay in this session'"'"'s assigned worktree: NEVER cd into, edit in, or adopt another project'"'"'s worktree or branch — if the prior work lives on an unmerged branch elsewhere, report that and ask the user instead of following it. Read the project'"'"'s `tasks` (TASKS.md) + `design` doc, check git status + recent git log, report a concise state (done / in-progress / next action / uncommitted), set this session'"'"'s title to `<project> - #<PR>` — the NEWEST PR in the entry'"'"'s `prs` when it lists several, bare `<project>` when it lists none — via the session-management set_session_title tool (session_id "self") when that tool is available - the desktop app shows the title where a statusline would be - then continue with the next action unless the user directed otherwise.' "$1")"
}

# First line only — a slash command leads the message, and restricting the match
# here is what stops a later line that merely quotes the command from firing.
first_line=$(printf '%s' "$prompt" | head -1)

# Accept the namespaced plugin form and the bare form. The boundary rule keeps
# `/projects` as prose while `/dxos:project` and `/dxos:project list` fire.
raw=$(printf '%s\n' "$first_line" \
  | grep -ioE '^[[:space:]]*/(dxos:)?project($|[^a-zA-Z0-9_:-][^[:cntrl:]]*)' | head -1 || true)

if [ -n "${raw:-}" ]; then
  args=$(printf '%s' "$raw" | sed -E 's|^[[:space:]]*/(dxos:)?project[[:space:]]*||I')
  verb=$(printf '%s' "$args" | awk '{print tolower($1)}' | tr -cd 'a-z')
  rest=$(printf '%s' "$args" | sed -E 's/^[^[:space:]]+[[:space:]]*//')

  case "$verb" in
    '') emit_info ;;
    setup) emit_setup "$rest" ;;
    list) emit_list "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')" ;;
    tasks) emit_tasks "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')" ;;
    new) emit_new "$rest" ;;
    end) emit_end "$rest" ;;
    track) emit_track "$rest" ;;
    history) emit_history "$(printf '%s' "$rest" | tr -cd 'a-zA-Z0-9 -')" ;;
    spawn) emit_spawn "$(printf '%s' "$rest" | tr -cd '0-9, ')" ;;
    help) emit_help ;;
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
      printf 'TASK-PLANNING: `/dxos:project %s` — verb not recognized (valid: bare | setup [space] | list [all] | tasks [all] | new <name> | end <name> | track <text> | history [all] | spawn <N...> | help | hydrate | resume [name]). Ask which was meant.\n' "$verb"
      ;;
  esac
fi

exit 0
