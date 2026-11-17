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

## Phase 2b: Runs on dev (server-started)

- [x] Run 1–3 (sample task): exposed and fixed the remote-CreateChat copy, missing bundle types, the
      unflushed turn key, MCP-timeout-length calls, and interruptions cancelling the agent.
- [x] Run 3 (sample task): the agent worked end to end and stopped on dxos/edge access (403).
- [x] Run 4 (test task): the agent finished the work (9 tests passing) and stopped on push/PR access.
- [x] Run 6 (after the App was installed on dxos): draft PR dxos/dxos#14563 opened by a server-started run,
      imported, attached to its task, task moved to `review`. The space's existing `ghu_` user token was
      enough once the installation existed (a user token's access is the user's AND the installation's).
- [x] Run 5 correctly refused a task whose code exists only on an unmerged branch (no PR, task blocked).
- [x] Run 7 (DoD 2): the user's sample task "Rework space selection for mcp auth" → draft PR dxos/edge#1540
      (names, hides deleted spaces, "authorize future spaces"), attached, task in `review`.
- [ ] edge#1540 adds `DataService.getDeletedSpaceIds` to db-service: db-service must deploy before
      hub-service, or the list still shows deleted spaces (agent's note).
- [ ] A CLI session from `delegateToCli` keeps a snapshot of the spaces and does not follow new ones, even
      when the grant says "all future spaces" (agent's note on edge#1540).

## Phase 4: Control surfaces

- [x] `dx` built from source (overlaying dxos#14313's CLI files, not committed), logged in through the dev
      MCP's `delegateToCli`, `dx mcp call whoami` works.
- [x] Comparison of MCP operations, `runScript` and `dx` on one measured workload:
      [DXOS agent control surfaces](https://claude.ai/artifact/WEsqt8gxWCMgXuavJJnk4C). Verdict: `runScript`
      for multi-step jobs, `dx` for large or persistent output, direct operations for discovery.
- [ ] Rework `dx mcp delegate` into a login (user direction); queued as a suggested task, PR #14313 is
      another session's.
- [x] Stacked: dxos#14557 on dxos#14555 (updated from main), edge#1537 on edge#1535. `gh stack` exists
      as an extension but this session may use `gh` only for search.

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
- [x] Starting an EDGE run needs a Composer client. Now: `claude.startCloudRun` / `claude.syncCloudRun`
      (Cloud Coding skill, `/cloudCoding`, served over MCP) start and follow a run from an operation on
      EDGE — compute-service serves `CodingAgentControl` to plugin bundles (edge branch
      claude/composer-coding-lz1sx2), `EdgeAgent.runTurnUntil` folds in bounded steps, delegation's
      host-neutral half is `@dxos/plugin-projects/Delegation`, and plugin-claude ships as an EDGE plugin.
- [x] Unit test for `CodingAgentControl` scoping (edge `coding-agent-control.test.ts`: another space's or
      another kind's pid refused before the host is touched; spawn is the coding agent in its own space).
- [ ] The same, end to end in the worker: needs an edge test-plugin operation that calls the host service.
- [ ] Server-started runs lend no Composer MCP token (needs a hub mint RPC bound to the caller), so
      the agent cannot update its tasks itself; `syncCloudRun` attaches the PRs instead.
- [ ] Sync must be driven by the caller (MCP client) today; a timer trigger per run would make it
      autonomous.
- [ ] The space's GitHub token is a `ghu_` GitHub App user token (expires ~8 h): long runs may lose push.
- [x] Link the PR back to the task without relying on the agent calling MCP — `syncCloudRun` imports
      each PR URL the agent wrote, attaches it to the run's tasks and moves them to review.
- [ ] Remote permissions, MCP and shell e2e tests are `todo` placeholders.
- [ ] sandbox-service runs `noAuth: true` (pending dxos#13056).

## Blocked

- [ ] GitHub write access for cloud runs (blocks DoD items 1 and 2). The space's GitHub connection is a
      user token (`ghu_`, the user's own authorization of the dev app): run 3 got 403 cloning
      dxos/edge; run 4 (tests for the cloud run's helpers) wrote and passed 9 tests but `git push` got
      403 "Permission to dxos/dxos.git denied" and `gh pr create` "Resource not accessible by
      integration". Fix: an org admin installs the dev GitHub App `composer-space-dev` on dxos/dxos and
      dxos/edge with Contents and Pull requests read & write, and the space reconnects GitHub as an app
      connection. Server-started runs can lend that managed token now (`AccessTokenResolver` is served
      to EDGE operations).

- [ ] dxos#14557 CI is red on a bad moon remote-cache entry (`mcp-server:build` 04bd11f8 restores no
      files), not on the diff. Needs eviction: an operator, or a CI `moon run mcp-server:build --force`.
      Root cause (a cancelled shard uploading an empty entry) is suggested as a separate task.

- [ ] Apple: macOS notarization (and likely the iOS App Store Connect upload) fail with HTTP 403
      "A required agreement is missing or has expired" (Deploy Apps run 815). The Apple Developer
      account holder must accept the agreement; not fixable in code.

## PRs

- dxos/edge#1537 — compute-service `CodingAgentControl` host service (stacked on edge#1535). Draft.
- dxos/dxos#14557 — this project: draft-PR brief, repositories over MCP, specs. Draft; CI red on
  the cache entry above.
- dxos/dxos#14555 — whoami on Composer's in-app MCP; dev channel → EDGE dev. Draft, green.
- dxos/edge#1535 — checkouts on container disk, per-turn snapshot. Ready, green.
