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
- [x] **Write `.claude/README.md`** — control points (generic / lifecycle /
      ours) plus a NOTES section explaining hooks, sentinels and commands.
- [x] **Rename `response-mode` → `mode`** to match the sentinel: both scripts,
      the state file (`.claude/.mode`), the `settings.json` binding, the
      `.gitignore` entry, and the injected banner.
- [x] **Rename the mode values to `terse` / `normal`** — stored state,
      `set`/`toggle` output, the sentinel regex, and the banner (`MODE: TERSE`).
      `concise` aliases `terse`; `natural`/`default`/`off` alias `normal`. The
      state file is canonicalised on read, so a stale or hand-edited value
      cannot wedge the machine in an unrecognised mode.

## Phase 2: Make the response directives durable

`UserPromptSubmit` `additionalContext` lands adjacent to the current prompt —
last position, every turn, immune to dilution. `mode.sh` already owns that
channel but used to return early in `normal`, leaving the machine silent in its
default state. That single gap is why "be terse" never survived.

### Tasks

- [x] **Emit in every state** — `scripts/mode.sh context` now prints the
      `RESPONSE RULES` block in both modes; only the length clause branches.
- [x] **Fold in the state-independent invariants** — open every reply with the
      worktree and the instruction/skill files read that turn; number every
      question and option set; lead with the answer. `AGENTS.md` previously
      required the worktree line in the _first_ reply only, so it decayed
      immediately — hence the recurring "which worktree are you in?".
- [x] **Refresh `AGENTS.md`** — replaced the first-reply clause with a
      "Responding to the user" section, canonical, noting the per-turn
      re-injection.
- [x] **Consolidate the scattered sources** — `.claude/CLAUDE.md` now points at
      the canonical section instead of restating it.
- [ ] **Update `~/.claude/CLAUDE.md`** (decision: yes). BLOCKED from the agent
      side: it symlinks to `~/Code/richburdon/config/dotfiles/.claude/CLAUDE.md`,
      a separate repo whose HEAD is `main`, so `guard-worktree.sh` refuses the
      edit. Needs the user to apply it, or to branch that repo.
- [ ] **Drop the bare one-token sentinel forms** — the regex still matches a bare
      `$terse` / `$normal` (and the aliases) anywhere in the message, so prose
      _about_ the modes flips them. Observed live on 2026-08-03: a message
      containing "`$natural/$concise/$verbose`" as an example set the mode. Only
      the two-token `$mode <MODE>` should remain — prose can't hit it by accident.
- [ ] **Add `/mode` as a second entrance** — a slash command cannot write state
      (it expands into a prompt and depends on the agent to act), so keep the
      sentinel as the deterministic path and give `/mode` a
      `UserPromptExpansion` hook (matcher `mode`) doing the same write. One
      backend, two entrances, neither relying on agent compliance.

### Decisions (settled 2026-08-03)

- [x] Terse-mode budget: **8 lines**, minimal markdown, no headings/nesting.
- [x] `normal` carries **no budget** — invariants only, plus "stay
      proportionate; length is earned by content".
- [x] **Yes**, update the global `~/.claude/CLAUDE.md` (blocked, see above).
- [x] Default when `.claude/.mode` is absent: **`normal`**.

## Phase 3: Cleanups found on the way

### Tasks

- [x] **Delete the orphaned `.agent/` (singular) directory** — done 2026-08-03
      (by the user, in this worktree). 7 tracked files
      (`workflows/make-pr-ready.md` + 6 `workflows/types/*.ts`) from PR #10381.
      Verified before removal: zero runtime references — no code, config or glob
      loaded it; only mechanical repo-wide refactors kept it current. Distinct
      from `.agents/` (plural), which is load-bearing: `.claude/skills` is a
      symlink into `.agents/skills` (26 skills) and `.agents/projects/registry.yml`
      is live task-planning state. Still open at
      `.agents/projects/ai-testing-strategy/TASKS.md:411` — close that entry
      when this lands.
- [ ] **Collapse the two `mode.sh` files, or document the split** —
      `.claude/hooks/mode.sh` is the `UserPromptSubmit` adapter,
      `.claude/scripts/mode.sh` the state backend (`get|set|toggle|context`).
      Defensible in principle, unearned as built: one caller, and the
      hand-runnable path is documented nowhere.
- [ ] **Fix the stale claim that desktop has no slash commands** — removed from
      `.claude/CLAUDE.md`; `task-planning/SKILL.md` still asserts it.
      `.claude/commands/commit.md` registers and resolves as `/commit`.
- [ ] **Surface guard-hook output to the user** — `branch-beacon.sh` writes plain
      stdout on `UserPromptSubmit`, which only the agent sees. Adding
      `systemMessage` to the same invocation would print it to the user too.

### References

- `DESIGN.md` — findings, the control-point taxonomy, and the state-machine argument.
- Hook reference: https://code.claude.com/docs/en/hooks
- `b692a546c0` (#12148) — added the response-mode toggle and the worktree guards.
