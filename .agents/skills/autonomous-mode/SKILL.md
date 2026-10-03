---
name: autonomous-mode
description: >-
  Working under AUTONOMOUS MODE — a pinned task the session must drive to a written
  definition of done without asking the user anything. Use when an `AUTONOMOUS MODE` block
  appears in the turn's context, when `/autonomous` is invoked, when you are about to ask a
  clarifying question about scope or PR size and cannot, when a blocker looks like a reason
  to stop, or before ending a run (the adversarial review and the stop command).
---

# Autonomous mode

A run is one pinned task plus a definition of done, and a standing instruction:
**do not ask, decide.** The mechanism is `/autonomous [task]`; this skill is how
to behave while it is on.

The state and the two logs live under `.claude/` (all untracked, per-worktree):

| File                  | Written by                     | What it is                      |
| --------------------- | ------------------------------ | ------------------------------- |
| `.autonomous`         | the `UserPromptSubmit` hook    | the pinned task                 |
| `.autonomous-dod`     | **you**, once, before working  | the definition of done          |
| `.autonomous-user.md` | the hook, every turn, verbatim | every message the user has sent |
| `.autonomous-log.md`  | **you**, as you decide         | the decision log                |

Everything is driven through one script:

```bash
bash .claude/scripts/autonomous.sh dod set '1. … 2. …'   # once, first
bash .claude/scripts/autonomous.sh log add 'chose X over Y — Z'
bash .claude/scripts/autonomous.sh user show             # what the user actually said
bash .claude/scripts/autonomous.sh stop 'done: …'        # the only clean exit
```

## 1. Write the definition of done before you touch anything

A DoD is a checklist of **verifiable conditions**, not intentions. "Refactor the
query layer" is a task; "`moon run echo:test` passes, no `as any` added, one
changeset, PR opened" is a definition of done. Test: could a reviewer who has
never seen this conversation check every item without asking you what you meant?
If not, it is too vague — and it is what the Stop hook will quote back at you.

Derive it from the task and the evidence in §2, store it, and do not silently
widen or narrow it later. A change of scope is a logged decision:

```bash
bash .claude/scripts/autonomous.sh log add 'dropped item 4 (storybook screenshots) — no server reachable in the sandbox; DoD updated'
bash .claude/scripts/autonomous.sh dod set '<the new checklist>'
```

## 2. Resolve questions from evidence, in this order

The user is not available. Ambiguity is still resolvable — in almost every case
the answer already exists:

1. **The user log — read it first.** `autonomous.sh user show` is every message
   the user has sent this session, verbatim, oldest first. **Scoping and PR-size
   questions are what it is for.** "Should this also fix the adjacent bug?"
   "One PR or three?" "Do they want the migration too?" — the user has almost
   always already said, in an aside three turns before the task existed. Grep it
   before you decide anything about what is in or out:

   ```bash
   grep -inE 'scope|small|minimal|separate|one PR|split|just |only |don.t bother' .claude/.autonomous-user.md
   ```

   The log is gitignored and never leaves the worktree, but it is a verbatim
   copy of the conversation — never paste its contents into a commit message, a
   PR body, or anywhere outbound, for the same reason `AGENTS.md` keeps
   credentials out of chat in the first place.

   Their stated _preferences_ count as much as their instructions: someone who
   said "keep PRs small" earlier has answered a scoping question you were about
   to ask.

2. **The repo.** `AGENTS.md`, `.claude/CLAUDE.md`, the skill for the area, and —
   most decisive — the existing code and its tests. A convention already
   followed by ten call sites is the answer; do not invent an eleventh.

3. **The most reversible option that keeps the task moving.** When evidence runs
   out, prefer the choice that is cheapest to undo — a narrower change, a new
   file over a rewritten one, a flag defaulted to today's behaviour — take it,
   log it, and carry on.

**What "do not ask" does and does not mean.** No clarifying questions, no
confirmations, no menus, no "should I proceed?". It does **not** mean hiding
choices: state the decision and its reason in the reply, briefly, so the user
can veto it if they are watching. Announcing is not asking.

## 3. Log decisions as you take them

One line each, at the moment of choosing — a log written at the end is a
reconstruction, and the reason it existed is already gone. Log:

- any choice between real alternatives (library, layer, file layout, algorithm);
- anything inferred from the user log rather than instructed, with the quote;
- every scope change, in or out;
- every route tried around a blocker, including the ones that failed;
- the adversarial review verdict.

Do not log routine mechanics — files read, tests run, commits made. The diff and
the transcript already have those.

## 4. A blocker is work, not an exit

Before "I cannot do this" is even a candidate, try **at least two independent
routes** and log each:

- read the failing code or test rather than the error message;
- a different tool for the same job (the sandbox has no `gh` — the
  `mcp__github__*` tools do the same work; `moon` may not load — typecheck
  against sources, see the `cloud-sandbox` skill);
- a narrower scope that still satisfies the DoD;
- the fallback the relevant skill documents for exactly this failure;
- a subagent, when the blocker is breadth of search rather than depth.

Missing credentials, a network-refused host, or a genuinely absent decision only
the user can make are the real dead ends — and they are dead ends only after the
routes above are logged as tried.

## 5. Adversarial review before stopping

Never end a run on your own satisfaction. Attack the change first:

- `/code-review` on the diff, or the `agentic-review` skill for the repo's
  `.mdl` rules;
- or a subagent asked to find what CI and a hostile reviewer would reject;
- plus the checks that actually gate: `pnpm format`, the package's lint and
  tests, and a re-read of your own diff for casts, stray comments, and
  compatibility shims (the `code-style` skill's pre-commit audit).

Fix what it finds — that is part of the task, not follow-up work — then log the
verdict.

## 6. Stopping

Exactly two grounds, and both end the run explicitly:

```bash
bash .claude/scripts/autonomous.sh stop 'done: <what was verified, against which DoD items>'
bash .claude/scripts/autonomous.sh stop 'blocked: <what, and the routes that failed>'
```

That command clears the state, which is what silences the `Stop` hook. Go quiet
without it and the hook blocks the turn and hands the task straight back, up to
three times per user turn; after that it tells the **user** the run was
abandoned. There is no third option and no partial credit: an unmet DoD item is
either worked or logged as blocked.

The user can end a run at any time with `/autonomous off [reason]`.

## 7. What autonomous mode never overrides

Autonomy is about questions, not permissions. Still binding, and grounds to stop
with that as the logged reason if the task requires crossing one:

- the `AGENTS.md` non-negotiables — never edit on `main`, never create, rename
  or switch worktrees or branches, no casts to silence the type-checker, never
  suppress unhandled errors, never touch a copyright notice, format before every
  commit;
- destructive or irreversible actions outside the task's own scope — force
  pushes to shared branches, deletes the DoD does not name, anything that leaves
  the machine (publishing, sending, posting) beyond what the task explicitly is;
- honesty about outcomes. A failing test is reported as failing, with its
  output. "Done" means verified.
