# `.claude/` — agent control points

How this repo steers a coding agent: what the harness offers, when each thing
fires, and which of them we actually use.

Behavioural instructions live in [`AGENTS.md`](../AGENTS.md) (harness-agnostic)
and [`CLAUDE.md`](./CLAUDE.md) (Claude-specific). **This file is the map, not the
rules** — it explains the machinery those rules ride on.

---

## A. Control points (generic)

Four kinds, distinguished by **when they enter the context window** — which is
what determines whether they survive a long session.

| Kind                 | Mechanism                                                                      | Enters context                       | Decays?                                      |
| -------------------- | ------------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------- |
| **1. Static text**   | `AGENTS.md` / `CLAUDE.md` chain, `MEMORY.md`, MCP server instructions          | once, at session start, near the top | **yes** — fixed position, never repeated     |
| **2. Deferred text** | skills, subagents (`.claude/agents/`), slash commands (`.claude/commands/`)    | on demand, mid-conversation          | no — but it _displaces_ kind 1               |
| **3. Interception**  | hooks (30 events)                                                              | per event, at that event's position  | no — re-fires every time                     |
| **4. Gating**        | `permissions` allow/deny/ask, permission modes                                 | pre-tool, non-textual                | n/a — mechanical, not persuasive             |

Kinds 1–2 are **persuasion**: the agent can ignore them, and grows more likely to
ignore them as the session fills. Kinds 3–4 are **mechanism**: the agent cannot
ignore them at all.

> **The load-bearing consequence.** A rule that must hold on _every_ response
> cannot live only in kind 1. One large skill (`composer-plugins/SKILL.md`,
> ~42KB) is four times the size of `AGENTS.md` and lands later in the context,
> so it outranks it positionally. Durable rules get re-injected per turn via a
> `UserPromptSubmit` hook.

## B. Lifecycle

```text
SESSION   SessionStart → Setup → InstructionsLoaded
             │
TURN    ┌──► UserPromptSubmit ──► UserPromptExpansion   (if a command/skill expands)
        │        │
        │        ▼  [model generates]
        │    PreToolUse → PermissionRequest → PermissionDenied
        │        │            (or allow)
        │        ▼
        │    PostToolUse / PostToolUseFailure / PostToolBatch ──┐
        │        │                                              │
        │        └──── loop while tools are called ◄────────────┘
        │        ▼
        │    Stop ──(decision:block)──┐   StopFailure  (API error; output ignored)
        │        │                    │
        │        │  MessageDisplay ◄──┘
        └────────┘

SUBAGENT  SubagentStart → … → SubagentStop        TaskCreated → TaskCompleted
AMBIENT   FileChanged · CwdChanged · ConfigChange · DirectoryAdded
          WorktreeCreate/Remove · Notification · TeammateIdle · Elicitation(Result)
COMPACT   PreCompact → PostCompact
```

Only `SessionStart`, `UserPromptSubmit` and `UserPromptExpansion` treat plain
stdout as context the agent reads. Every other event needs
`hookSpecificOutput.additionalContext`.

## C. Control points (ours)

| Control point                                                                                                     | Event                     | Output goes to | State                                     |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------- | ----------------------------------------- |
| `~/.claude/hooks/session-context.sh`                                                                              | `SessionStart`            | agent          | derived (branch / cwd / verdict)          |
| `~/.claude/hooks/branch-beacon.sh`                                                                                | `UserPromptSubmit`        | agent          | derived, recomputed each turn             |
| `~/.claude/hooks/guard-branch.sh`, `deny-git-worktree-add.sh`                                                     | `PreToolUse(Bash)`        | deny           | derived                                   |
| `~/.claude/hooks/guard-worktree.sh` + [repo copy](./hooks/guard-worktree.sh)                                      | `PreToolUse(Edit\|Write)` | deny           | derived                                   |
| [`hooks/mode.sh`](./hooks/mode.sh) → [`scripts/mode.sh`](./scripts/mode.sh)   | `UserPromptSubmit`        | agent          | **persisted** `.claude/.mode`    |
| [`hooks/track.sh`](./hooks/track.sh)                                                                              | `UserPromptSubmit`        | agent          | persisted `.agents/projects/registry.yml` |
| [`AGENTS.md`](../AGENTS.md) (+ `CLAUDE.md` / `GEMINI.md` symlinks), [`CLAUDE.md`](./CLAUDE.md)                    | —                         | agent          | static                                    |
| `skills/` → `../.agents/skills/` (26)                                                                             | —                         | agent          | on demand                                 |
| [`agents/`](./agents) (2), [`commands/`](./commands) (1)                                                          | —                         | agent          | on demand                                 |

The guards exist as **both** a global `~/.claude/` copy and a repo copy. That is
deliberate, not duplication-by-accident: the harness sometimes instantiates the
assigned worktree as an empty stub where no repo `.claude/` exists, and only a
`~/.claude/` hook is guaranteed to run there.

`settings.json` is committed (shared policy); `settings.local.json` is personal
and untracked-by-convention (extra permissions, disabled MCP servers).

