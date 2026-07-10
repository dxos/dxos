---
name: task-tracking
description: Use when work spans multiple steps, phases, or sessions, when resuming a task started earlier, when the user asks for a plan/roadmap/progress tracking, or when they use the `$track` / `track:` sentinel. Covers maintaining a durable TASKS.md in the active package or directory.
---

# Task Tracking

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

**When NOT to use:**

- Throwaway one-offs (a single edit, a quick answer) — just do them.
- Cross-package chores with no single home — keep those in TodoWrite.
- Duplicating TodoWrite — pick one; don't mirror the same list in both.

## Location & Format

One file per unit of work: `<root>/TASKS.md`, where `<root>` is the package root
when there is one (e.g. `packages/plugins/plugin-magazine/TASKS.md`), or
otherwise the directory you're working in (e.g.
`.agents/skills/task-tracking/TASKS.md`). Match the existing convention:

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
- Keep headlines imperative and specific; put the *why* in the phase context.

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

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Stale checkboxes (work done, box unchecked) | Update `TASKS.md` in the same edit as the code. |
| Spawning a task chip for an in-scope follow-up | Record it in `TASKS.md`; chips are only for separate spin-off work. |
| `TASKS.md` in the wrong package/directory or worktree | Write to the unit of work you're actually editing, in the session's worktree. |
| Duplicating TodoWrite and `TASKS.md` | `TASKS.md` = durable/committed; TodoWrite = in-session scratch. Don't mirror. |
| Leaving `TASKS.md` uncommitted | Commit it with the work; account for it in `git status`. |
| Batch-checking all items at the very end | Check off incrementally as each task lands. |
