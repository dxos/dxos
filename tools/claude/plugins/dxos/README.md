# `dxos` plugin for Claude Code

The `dxos` plugin packages the DXOS Composer MCP server for Claude Code. Its main
workflow is durable project tracking through `/dxos:project`. It also includes
`/dxos:qa` for running QA flows.

The marketplace manifest is
[`.claude-plugin/marketplace.json`](../../../../.claude-plugin/marketplace.json).
It publishes this plugin from `tools/claude/plugins/dxos`.

## Install

Register the marketplace once, then install the plugin:

```bash
claude plugin marketplace add dxos/dxos
claude plugin install dxos@dxos
```

Start a new Claude Code session after installing.

## Update

Update the marketplace and plugin from a terminal:

```bash
claude plugin marketplace update dxos
claude plugin update dxos@dxos
```

Start a new Claude Code session after updating.

## Uninstall

Uninstall the plugin before removing its marketplace:

```bash
claude plugin uninstall dxos@dxos
claude plugin marketplace remove dxos
```

## Claude Code Desktop

Desktop shares its plugin configuration with the CLI, so the commands above
work for both. You can manage the plugin through the Desktop UI instead:

- To install, register the marketplace with the first install command, then
  click **+**, **Plugins**, **Add plugin**, and install **dxos**.
- To update or uninstall, click **+**, **Plugins**, **Manage plugins**, and select
  **DXOS Project Tracking**. Marketplace updates and removal still use the
  terminal commands above.
- After installing or updating, start a new Desktop session.

## Connect Composer

The plugin provides the Composer MCP server. Do not add its URL manually.

Create an account at [composer.space](https://composer.space), then open its
settings and create a passkey.

### CLI

Run `claude` from your project directory, enter `/mcp`, and select `composer`.
Enable it if needed, then choose **Authenticate** and complete the passkey
sign-in in your browser.

### Claude Code Desktop

1. Start a new Desktop session. Click **+**, **Plugins**, **Manage plugins**,
   **DXOS Project Tracking**, **Connectors**, then select `composer`.
2. Click **Connect** and complete the passkey sign-in in your browser.

## Use Composer for project tracking

Skip this whole section if you are staying on `file`.

### Steps

**1. Select the backend.** `DX_PROJECT_BACKEND` is read by the hook process, so
it has to be in that process's environment. A desktop session is not launched
from your shell and inherits nothing from `.zshrc`, so set it in `settings.json`,
which Claude Code passes to every session and its subprocesses:

```json
{ "env": { "DX_PROJECT_BACKEND": "mcp" } }
```

`.claude/settings.local.json` in the repo keeps it to you. `.claude/settings.json`
commits it for everyone working in the repo. `~/.claude/settings.json` turns it on
for every repo you open.

**2. Bind the space.** Run `/dxos:project setup`. It lists the spaces you own by
name, asks which one this repo's projects belong in, confirms the session can
write to it, and records the answer:

```yaml
# .agents/projects/space.yml — the ECHO space this repo's projects live in.
spaceId: <id>
```

Commit that file. It binds every future session in the repo, on any machine and
for anyone who clones it. Pass a name to skip the question when it is
unambiguous: `/dxos:project setup Acme Product`.

The procedure itself belongs to the `project` skill the server serves, so the
verb loads that skill and follows it rather than carrying its own copy.

## Troubleshooting

### Composer is turned off for the session

Claude saves the enabled state of an MCP server per project. Installing or
enabling the plugin does not clear an older disabled choice.

1. Open a terminal in the same project directory and run `claude`.
2. Enter `/mcp`, select `composer`, and choose **Enable**.
3. Start a new Desktop session and connect again.

## Use

| Command                          | Does                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| `/dxos:project`                  | Status of the current project — worktree, branch, docs, uncommitted work |
| `/dxos:project setup [space]`    | Bind this repo to the space its projects live in (`mcp` only)           |
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
| `DX_PROJECT_SPACE`    | unset                            | Guard against a stale binding (`mcp` only)      |

The space itself is bound per repo in the committed `.agents/projects/space.yml`,
written by `/dxos:project setup` (see
[Use Composer for project tracking](#use-composer-for-project-tracking)), because
a repo's projects belong to one space whoever opens it. `DX_PROJECT_SPACE` is a
guard on top of that: set it, and the agent stops if it disagrees with the
committed binding.

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
