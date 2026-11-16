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
- [ ] composer-dev against edge-dev — dxos#14555 re-points the dev channel; deploy and check.

## Phase 2: The loop, end to end

- [ ] Map how a task starts an EDGE run, and what of it is reachable over MCP.
- [ ] Attach dxos/dxos and dxos/edge to project "DXOS".
- [ ] Run the sample task "Rework space selection for mcp auth" to a draft PR.
- [ ] Run a dxos/edge task to a draft PR.

## Phase 3: Gaps

- [ ] `code.updateProjectRepositories` is not on the MCP server: plugin-code is not in
      operation-service's registry, so a project's repositories can be set only in the UI.
- [ ] Link the PR back to the task without relying on the agent calling MCP.
- [ ] Remote permissions, MCP and shell e2e tests are `todo` placeholders.
- [ ] sandbox-service runs `noAuth: true` (pending dxos#13056).

## PRs

- dxos/dxos#14555 — whoami on Composer's in-app MCP; dev channel → EDGE dev. Draft, green.
- dxos/edge#1535 — checkouts on container disk, per-turn snapshot. Ready, green.
