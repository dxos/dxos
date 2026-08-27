# `dxos` — project tracking and QA flows for coding agents

Durable, resumable project and task tracking. A committed **registry** of
work-streams, a **`TASKS.md` ledger** per project, and one command to drive them.

The problem it solves: an agent's own todo list is ephemeral. It dies with the
context window, so the next session starts blind — re-deriving what was done,
what is in flight, and what comes next. `dxos` keeps that state in the repo, where
both you and the agent can read it weeks later.

## Install

In a terminal:

```bash
claude plugin marketplace add dxos/dxos
```

```bash
claude plugin install dxos@dxos
```

In the Claude Code desktop app, run the same two as slash commands in any session:
`/plugin marketplace add dxos/dxos`, then `/plugin install dxos@dxos`.

That is the whole install for the default `file` backend. `/dxos:project` works
immediately, against a committed `registry.yml`.

The Claude **Desktop** app is a different product and does not run plugins at all:
no hooks, so no `/dxos:project`. You can still add the MCP server there by URL as
a connector, which gives you the tools without the command.

## Setup for the `mcp` backend

Three steps, in order. Skip all of them if you are staying on `file`.

**1. Authenticate the connector.** The plugin ships it, so there is nothing to
add. Run `/mcp`, pick `composer`, choose Authenticate, and approve with your
passkey. This needs a passkey registered in Composer at `composer.space` on an
identity that has an account, and Chrome 128+ or Safari 18+ (see
[the connector](#the-bundled-connector) for why Firefox cannot).

**2. Select the backend.** `DX_PROJECT_BACKEND` is read by the hook process, so
it has to be in that process's environment. A desktop session is not launched
from your shell and inherits nothing from `.zshrc`, so set it in `settings.json`,
which Claude Code passes to every session and its subprocesses:

```json
{ "env": { "DX_PROJECT_BACKEND": "mcp" } }
```

`.claude/settings.local.json` in the repo keeps it to you. `.claude/settings.json`
commits it for everyone. `~/.claude/settings.json` applies it to every repo you
open, which is wrong here, since the store is per-repo. Precedence is local, then
project, then user.

**3. Bind the space.** This one is **not** an environment variable: the space is a
property of the repo, so it lives in a committed file that binds every future
session in that repo.

```yaml
# .agents/projects/space.yml — the ECHO space this repo's projects live in.
spaceId: <id>
```

Two lines, so writing it by hand is fine. For the guided version, ask for the
project skill's setup flow once the connector is authenticated. It lists the
spaces you own by name, asks which one, cross-checks that the session can actually
write to it, and writes the file. Picking is always a question, so it will not
infer a space from a name resembling the repo, and one space existing is not
taken as consent. There is no `/dxos:project setup` verb yet, so this arrives
through the server's skill rather than through the command.

An unbound repo is a hard stop, not a fallback. Nothing writes to a session
default space, because a project system split across two spaces is worse than an
agent that refuses and asks you to fix the binding.

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
| `/dxos:qa show <plugin> <flowId>`  | Print one flow verbatim — its `given`, steps and `cleanup`              |
| `/dxos:qa run <plugin> <flowId>`   | Execute it against a live app and report a per-step pass/fail table     |
| `/dxos:qa run <plugin> <flowId> --skip-cleanup` | Leave the artifacts in place for inspection                |
| `/dxos:qa help`                    | Table of every verb                                                     |

Rows are addressable by number, as with `/dxos:project list`. Enumeration is
`scripts/list-flows.mjs`; execution is the repo's `running-qa-flows` skill, which
the command defers to rather than restating.

Unlike `/dxos:project`, there is no `UserPromptSubmit` hook: the store is the
`.mdl` files themselves, so there is no backend to swap and nothing for a
directive to resolve.

## Developing this plugin

Load it straight from the working tree — no install, no cache, no marketplace, no session restart:

```bash
claude --plugin-dir tools/claude/plugins/dxos
```

Edits take effect in the next session started with that flag, which is what makes the loop
repeatable. The installed copy (`dxos@dxos`) is a snapshot of GitHub `main`, so a command added on a
branch is invisible to it until the branch lands.

Assert it non-interactively — this is the regression check, cheap enough to run on every edit:

```bash
claude --plugin-dir tools/claude/plugins/dxos --model haiku \
  -p "List the slash commands available to you whose name starts with dxos."
```

For scored behavioural cases (does `/dxos:qa list` render the table?) rather than mere presence, see
`evals/` and `claude plugin eval dxos`.

Two paths that look right and are not:

- **`~/.claude/skills/<name>/`** auto-loads a plugin and `/reload-plugins` reloads it live, but the
  loader keys on the directory name while `plugin.json` declares `dxos`, so a symlink resolves under
  neither name.
- **A local-scope marketplace** works, but costs config surgery plus a restart per change.

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
| `DX_PROJECT_SPACE`    | unset                            | Cross-check only, NOT how you pick a space (`mcp` only) |

The space is **not** configured by environment variable. It is bound per repo in
the committed `.agents/projects/space.yml` (see [Setup](#setup-for-the-mcp-backend)),
because a repo's projects belong to one space regardless of who opens it or on
which machine. `DX_PROJECT_SPACE` survives only as a guard: set it, and if it
disagrees with the committed binding the agent stops and says so rather than
writing to either.

Every directive ends with a `BACKEND:` line naming the store and how to read or
write it. The verbs, the command file and the skill are all backend-agnostic —
that seam is what lets the store change without touching them.

### `file` (default)

A committed `registry.yml` plus a `TASKS.md` per project. Works in any repo with
no services running.

### `mcp` — DXOS Composer

Projects become live objects in a Composer space, reached through MCP tools. A
registry entry is a `Project`, its ledger is `Project.outline` (one markdown
document), durable items are `Task` objects under the project's TaskSet, and
design docs are artifact documents — so the same work is editable in Composer and
from any machine, without a committed file.

#### The bundled connector

The plugin ships the deployed server, so there is nothing to add:

```json
"mcpServers": { "composer": { "type": "http", "url": "https://composer.dxos.network/mcp" } }
```

Authenticating is step 1 of [Setup](#setup-for-the-mcp-backend). Nothing is typed
during it, because the identity is derived from the passkey signature rather than
from anything you paste. The ceremony is served from `auth.dxos.network` while the
passkey's relying party is `composer.space`, so it leans on Related Origin
Requests, which Firefox has not shipped.

`dx mcp serve` remains the local alternative, and the directive handles both host
shapes. The deployed host projects each verb as its own tool and adds the generic
object tools; the local one exposes `queryOperations` / `invokeOperation` /
`loadSkill` instead. Point the plugin at a local worker by overriding the `url`
in your own settings.

Tools from a bundled server are namespaced by plugin, so they read
`mcp__plugin_dxos_composer__whoami`, not `mcp__composer__whoami`.

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
