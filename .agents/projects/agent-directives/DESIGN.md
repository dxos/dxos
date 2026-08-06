# Agent Directives — Design

## Problem

Directives about **how the agent responds** — be terse, number every question,
say which worktree you're in — are stated once in always-loaded markdown and
then reliably ignored as a session grows.

## Findings

### 1. The directives are diluted, not absent

Always-loaded instruction budget:

| File                                    | ~tokens |
| --------------------------------------- | ------: |
| `~/.claude/projects/…/memory/MEMORY.md` |   3,911 |
| `AGENTS.md`                             |   2,629 |
| `.claude/CLAUDE.md`                     |     410 |
| `~/.claude/CLAUDE.md`                   |     270 |

Response directives inside that: **6 lines, ~1.3%**, never repeated. Meanwhile
`composer-plugins/SKILL.md` is 42KB (~10.5k tokens, **4x `AGENTS.md`**) and
`composer-ui` 28KB. One skill invocation puts more text between `AGENTS.md` and
the answer than every instruction file combined — and it lands _later_, so it is
positionally stronger.

Direct evidence, this session: `~/.claude/CLAUDE.md:9` ("Be as terse as
possible") was active on every turn and ignored on every turn, while the
numbering rule survived. Mode was `natural`, so `mode.sh` emitted
nothing — the only length directive in play was that one diluted line.

### 2. Post-hoc review cannot fix verbosity

Checked against the hook reference:

- **`Stop`** receives `last_assistant_message`, so a hook _can_ measure the
  answer deterministically (words, lines, headings). But `decision:"block"`
  makes the model emit **another** message while the verbose one stays on
  screen — enforcing terseness this way _adds_ text.
- **`MessageDisplay`** is the only hook that can rewrite the displayed answer
  (`hookSpecificOutput.displayContent`), but it is **display-only**: the
  transcript keeps the original and that is what the model keeps reading. It
  also needs a judge, i.e. a model call per turn, and it makes what the user
  sees diverge from what the agent sees.

**Verbosity is a generation-time property.** The only lever is a directive that
arrives before generation, every turn.

### 3. Control points, by when they enter context

| Kind          | Mechanism                                               | Enters context                     | Decays?                                  |
| ------------- | ------------------------------------------------------- | ---------------------------------- | ---------------------------------------- |
| Static text   | `AGENTS.md` chain, `MEMORY.md`, MCP server instructions | once, session start, near the top  | **yes** — fixed position, never repeated |
| Deferred text | skills, `.claude/agents/`, `.claude/commands/`          | on demand, mid-conversation        | no — but _displaces_ static text         |
| Interception  | hooks (30 events)                                       | per event, at the event's position | no — re-fires every time                 |
| Gating        | `permissions` allow/deny/ask, permission modes          | pre-tool, non-textual              | n/a — mechanical                         |

Kinds 1–2 are **persuasion** (the agent may ignore them); kinds 3–4 are
**mechanism** (it cannot). The response directives live in the only kind that
decays.

Only three events inject text the agent reads as plain stdout: `SessionStart`,
`UserPromptSubmit`, `UserPromptExpansion` — plus `additionalContext` on most
others.

### 4. There is no harness state machine

Claude Code provides an **event bus over a context assembler**, not a state
machine. Hooks are stateless subprocesses: one JSON blob on stdin, some text
out, exit. Nothing carries between invocations, so any state machine is one you
build by writing a file that a later hook reads.

Two exist here, neither complete:

1. **`mode`** — a genuine machine: 2 states, persisted in
   `.claude/.mode`, transitions via sentinel. But `context` returns
   early in `normal`, so it **speaks in one state and is silent in the other**.
2. **`$project`** — quasi-machine over `registry.yml`. Real states, but
   transitions are _advisory_: the hook emits a directive and depends on the
   agent to perform the write.

Everything else (`branch-beacon.sh`, the guards) is **stateless derived** —
recomputed per event, stored nowhere. Correct for safety invariants, useless for
anything with memory.

## Decision

A durable directive needs all three of:

1. persisted state in a file,
2. re-injection every turn via `UserPromptSubmit`,
3. **a defined output in every state, including the default.**

`mode` has (1) and (2) and is missing (3). Closing that gap is the
whole fix, and it gives the state-independent invariants — numbered options,
worktree reporting — a place to live as unconditional rows of the same block.

Corollary: `AGENTS.md` should hold the canonical wording (for humans and other
harnesses) while the hook carries the enforcing copy per turn. Rules that govern
**every** response get delivered on **every** prompt.

### The slash command, and why it is safe

A command **body** cannot write state: it expands into a prompt that depends on
the agent to run the script, and the expansion lands _after_ the turn begins so
it cannot gate that turn's own output. That argued against `/mode` — until the
premise turned out to be wrong at one step earlier in the lifecycle.

`UserPromptSubmit` carries the **raw typed text**, and fires before the command
expands. So `hooks/mode.sh` greps `/mode <MODE>` there and performs exactly the
write the sentinel performed, at exactly the same point in the turn. The command
file is then pure ergonomics — autocomplete and a name — and its body only
reports. No `UserPromptExpansion` hook is needed; that event is for _blocking_ an
expansion, not for beating it.

Generalised: **a slash command that must change state should be implemented as a
`UserPromptSubmit` grep on its raw text, with a thin body.** The determinism
comes from the event, never from the command.

### Sentinel grammar

`/mode <MODE>` only, anchored to the start of the message, with the two values
`terse` and `normal` (the `concise` / `natural`/`default`/`off` aliases survive as
_values_). It got there in two steps, both driven by the same failure: a
grep-driven hook cannot distinguish a command from a mention of one.

1. The regex accepted bare one-token forms, so prose _about_ the modes flipped
   them — observed live on 2026-08-03 when a message containing
   "`$natural/$concise/$verbose`" set the mode. Fix: make the verb mandatory.
2. `$mode <MODE>` still matched anywhere in a message, so writing the sentinel in
   documentation prose would fire it. Fix: move to `/mode`, anchored to the start
   — where a slash command must appear anyway, and where prose cannot reach.

Generalised: **prefer an anchored command form over a free-floating sentinel.**

`$project` proved the point within the day. On 2026-08-04 the message asking to
convert it — which contained `"$project"` in prose — fired `$project list`. It
was converted the same way: `/project VERB [ARGS]` matched on the first line
only, with the legacy `$track` / `track:` / `$hydrate` / `$checkpoint` /
`$resume` / `$rehydrate` aliases removed, since each carried the identical flaw.

Both hooks now extract `head -1` of the prompt before matching. Anchoring with
`^` alone is not enough: `grep -E` applies `^` per line, so a quoted command on a
later line of a multi-line message would still fire.

## Open decisions

Carried in `TASKS.md` Phase 2: terse budget, whether `normal` is budgeted,
whether to edit the global `~/.claude/CLAUDE.md`, and the default when the state
file is absent.

## References

- Hook reference: https://code.claude.com/docs/en/hooks
- `b692a546c0` (#12148) — added the response-mode toggle and the worktree guards.
- `.claude/README.md` — the control-point map this design argues from.
