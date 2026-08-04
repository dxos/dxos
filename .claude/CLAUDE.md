# Claude Specific Instructions

## IMPORTANT

- When performing complex tasks maintain a plan.
- NEVER use the `send_later` tool.

## Mode

- The response-verbosity mode is set with **`/mode terse`** or **`/mode normal`**.
  `concise` aliases `terse`; `natural`/`default`/`off` alias `normal`. The legacy
  `$mode <MODE>` sentinel still works anywhere in a message; the verb is required
  in both forms, so prose about the modes cannot flip them.
- **Bare `/mode` changes nothing and re-orients**: reply with the worktree and
  branch, the instruction files actually consulted (including skills loaded this
  session), the current mode, and the two modes as numbered options. This is how
  the user asks for the worktree line again — it is a first-reply rule and is
  deliberately not re-injected every turn.
- A `UserPromptSubmit` hook (`.claude/hooks/mode.sh`) does the work: that event
  carries the **raw typed text**, so it catches `/mode …` before the command
  expands and writes the state deterministically — the expansion itself could
  only ask the agent to comply. The same hook injects the `RESPONSE RULES` block
  into **every** prompt. State lives in the untracked `.claude/.mode`; `normal`
  is the default when absent.
- The block is emitted in both modes — the invariants (numbered options, lead
  with the answer) are state-independent and only the length clause varies.
  Follow it whenever it is present. The worktree + files-read line is NOT in it:
  that is a first-reply rule, carried by the `SessionStart` hook.
- The rules themselves are canonical in `AGENTS.md` → "Responding to the user";
  the machinery is documented in `.claude/README.md`.

## Task planning

- One sentinel: `$project VERB [ARGS]` anywhere in a message; a
  `UserPromptSubmit` hook (`.claude/hooks/track.sh`) detects it and injects the
  matching directive.
  - `$project` / `$project list [all]` — numbered table of the registry
    (`.agents/projects/registry.yml`); reply with a row number to resume.
  - `$project new <name> [summary]` / `$project end <name>` — manage entries;
    each project has a `TASKS.md` + `DESIGN.md`.
  - `$project track <text>` — record a follow-up in the active `TASKS.md`
    (never a background task chip).
  - `$project hydrate` (alias `checkpoint`) — checkpoint before stopping or
    opening a PR.
  - `$project resume [name]` — reload state at session start, always in the
    session's assigned worktree.
- Legacy `$track`/`$hydrate`/`$checkpoint`/`$resume`/`$rehydrate` forms map to
  the same directives.
- See the `task-planning` skill for the file format, workflow, registry, and
  handoff steps.
