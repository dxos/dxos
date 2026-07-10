---
name: task-tracking
description: Use when work in a package spans multiple steps, phases, or sessions, when resuming a task started earlier, or when the user asks for a plan, roadmap, or progress tracking. Covers maintaining a durable TASKS.md in the active package.
---

# Task Tracking

## Overview

`TASKS.md` at the root of the package you are actively working in is the
**durable, committed task ledger** for that work. It survives context resets and
new sessions, so both you and the user can resume mid-task and see exactly what
is done, in progress, and pending.

It is distinct from in-session TodoWrite: TodoWrite is ephemeral scratch for the
current turn; `TASKS.md` is the persistent source of truth that lives in the
repo. Use your judgment about when a task warrants one — err toward creating it.

## When to Use

- Work in a package spans **3+ distinct steps**, multiple files, or phases.
- The task will likely outlive one session (you'll resume it later).
- The user asks for a plan, roadmap, or to track progress.
- You are resuming work — read the package's `TASKS.md` first to reload state.

**When NOT to use:**

- Throwaway one-offs (a single edit, a quick answer) — just do them.
- Cross-package chores with no single home — keep those in TodoWrite.
- Duplicating TodoWrite — pick one; don't mirror the same list in both.

## Location & Format

One file per package: `<package-root>/TASKS.md` (e.g.
`packages/plugins/plugin-magazine/TASKS.md`). Match the existing convention:

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

1. **At task start** — read the package's existing `TASKS.md` (if any) to reload
   state; otherwise create one with the phase and its tasks.
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
| `TASKS.md` in the wrong package or worktree | Write to the package you're actually editing, in the session's worktree. |
| Duplicating TodoWrite and `TASKS.md` | `TASKS.md` = durable/committed; TodoWrite = in-session scratch. Don't mirror. |
| Leaving `TASKS.md` uncommitted | Commit it with the work; account for it in `git status`. |
| Batch-checking all items at the very end | Check off incrementally as each task lands. |
