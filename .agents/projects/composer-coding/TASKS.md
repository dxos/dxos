# composer-coding — Tasks

_Resume: dxos#14555 and edge#1535 are open and green; edge-dev runs both. The space "Coding"
(edge-dev, `BPLZYS3F4VDEFDIIRTN56NQFU2HT7MTT7`) holds the Claude Code and GitHub connections and
one sample task. Next: find how a task starts an EDGE run, then run the sample task to a PR._

Make Composer's coding loop — task → Claude Code session → pull request — good enough to replace
Claude Code desktop for daily work on dxos/dxos and dxos/edge. Decisions and the decision log are
in [DESIGN.md](DESIGN.md); this file is the ledger.

## Rules (from the user)

- Coding runs bill the Claude subscription: the `claude setup-token` value
  (`CLAUDE_CODE_OAUTH_TOKEN`), never an API key.
- Deploying to edge-dev is allowed, and so is deploying composer-dev against edge-dev.
- Work autonomously; do not block on the user; check PR reviews and CI regularly.

## Definition of done (this run)

1. A task in the edge-dev space, run by Claude Code (EDGE), ends with a draft PR on dxos/dxos
   that is attached to the task.
2. The same holds for dxos/edge.
3. Every gap found on the way is fixed in a PR (or recorded below as a task, with the reason it is
   not fixed yet).
4. Each PR from this project is green on CI, formatted, and listed in the registry entry.

## Phase 1: Environment

- [x] Redeploy edge, compute-service, sandbox-service, mcp-space-service and operation-service to
      edge-dev from edge main plus edge#1535.
- [x] dev MCP connected with the user's edge-dev identity.
- [x] Claude Code and GitHub connections in the Coding space.
- [x] composer-dev against edge-dev — deployed from this branch (run 815, `app: composer`); the live
      bundle targets dev.dxos.network and carries the draft-PR brief.

## Phase 2: The loop, end to end

- [x] Map how a task starts an EDGE run, and what of it is reachable over MCP. Findings in
      DESIGN.md "How the remote loop works": the client drives every turn; nothing of it is on MCP.
- [x] Attach dxos/dxos and dxos/edge to project "DXOS" — done over the dev MCP with the new
      `projects-update-repositories` (dxos first).
- [ ] Run the sample task "Rework space selection for mcp auth" to a draft PR.
- [ ] Run a dxos/edge task to a draft PR.

## Phase 3: Gaps

- [ ] Delegation brief told the agent not to push: a delegated task could never end in a PR. Now it
      asks for a draft PR per repository, attached to the task, task → `review` (this branch).
- [ ] `code.updateProjectRepositories` was not on the MCP server. Moved into plugin-projects as
      `projects.updateRepositories` and listed in the project skill (this branch). On edge-dev
      plugin-projects runs from its registry bundle (`OPERATION_ROUTING=plugins`), so it is live
      there as `0.16.0+dev.df2764f3a0`, published with `publish-edge-release`.
- [ ] Dev MCP calls are slow cold: the first call on a path takes 21-28 s, a repeat 1-2 s (reads and
      writes alike; measured with runScript). Fits plugin-bundle loading per fresh isolate in
      `OPERATION_ROUTING=plugins`. Two writes hit the client's 60 s limit yet landed. Signoz has no
      dev spans over 5 s, so it is not traced there. Matters for the loop: the coding agent marks
      tasks over the same MCP.
- [ ] Starting an EDGE run needs a Composer client (`DelegateTaskToChat` uses Capability and
      AgentService; spawn and every turn are client calls). An MCP-started or server-driven run is
      the next structural gap.
- [ ] Link the PR back to the task without relying on the agent calling MCP.
- [ ] Remote permissions, MCP and shell e2e tests are `todo` placeholders.
- [ ] sandbox-service runs `noAuth: true` (pending dxos#13056).

## Blocked

- [ ] dxos#14557 CI is red on a bad moon remote-cache entry (`mcp-server:build` 04bd11f8 restores no
      files), not on the diff. Needs eviction: an operator, or a CI `moon run mcp-server:build --force`.
      Root cause (a cancelled shard uploading an empty entry) is suggested as a separate task.

## PRs

- dxos/dxos#14557 — this project: draft-PR brief, repositories over MCP, specs. Draft; CI red on
  the cache entry above.
- dxos/dxos#14555 — whoami on Composer's in-app MCP; dev channel → EDGE dev. Draft, green.
- dxos/edge#1535 — checkouts on container disk, per-turn snapshot. Ready, green.
