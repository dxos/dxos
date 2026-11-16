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
  `EdgeAgent.checkoutsOf` reads it (then repos bound to the chat) once, at spawn.
- Entry: "Assign to → Claude Code (EDGE)" invokes `projects.delegateTaskToChat`, which creates the
  chat, sets the harness, marks the tasks `started` with the chat as delegate, and runs the
  delegation brief (`task-brief.ts`) as the first turn.
- The client drives the run: `EdgeAgent` spawns the `coding-agent` process, lends credentials,
  submits each prompt and polls `readEvents` every second into the chat feed. EDGE keeps a turn
  running with no client; the next client to open the chat replays what it missed.
- Nothing links the PR to the task except the agent following the brief and the GitHub skill.

## Decisions

- composer-dev → edge-dev by re-pointing the dev channel (dxos#14555), not a separate worker.
- Checkouts on the container disk with a per-turn git-bundle snapshot (edge#1535): the R2-synced
  `/workspace` could not hold a pnpm install.

## Decision log

- 2026-11-16: `/autonomous` state was not written by the hook, so the decision log lives here
  instead of `.claude/.autonomous-log.md`; the user asked for TASKS.md as the record.
- 2026-11-16: project files on `claude/composer-coding-lz1sx2` (this session's branch); the earlier
  work stays on `dm/cool-shannon-1rf4dy` (dxos#14555, edge#1535) rather than being moved.
- 2026-11-16: brief asks for a draft PR per changed repository, never a push to the default branch
  and never a merge — the loop's output is a PR; the old "do not push unless asked" made it
  unreachable for an unattended run.
- 2026-11-16: `UpdateProjectRepositories` moved to plugin-projects (key renamed to
  `org.dxos.operation.projects.updateRepositories`) rather than adding plugin-code to edge's
  operation-service — plugin-projects is already registered there and its skill is MCP-enabled, and
  plugin-code already depends on plugin-projects. Old key appears only in past execution traces.
- 2026-11-16: merged dm/cool-shannon-1rf4dy (dxos#14555) into this branch so one ref carries the
  dev-channel re-point and the brief change; composer-dev is deployed from it with `app: composer`
  only, so the dev docs and other apps are left as they are. The first attempt (run 813) was
  cancelled by another person's dev deploy — the `deploy-dev` concurrency group supersedes.
- 2026-11-16: operation-service on edge-dev is deployed from edge main with the whole dxos
  workspace linked from this branch (`pnpm link-packages`, version 0d726cfc), because edge pins dxos
  at Nov 13 and linking only plugin-projects would mix two dxos versions. The overrides were undone
  after the deploy; a later edge deploy from main reverts dev to the pinned catalog until the
  catalog is bumped past this PR.
- 2026-11-16: edge needs its own pinned moon (2.4.5); the proto shim on PATH picked dxos's 2.5.2,
  whose task config edge rejects (`unknown variant tracing`).
- 2026-11-16: dev serves plugin-projects from the plugin registry, not operation-service
  (compute-service `OPERATION_ROUTING=plugins`; only assistant and agent are held back). CI
  publishes bundles to preview only, so this branch's bundle was published to dev by hand
  (`DX_PLUGIN_BUILD=dev.<sha>`, admin key from `op://eng-dev/network.dxos.hub/API_KEY`). The
  operation-service deploy above is therefore not what serves it; it is harmless.
