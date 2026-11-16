# composer-coding — Design

## Goal

Composer replaces Claude Code desktop for coding on dxos/dxos and dxos/edge. A task is delegated to
a Claude Code session (locally through Tauri, or remotely in an EDGE sandbox), the session works in
the task's repositories, and the result is a pull request attached to the task.

## How the remote loop works

- plugin-projects: choosing "Claude Code (EDGE)" for a task creates a Chat with the EDGE harness and
  makes it the task's delegate.
- plugin-claude `EdgeAgent` starts the coding-agent process in edge compute-service, which runs
  Claude Code in a sandbox-service container (claude-code, claude-agent-acp, gh).
- Credentials lent per turn: the plugin-claude connector's setup-token as `CLAUDE_CODE_OAUTH_TOKEN`,
  the space's github.com token as `GITHUB_TOKEN`/`GH_TOKEN`.
- The project's `Repo.RepositoriesAnnotation` lists the repositories; the agent starts in the first.

## Decisions

- composer-dev → edge-dev by re-pointing the dev channel (dxos#14555), not a separate worker.
- Checkouts on the container disk with a per-turn git-bundle snapshot (edge#1535): the R2-synced
  `/workspace` could not hold a pnpm install.

## Decision log

- 2026-11-16: `/autonomous` state was not written by the hook, so the decision log lives here
  instead of `.claude/.autonomous-log.md`; the user asked for TASKS.md as the record.
- 2026-11-16: project files on `claude/composer-coding-lz1sx2` (this session's branch); the earlier
  work stays on `dm/cool-shannon-1rf4dy` (dxos#14555, edge#1535) rather than being moved.
