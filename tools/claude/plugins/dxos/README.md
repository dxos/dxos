# `dxos` — project tracking and QA flows for coding agents

Durable, resumable project and task tracking. A committed **registry** of
work-streams, a **`TASKS.md` ledger** per project, and one command to drive them.

The problem it solves: an agent's own todo list is ephemeral. It dies with the
context window, so the next session starts blind — re-deriving what was done,
what is in flight, and what comes next. `dxos` keeps that state in the repo, where
both you and the agent can read it weeks later.

## Install

```bash
claude plugin marketplace add dxos/dxos
```

```bash
claude plugin install dxos@dxos
```

## Use

| Command                          | Does                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| `/dxos:project`                  | Status of the current project — worktree, branch, docs, uncommitted work |
| `/dxos:project list [all]`       | Numbered table of active projects; reply with a row number to resume     |
| `/dxos:project tasks [all]`      | Open `- [ ]` items from the current project's `TASKS.md`                 |
| `/dxos:project spawn <N...>` | Spin the numbered open tasks out into background task chips              |
| `/dxos:project new <name>`       | Register a project and scaffold its `TASKS.md` + `DESIGN.md`             |
| `/dxos:project end <name>`       | Move it to `ended`, recording final status                               |
| `/dxos:project track <text>`     | Record a follow-up in the active `TASKS.md`                              |
| `/dxos:project history [all]` | Table of the PRs this project produced — date, author, one-sentence summary  |
| `/dxos:project help`             | Table of every verb and what it does                                     |
| `/dxos:project hydrate`          | Checkpoint before stopping or opening a PR                               |
| `/dxos:project resume [name]`    | Reload project state at the start of a session                           |

In a repo with no registry yet, `/dxos:project new <name>` creates one. Read verbs
report that none exists rather than inventing entries.

## `/dxos:qa` — running QA flows

A second command, over the executable `flow` blocks declared in `.mdl` specs (the
`Deus.QA` dialect — a `## QA` section in a `PLUGIN.mdl`, or an `APP.mdl` for
journeys crossing plugins).

| Command                            | What it does                                                            |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `/dxos:qa`                         | Numbered table of every flow, with its `status:`                        |
| `/dxos:qa list [filter]`           | The same table, narrowed by document path, flow id, or title            |
| `/dxos:qa show <flow>`             | Print one flow verbatim — its `given`, steps and `cleanup`              |
| `/dxos:qa run <flow>`              | Execute it against a live app and report a per-step pass/fail table     |
| `/dxos:qa run <flow> --skip-cleanup` | Leave the artifacts in place so the final state can be inspected      |
| `/dxos:qa help`                    | Table of every verb                                                     |

Rows are addressable by number, as with `/dxos:project list`. Enumeration is
`scripts/list-flows.mjs`; execution is the repo's `running-qa-flows` skill, which
the command defers to rather than restating.

Unlike `/dxos:project`, there is no `UserPromptSubmit` hook: the store is the
`.mdl` files themselves, so there is no backend to swap and nothing for a
directive to resolve.

## How it works

A `UserPromptSubmit` hook reads the **raw typed text** and fires *before* the
command expands, so it injects a directive for the verb you actually gave. That
directive is authoritative — the command body only defers to it.

This matters because a slash command alone cannot do it: its expansion arrives
after the turn has begun and can only *ask* the agent to comply. Reading the raw
text one step earlier makes the behaviour deterministic.

The directive is anchored to the **first line**, where a slash command must
appear anyway. An earlier free-floating marker (`$project`) fired on prose that
merely mentioned it — including the message asking for it to be replaced.

## Configuration

| Variable              | Default                          | Purpose                                         |
| --------------------- | -------------------------------- | ----------------------------------------------- |
| `DX_PROJECT_REGISTRY` | `.agents/projects/registry.yml`  | Registry location, relative to the project root (`file` only) |
| `DX_PROJECT_BACKEND`  | `file`                           | Where projects are stored — `file` or `mcp`     |
| `DX_PROJECT_SPACE`    | resolved via `listSpaces`        | Space holding the projects (`mcp` only)         |

Every directive ends with a `BACKEND:` line naming the store and how to read or
write it. The verbs, the command file and the skill are all backend-agnostic —
that seam is what lets the store change without touching them.

### `file` (default)

A committed `registry.yml` plus a `TASKS.md` per project. Works in any repo with
no services running.

### `mcp` — DXOS Composer

Projects become live objects in a Composer space, reached through the MCP tools
`dx mcp serve` exposes. A registry entry is a `Project`, its ledger is
`Project.outline` (one markdown document), durable items are `Task` objects under
the project's TaskSet, and design docs are artifact documents — so the same work
is editable in Composer and from any machine, without a committed file.

Two rules the directive enforces:

- **No cascade.** If a needed tool is absent, the agent stops rather than writing
  to `registry.yml`. A write landing in a file the user believes is dead is the
  divergence this backend exists to prevent.
- **`new` uses `projectCreate`**, which scaffolds the project's instructions,
  artifacts collection and TaskSet in one call and returns the `taskSet`
  reference that `taskCreate` files work against.

## Layout

```
dxos/
├── commands/project.md            thin — defers to the injected directive
├── hooks/track.sh                 verb dispatch + backend resolver
├── hooks/hooks.json               UserPromptSubmit registration
└── skills/task-planning/SKILL.md  TASKS.md convention, registry schema, handoff
```

The skill loads on its own when work spans several steps or a session resumes —
i.e. when nobody has typed a command. That is why the conventions live there and
the per-verb mechanics live in the hook.
