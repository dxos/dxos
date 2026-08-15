# `dx` — project tracking for coding agents

Durable, resumable project and task tracking. A committed **registry** of
work-streams, a **`TASKS.md` ledger** per project, and one command to drive them.

The problem it solves: an agent's own todo list is ephemeral. It dies with the
context window, so the next session starts blind — re-deriving what was done,
what is in flight, and what comes next. `dx` keeps that state in the repo, where
both you and the agent can read it weeks later.

## Install

```bash
claude plugin marketplace add dxos/dxos
```

```bash
claude plugin install dxos-project@dxos
```

## Use

| Command                                  | Does                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `/dxos-project:project`                  | Status of the current project — worktree, branch, docs, uncommitted work |
| `/dxos-project:project list [all]`       | Numbered table of active projects; reply with a row number to resume     |
| `/dxos-project:project tasks [all]`      | Open `- [ ]` items from the current project's `TASKS.md`                 |
| `/dxos-project:project new <name>`       | Register a project and scaffold its `TASKS.md` + `DESIGN.md`             |
| `/dxos-project:project end <name>`       | Move it to `ended`, recording final status                               |
| `/dxos-project:project track <text>`     | Record a follow-up in the active `TASKS.md`                              |
| `/dxos-project:project hydrate`          | Checkpoint before stopping or opening a PR                               |
| `/dxos-project:project resume [name]`    | Reload project state at the start of a session                           |

In a repo with no registry yet, `/dxos-project:project new <name>` creates one. Read verbs
report that none exists rather than inventing entries.

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
| `DX_PROJECT_REGISTRY` | `.agents/projects/registry.yml`  | Registry location, relative to the project root |
| `DX_PROJECT_BACKEND`  | `file`                           | Where projects are stored                       |

Every directive ends with a `BACKEND:` line naming the store and how to read or
write it. The verbs, the command file and the skill are all backend-agnostic —
which is the seam a future service-backed store plugs into.

## Layout

```
dx/
├── commands/project.md            thin — defers to the injected directive
├── hooks/track.sh                 verb dispatch + backend resolver
├── hooks/hooks.json               UserPromptSubmit registration
└── skills/task-planning/SKILL.md  TASKS.md convention, registry schema, handoff
```

The skill loads on its own when work spans several steps or a session resumes —
i.e. when nobody has typed a command. That is why the conventions live there and
the per-verb mechanics live in the hook.
