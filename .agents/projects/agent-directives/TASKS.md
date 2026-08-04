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
- [x] **Fold in the state-independent invariants** — number every question and
      option set; lead with the answer.
- [x] **Reverted: the worktree line is first-reply only** (user, 2026-08-04).
      Phase 2 originally promoted it to every reply, reasoning that a first-reply
      rule decays. Wrong lever: it made every reply open with a restatement, and
      it duplicated a rule `~/.claude/hooks/session-context.sh` already delivers
      on `SessionStart` ("First reply must state: this branch, this toplevel
      path, and the guidance files in play"). Removed from the per-turn block; no
      turn-counter needed. **Rule learned:** per-turn injection is for rules that
      govern every reply — a once-per-session rule belongs on `SessionStart`.
- [x] **Refresh `AGENTS.md`** — replaced the first-reply clause with a
      "Responding to the user" section, canonical, noting the per-turn
      re-injection.
- [x] **Consolidate the scattered sources** — `.claude/CLAUDE.md` now points at
      the canonical section instead of restating it.
- [ ] **Update `~/.claude/CLAUDE.md`** (decision: yes) — the ONLY open item, and
      optional. Nothing there is stale (verified 2026-08-04: no `$mode` /
      `$project` / legacy-sentinel references), so this is purely about adding
      the response invariants for repos that have no `UserPromptSubmit` hook of
      their own — inside this repo the hook already delivers them. BLOCKED from
      the agent side: it symlinks to
      `~/Code/richburdon/config/dotfiles/.claude/CLAUDE.md`, a separate repo
      whose HEAD is `main`, so `guard-worktree.sh` refuses the edit. Needs the
      user to apply it, or to branch that repo.
- [x] **Drop the bare one-token sentinel forms** — the `$mode` verb is now
      mandatory in `hooks/mode.sh`, so prose _about_ the modes no longer flips
      them (observed live on 2026-08-03: a message containing
      "`$natural/$concise/$verbose`" as an example set the mode). The alias words
      survive as _values_. Verified against six prompts: the three bare forms are
      inert, `$mode terse` / `$mode normal` / `$MODE Concise` all still fire.
- [x] **Convert the sentinel to `/mode`** — done without the planned
      `UserPromptExpansion` hook. The plan's premise was wrong: `UserPromptSubmit`
      carries the **raw typed text** and fires _before_ the command expands, so
      `hooks/mode.sh` greps `/mode <MODE>` there and writes state at exactly the
      point the sentinel did. `commands/mode.md` is pure ergonomics (autocomplete
      + a one-line report) and sets nothing. `UserPromptExpansion` is for blocking
      an expansion, not for beating it. **`$mode` has since been removed**, so
      `/mode` anchored to the start of the message is the only form — which also
      retires the "prose flips the mode" class of bug rather than narrowing it.
      Verified: `/mode terse` and `/MODE Concise` fire; `$mode terse`, a bare
      `/mode`, a mid-message `/mode terse` and a `src/mode normal` path are inert.
      Proven live in-session — `/mode terse` took effect on the following turn.
- [x] **Bare `/mode` re-orients** — matches no mode word, so the hook is inert and
      the command body does the work: worktree + branch, the instruction files
      actually consulted (skills included), and the current mode. This is the
      answer to the reversal above — the worktree line stays a first-reply rule,
      and `/mode` is how the user asks for it again, on demand rather than on
      every turn.
- [x] **No numbered options in the `/mode` report** — the first version offered
      the modes as a numbered list, the user answered `1`, and a numeric reply is
      the one form the `UserPromptSubmit` hook cannot catch, so the agent had to
      write the state itself. Options are now inline commands. **Rule:** never
      offer a numbered choice whose selection needs to travel through a hook.

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
- [x] **Document the `mode.sh` split** — kept, not collapsed: the `/mode` command
      gave the backend a second caller (`commands/mode.md` runs `get`), so the
      split is now earned rather than speculative. The header of
      `scripts/mode.sh` names both callers and the hand-runnable path.
- [x] **Fix the stale claim that desktop has no slash commands** —
      `task-planning/SKILL.md` corrected; it now points at the `/mode` recipe and
      notes `$project` could gain a `/project` twin the same way.
- [x] **Surface guard-hook output to the user** — `branch-beacon.sh` now emits
      JSON with **both** `systemMessage` (user) and `additionalContext` (agent)
      instead of plain stdout, which was agent-only. Built with `jq -n` so message
      quoting cannot produce an invalid payload — a malformed hook result is
      dropped silently, which would disable the guard with no signal at all.
      Falls back to plain stdout if `jq` is missing. Verified: valid JSON with
      both fields in this worktree; silent outside the DXOS tree.
      **NOTE: this file is `~/.claude/hooks/branch-beacon.sh`, outside the repo —
      it is not carried by the PR and does not travel to another machine.**

## Phase 4: `/project` (2026-08-04)

The `$project` sentinel demonstrated its own bug: the message asking to convert
it contained `"$project"` in prose and fired `$project list`. Same fix as
`/mode`, same day.

### Tasks

- [x] **Convert `$project` to `/project`** — `hooks/track.sh` matches
      `/project VERB [ARGS]` on the first line only; `commands/project.md`
      registers the name and defers to the injected directive (which is
      authoritative, being generated from the verb actually given). All six verbs
      and their argument extraction verified.
- [x] **Remove the legacy `$track` / `track:` / `$hydrate` / `$checkpoint` /
      `$resume` / `$rehydrate` forms** — each matched anywhere in a message and
      carried the identical flaw. Nothing replaces them; `/project <verb>` covers
      every case.
- [x] **Anchor on the first line, not just `^`** — `grep -E` applies `^` per
      line, so a quoted command on line 3 of a multi-line message would still
      fire. Both hooks now take `head -1` of the prompt first. `mode.sh` was
      retro-fitted with the same guard and re-verified.
- [x] **Check `~/.claude/CLAUDE.md` for stale markers** — none. Verified
      2026-08-04: it never referenced `$mode`, `$project` or the legacy
      sentinels, so the conversions leave nothing to correct there. Folded into
      the Phase 2 item, which is now the only open work.

### References

- `DESIGN.md` — findings, the control-point taxonomy, and the state-machine argument.
- Hook reference: https://code.claude.com/docs/en/hooks
- `b692a546c0` (#12148) — added the response-mode toggle and the worktree guards.
