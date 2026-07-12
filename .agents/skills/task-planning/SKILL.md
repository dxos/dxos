---
name: task-planning
description: Use when work spans multiple steps, phases, or sessions, when resuming a task started earlier, when the user asks for a plan/roadmap/progress tracking, or when they use the `$track` / `track:`, `$hydrate`, `$resume`, or `$project` sentinel. Covers the project registry (`.agents/projects/registry.yml`), maintaining a durable TASKS.md + DESIGN.md per work-stream, and checkpointing/reloading project state across sessions and PRs.
---

# Task Planning

## Overview

`TASKS.md` at the root of the **unit of work** you are actively in — usually a
package, or the directory you're working in when there is no package (e.g. a
skill, a hook, a script) — is the **durable, committed task ledger** for that
work. It survives context resets and new sessions, so both you and the user can
resume mid-task and see exactly what is done, in progress, and pending.

It is distinct from in-session TodoWrite: TodoWrite is ephemeral scratch for the
current turn; `TASKS.md` is the persistent source of truth that lives in the
repo. Use your judgment about when a task warrants one — err toward creating it.

**Never reach for a background task chip (`spawn_task`) to record a follow-up on
the work you're doing — that follow-up belongs in `TASKS.md`.** Task chips are
only for genuinely separate work that should spin off into its own session.

## Projects (registry)

A **project** is a work-stream — one coherent effort, usually one branch/worktree
— with its own `TASKS.md` (the ledger) and `DESIGN.md` (the _why_: spec +
decisions). All projects are listed in a committed registry so you and any future
session can see everything in flight and resume the right one.

**Registry:** `.agents/projects/registry.yml` — one entry per project, recording
where its docs and PRs live:

```yaml
projects:
  - name: mailbox-research # stable slug
    status: active # active | paused | blocked | ended
    user: burdon # owner (git/system username, e.g. `whoami`)
    host: burdon-mbp-2022 # machine the project lives on (`hostname -s`)
    branch: claude/mailboxsync-…
    created: 2026-07-05
    summary: One line — what this stream delivers.
    tasks: path/to/TASKS.md # a package file, or .agents/projects/<name>/TASKS.md
    design: path/to/DESIGN.md # spec + decisions (a REPORT.md counts)
    prs: [12163]
    resume: 'The single next action.'
ended: []
```

- The registry records the **location** of each doc, so an existing effort points
  at its package files and a brand-new project defaults to
  `.agents/projects/<name>/{TASKS.md,DESIGN.md}`. Keep it committed and current.

### The `$project` sentinel

- `$project` (bare) or `$project list` — render the active projects as a
  **numbered markdown table**: the first column is a 1-based row number, followed
  by `name`, `status`, `user`, `branch`, and a one-line summary. **By default show
  only the current user's projects** (`user` == `whoami`); `$project list all`
  (or `$project all`) lists every user. Then tell the user they can reply with a
  row number to resume that project. **A lone number in the user's next message
  means "resume the project at that row"** — run the "Project handoff" → resume
  steps for that entry (equivalent to `$resume <that name>`).
- `$project new <name> [summary]` — add an `active` entry (branch = current,
  `user` = `whoami`, `host` = `hostname -s`); scaffold
  `.agents/projects/<name>/{TASKS.md,DESIGN.md}` unless the docs already live
  somewhere (record that path instead). Confirm in one line.
- `$project end <name>` — move the entry to `ended`, recording the final PR/status.

`$resume` / `$hydrate` (see "Project handoff") key off this registry: **which
project** is resolved by name (`$resume <name>`), by the row number from the most
recent `$project` table, or — with no argument — by the entry whose `branch`
matches the current one. Never a guess.

## When to Use