---

## NOTES

### Hooks

A hook is a **shell command the harness runs at a named event**. It receives one
JSON object on stdin and communicates back through its stdout and exit code.
Hooks are **stateless subprocesses** — nothing carries from one invocation to the
next, so any state must be written to a file that a later invocation reads.

**What binds a script to an event is the JSON key in `settings.json` — nothing
else.** Not the filename, not the directory:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "bash .../mode.sh" }] }
    ],
    "PreToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "bash .../guard-worktree.sh" }] }
    ]
  }
}
```

`hooks/mode.sh` is named for its _purpose_; it fires on
`UserPromptSubmit` purely because it sits under that key. The same script bound
under two keys would fire on both events — it can tell them apart via the
`hook_event_name` field in its stdin JSON. `matcher` narrows tool-scoped events
(`PreToolUse`, `PostToolUse`) or agent types (`SubagentStop`); events without a
matcher fire every time.

**Who sees the output** — the field decides, and this trips people up:

| Output                                 | Read by                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| plain stdout                           | the **agent** — but only on `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart`. Elsewhere it goes to the debug log and nobody reads it. |
| `hookSpecificOutput.additionalContext` | the **agent**. Injected as a system-reminder; never rendered as a chat message.             |
| `systemMessage`                        | the **user**, printed in the terminal. The model does not see it.                           |

One invocation can emit both — `additionalContext` to steer the agent,
`systemMessage` to tell the user it happened. `branch-beacon.sh` currently emits
only the former, which is why its warnings are invisible to the user.

**Blocking**: exit code 2, or `{"decision":"block","reason":"…"}`. On
`PreToolUse` this denies the tool call; on `Stop` it prevents the turn from
ending and feeds `reason` back to the model. `{"continue": false}` ends the
session outright.

**There is no state machine.** The harness gives an event bus over a context
assembler. `mode` is a hand-rolled machine (two states, one state file,
sentinel transitions); the guards are stateless and derive branch/cwd afresh on
every event.

### Sentinels

A sentinel is a **marker typed inside a normal message** that a
`UserPromptSubmit` hook greps for, acts on, and translates into a directive.

| Sentinel                          | Hook                                 | Effect                                                     |
| --------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| `$mode terse` / `$mode normal`    | [`hooks/mode.sh`](./hooks/mode.sh)   | sets response verbosity mode (see aliases below)            |
| `$project VERB [ARGS]`            | [`hooks/track.sh`](./hooks/track.sh) | task-planning: list / new / end / track / hydrate / resume  |

They exist because a hook can act on them **before the model runs**, which makes
the state change deterministic rather than dependent on the agent complying.

The two mode values are `terse` and `normal` (the default when the state file is
absent). `concise` aliases `terse`; `natural`, `default` and `off` alias
`normal`. The state file is canonicalised on read, so a stale or hand-edited
value cannot wedge the machine — anything that is not `terse` means `normal`.

**`mode.sh context` emits in BOTH states.** This is the point of the mechanism,
not an implementation detail: the invariants it carries — open with the worktree
and the files you read, number every question, lead with the answer — are
state-independent, and only the length clause varies (`terse` caps a reply at 8
lines; `normal` sets no budget). A mode that stays silent in its default state
delivers nothing on the turns that make up most of a session, which is exactly
how the earlier version failed. The rules themselves are canonical in
[`AGENTS.md`](../AGENTS.md) → "Responding to the user".

> **Caveat — keep the grammar unambiguous.** The hook greps raw message text and
> cannot tell a command from a mention of one. The bare one-token forms are still
> accepted, so a message containing `` `$terse/$normal` `` as an _example_ will
> set the mode — this happened on 2026-08-03. Prefer the two-token `$mode terse`,
> which prose is far less likely to hit; dropping the bare forms is tracked in
> `.agents/projects/agent-directives/TASKS.md`.

### Commands

A slash command is a markdown file under `.claude/commands/` (e.g.
[`commit.md`](./commands/commit.md) → `/commit`) whose body **expands into a
prompt**.

Commands and sentinels are not interchangeable:

- A command **cannot change state**. It expands into text that _asks_ the agent
  to do something, and relies on the agent to comply.
- The expansion lands **after** the turn has begun, so it cannot gate that
  turn's own output.

So a command is the right shape for "run this procedure" and the wrong shape for
"switch this mode". To get both ergonomics and determinism, front a command with
a `UserPromptExpansion` hook (matched on the command name) that performs the
state write.

### Skills

Skills are directories under `.agents/skills/` (surfaced to the harness via the
`.claude/skills` symlink), each with a `SKILL.md` whose frontmatter
`description` decides when it gets loaded. They are **deferred text**: cheap
until invoked, then large. Treat their size as a cost — see the note in §A.

### References

- Hook event + JSON reference: https://code.claude.com/docs/en/hooks
- Task-planning workflow: `.agents/skills/task-planning/SKILL.md`
- Design rationale for the per-turn injection model:
  `.agents/projects/agent-directives/DESIGN.md`
