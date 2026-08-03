# Agent Directives — Tasks

## Phase 1: Document the control surface

The control points are spread across two settings files, two hook directories, a
symlinked skill tree and four markdown files, with no single place that says how
they fit together. Write that down first — the later phases are edits to this
surface and are unreviewable without it.

### Tasks

- [x] **Research: can a post-processing step control response length?** — No.
      `Stop` can measure `last_assistant_message` but `decision:"block"` emits an
      _additional_ message, so enforcing terseness post-hoc adds text;
      `MessageDisplay` can rewrite the displayed answer but is display-only (the
      transcript keeps the original, so the model never learns). Verbosity is a
      generation-time property. Full findings in `DESIGN.md`.
- [x] **Verify the dilution hypothesis** — Confirmed. ~7.2k tokens of
      always-loaded instruction across 4 files; response directives are 6 lines
      of it (~1.3%), never repeated. `composer-plugins/SKILL.md` is 42KB (~4x
      `AGENTS.md`) and loads _later_, so it outranks them positionally.
- [ ] **Write `.claude/README.md`** — control points (generic / lifecycle /
      ours) plus a NOTES section explaining hooks, sentinels and commands.

## Phase 2: Make the response directives durable

`UserPromptSubmit` `additionalContext` lands adjacent to the current prompt —
last position, every turn, immune to dilution. `response-mode.sh` already owns
that channel but `context` returns early in `natural`, so the machine is silent
in its default state. That single gap is why "be terse" never survives.

### Tasks

- [ ] **Emit in every state** — `scripts/response-mode.sh context` currently
      `exit 0`s unless the mode is `concise`. Make it always emit: invariants in
      both modes, budget varying by mode.
- [ ] **Normalize the sentinel to `$mode <MODE>`** — the current regex matches a
      bare `$natural` / `$concise` anywhere in the message, so prose _about_ the
      modes flips them. Observed live on 2026-08-03: a message containing
      "`$natural/$concise/$verbose`" as an example set the mode. A two-token
      grammar can't be hit by accident.
- [ ] **Add `/mode` as a second entrance** — a slash command cannot write state
      (it expands into a prompt and depends on the agent to act), so keep the
      sentinel as the deterministic path and give `/mode` a
      `UserPromptExpansion` hook (matcher `mode`) doing the same write. One
      backend, two entrances, neither relying on agent compliance.
- [ ] **Fold in the state-independent invariants** — numbered questions/options
      always; state worktree + branch on any reply that writes files or runs
      commands (`AGENTS.md:24` requires it in the _first_ reply only, so it
      decays immediately — the recurring "which worktree are you in?").
- [ ] **Consolidate the scattered sources** — `AGENTS.md:27`,
      `~/.claude/CLAUDE.md:8-10`, `.claude/CLAUDE.md:10-16` each state part of
      the response contract. One canonical statement, pointers elsewhere.
- [ ] **Refresh `AGENTS.md`** — add the "Responding to the user" section; note
      that the hook re-injects it per turn.

### Open decisions

- [ ] Terse-mode budget: ≤8 lines / ≤15 lines / unbudgeted prose directive.
- [ ] Does `normal` mode carry a budget at all, or invariants only?
- [ ] Edit `~/.claude/CLAUDE.md` (global, affects every project) or leave it and
      let the repo hook override?
- [ ] Default mode when `.claude/.response-mode` is absent: `normal` or `terse`?

## Phase 3: Cleanups found on the way

### Tasks

- [ ] **Delete the orphaned `.agent/` (singular) directory** — 7 tracked files
      (`workflows/make-pr-ready.md` + 6 `workflows/types/*.ts`) from PR #10381.
      Verified 2026-08-03: zero runtime references — no code, config or glob
      loads it; only mechanical repo-wide refactors keep it current. Distinct
      from `.agents/` (plural), which is load-bearing: `.claude/skills` is a
      symlink into `.agents/skills` (26 skills) and `.agents/projects/registry.yml`
      is live task-planning state. Own PR. Also tracked at
      `.agents/projects/ai-testing-strategy/TASKS.md:411` — close that entry
      when this lands.
- [ ] **Collapse the two `response-mode.sh` files, or document the split** —
      `.claude/hooks/response-mode.sh` is the `UserPromptSubmit` adapter,
      `.claude/scripts/response-mode.sh` the state backend (`get|set|toggle|context`).
      Defensible in principle, unearned as built: one caller, and the
      hand-runnable path is documented nowhere.
- [ ] **Fix the stale claim that desktop has no slash commands** —
      `.claude/CLAUDE.md:10` and `task-planning/SKILL.md` both assert it;
      `.claude/commands/commit.md` registers and resolves as `/commit`.
- [ ] **Surface guard-hook output to the user** — `branch-beacon.sh` writes plain
      stdout on `UserPromptSubmit`, which only the agent sees. Adding
      `systemMessage` to the same invocation would print it to the user too.

### References

- `DESIGN.md` — findings, the control-point taxonomy, and the state-machine argument.
- Hook reference: https://code.claude.com/docs/en/hooks
- `b692a546c0` (#12148) — added the response-mode toggle and the worktree guards.