- Work spans **3+ distinct steps**, multiple files, or phases.
- The task will likely outlive one session (you'll resume it later).
- The user asks for a plan, roadmap, or to track progress.
- The user uses the **`$track` / `track:` sentinel** (see below) — always record
  the item, never a task chip.
- You are resuming work — read the existing `TASKS.md` first to reload state.

### The `$track` sentinel

Desktop clients don't expose custom slash commands, so an explicit
track request is a sentinel in a normal message:

- `$track <text>` anywhere in a message, or
- a line beginning `track: <text>`.

A `UserPromptSubmit` hook (`.claude/hooks/track.sh`) detects it and injects a
directive to append `<text>` to the active `TASKS.md`. When you see that
directive, add the item and confirm in one line.

### The `$hydrate` / `$resume` sentinels

The same hook detects two project-handoff sentinels (see "Project handoff"
below for what each does):

- `$hydrate` (also `$checkpoint`) — **checkpoint** the project before you stop or
  open a PR: reconcile `TASKS.md`, refresh the resume pointer, account for
  uncommitted work.
- `$resume` (also `$rehydrate`) — **reload** state at the start of a session:
  read `TASKS.md` + any linked doc, check `git status`, report where things
  stand, then continue.

**When NOT to use:**

- Throwaway one-offs (a single edit, a quick answer) — just do them.
- Cross-package chores with no single home — keep those in TodoWrite.
- Duplicating TodoWrite — pick one; don't mirror the same list in both.

## Location & Format

One file per unit of work: `<root>/TASKS.md`, where `<root>` is the package root
when there is one (e.g. `packages/plugins/plugin-magazine/TASKS.md`), or
otherwise the directory you're working in (e.g.
`.agents/skills/task-planning/TASKS.md`). Match the existing convention:

```markdown
# <Package> — Tasks

## Phase 2: <goal>

Short paragraph of context — what this phase delivers and why.

### Tasks

- [ ] **Headline task**
  - Concrete sub-step with the specific API/file involved.
  - Another sub-step.
- [x] **Completed task** — one-line note on what shipped.

### References

- Links to specs, external docs, related PRs.
```

- Phases are `##`; tasks are `- [ ]` / `- [x]`; detail as nested bullets.
- Keep headlines imperative and specific; put the _why_ in the phase context.

## Workflow

1. **At task start** — read the existing `TASKS.md` (if any) to reload state;
   otherwise create one with the phase and its tasks.
2. **As you work** — check off `- [x]` in the **same change** that completes the
   work. Never leave checkboxes stale, and never batch-check everything at the
   end.
3. **When parking a task** — leave a one-line status note on the item (what's
   blocked, what's next) so it's resumable.
4. **Before claiming done** — reconcile `TASKS.md` against reality: every checked
   item is actually complete, and no completed work is left unchecked.
5. **Commit it** — `TASKS.md` is committed alongside the work it tracks. Do not
   leave it as an uncommitted local edit (see "commit nothing silently").

## Project handoff (`$hydrate` / `$resume`)

`TASKS.md` is the handoff medium — no separate `HANDOFF.md` (keep plans in the
original doc). The two sentinels are the explicit checkpoint/reload verbs.

### `$hydrate` — checkpoint before stopping or opening a PR

1. **Reconcile `TASKS.md`** — check off what's done; add a one-line status note to
   each in-progress item (what's blocked, what's next).
2. **Refresh the resume pointer** — a single italic line under the title:
   `_Resume: <the one next action>. Uncommitted: <none | files>. Last: <what just landed>._`
3. **Push the _why_ into the design doc** (if the work has one — `REPORT.md`,
   `DESIGN.md`, a spec): decisions and findings live there; `TASKS.md` stays the
   ledger. Save durable, cross-session direction to memory (it auto-loads next
   session) — not to a doc.
4. **Account for uncommitted work** — `git status`; commit everything or state
   plainly in the resume pointer what's left uncommitted. Uncommitted work is the
   number-one thing a resumed session loses.
5. **Confirm** the checkpoint in one short block (done / in-progress / next /
   uncommitted).

### `$resume` — reload at the start of a session

1. **Read** the active `TASKS.md` (and any doc it links); memory is already
   loaded.
2. **Check the tree** — `git status` + recent `git log`; surface uncommitted work
   and the last commits.
3. **Report** a concise state: done / in-progress / **next action** / uncommitted.
4. **Continue** with the next action, or wait for direction if the user gave any.

## Viewing

Open `TASKS.md` directly to see it rendered — Claude Code previews Markdown
files in the Browser pane, so the checklist is visible while you work.

## Common Mistakes

| Mistake                                               | Fix                                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Stale checkboxes (work done, box unchecked)           | Update `TASKS.md` in the same edit as the code.                               |
| Spawning a task chip for an in-scope follow-up        | Record it in `TASKS.md`; chips are only for separate spin-off work.           |
| `TASKS.md` in the wrong package/directory or worktree | Write to the unit of work you're actually editing, in the session's worktree. |
| Duplicating TodoWrite and `TASKS.md`                  | `TASKS.md` = durable/committed; TodoWrite = in-session scratch. Don't mirror. |
| Leaving `TASKS.md` uncommitted                        | Commit it with the work; account for it in `git status`.                      |
| Batch-checking all items at the very end              | Check off incrementally as each task lands.                                   |
