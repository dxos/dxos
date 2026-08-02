# mcp — Tasks

Goal: task-planning skill working with Composer so DESIGN and TASKS are Composer documents,
over the loop Claude ⇔ MCP ⇔ EDGE ⇔ Composer.
Design: [agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md](../../../agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md)

## Milestone 1 — local round-trip (current)

- [x] Leg 1: composer dev server syncing with local edge (ws 101, agents/create 200, live queue-replicator traffic)
- [x] Pull edge to origin/main; rebuilt stale dists; .env via op inject (CLOUDFLARE_API_TOKEN needed for FUNCTIONS_DISPATCHER remote proxy); wiped .wrangler + D1 migrations (UserAgent.ownerIdentityDid)
- [x] Identity: reused Composer profile (key from edge auth log; agent registered via composer reload); space BAF4N7HEHDPFFQ7Q377TT6CG4ASGP5IR6
- [x] MCP leg: all service bindings local [connected]
- [x] OAuth+MCP via mcp-smoke.mjs: register/PKCE/token → initialize → tools/list → whoami (composer identity)
- [x] createDocument+updateDocument → doc 01KYXPCFW1G3XX5J76PPGJYGHP live in Composer UI (verified visually)
- [x] MCP round-trip into the USER's identity/space (identity key from edge log; --halo-space bypass for un-agented identity) — doc visible in user's Composer
- [ ] Maintain TESTING.md (OAuth-stub identity-key path vs dx mcp connect device-invitation path) — created 2026-08-01, keep current as blockers clear
- [x] Reverse: Composer edit → readDocument ("WOW this worked!" typed in user's Composer, read back via MCP)
- [x] cloudflared tunnel :8791 — OAuth+whoami round-trip PASSED via https://degree-italic-italia-saskatchewan.trycloudflare.com (morning steps in TESTING.md)
- [x] Runbook = TESTING.md (+ morning steps section)

## Milestone 3 — overnight 2026-08-01 (user-directed)

- [~] E2E smoke script #1 (device-invitation path): scripts/e2e-invitation-smoke.mjs — legs 1-2 PASS. Leg 3 "Connecting…" hang FULLY DIAGNOSED + FIXED 2026-08-01, two stacked causes:
  1. FIXED (MERGED in #12428): `dx profile create` templates omit `runtime.client.edgeFeatures` → client silently falls back to MemorySignalManager (service-host.ts:444) → invitation never signaled. With `signaling: true` both peers meet in the edge swarm and exchange offer/answer (verified live).
  2. FIXED in this PR (#12432): the "bun p2p segfault" was NOT a bun bug — node-datachannel@0.30.0's darwin-arm64 binary crashes under BOTH bun 1.3.2 AND node 24 (the earlier "guard is correct" verdict was wrong: a fresh 0.32.3 install passes the loopback under both runtimes). Fix = catalog bump 0.30.0 → ^0.32.3 + remove the `isBun()` MemoryTransportFactory guard (local-client-services.ts). LIVE-VERIFIED: bun-hosted `halo share` → browser join now passes "Connecting…", shows the verification-emoji + auth-code step, and completes the dialog. Loopback repro (runs from anywhere via createRequire): .agents/projects/mcp/scripts/bun-rtc-loopback.mjs
  - Remaining (PARKED 2026-08-01, user redirected to plugin-tasks MCP work): ADMISSION fails after the transport fix — guest passes "Connecting…", shows verification emoji + auth-code entry, dialog closes, but the host never reaches SUCCESS and `dx device list` stays at 2 devices; guest falls back to a fresh auto-created identity (red error ring on avatar). Reproduced twice. Next diagnostic: LOG_FILTER=debug on the host through the auth-code window (named filters like `invitations-handler:debug` match nothing), plus guest-side shared-worker logs. Suspect the delegated/persistent admission path (share.ts forces persistent+delegated; the identity's EDGE Agent device is OFFLINE)
- [x] USER DIRECTIVE (overnight 2026-08-02): **MCP task verbs WORK — Path A (OAuth) fully verified end-to-end.** `e2e-task-smoke.mjs` drives createObject(TaskSet) → taskCreate ×2 (root + sub-task) → taskUpdate → taskAssign → taskComplete → taskList against the user's space; task sets attached to the root collection (navtree-visible), states/assignee verified via a second MCP session. Edge branch `mcp-task-tools` (commit fce14b9d) = task-tools.ts (5 verbs) + server-layer wiring + registry (TasksOperationHandlerSet + Task/TaskSet/Outline types); 52/52 workerd tests
  - THREE upstream defects found and FIXED (dxos branch, commits d5ec313260 + 1d3c3044f5): (1) `GeneratorAnnotation` object form (`{generator,args}`, used by `Task`) was rejected by the json-schema contract → `Operation.serialize` threw → EVERY space-scoped invocation on a registry containing task ops failed (not just listing: entrypoint.ts:188 builds records on the invoke path too); (2) plugin-tasks had no **workerd entry** (`#plugin` condition) so activating it dragged React `.pcss` into the worker bundle — added `TasksPlugin.workerd.ts` mirroring plugin-markdown; (3) the task verbs were **not remotely invocable**: inputs took live ECHO objects (a ref envelope can't decode into one) and outputs returned live proxies (arrive as `{}` — the RPC layer returns handler output raw). Inputs are now `Ref.Ref(...)`, outputs `Entity.toJSON` snapshots (matches `database.objectCreate`); regression test added (`operations/serialize.test.ts`)
  - DEV-ONLY local wiring (NOT committed to edge): plugin-tasks + react-ui-task are unpublished, so both are packed locally into `~/Code/dxos/edge/temp-tarballs` with deps rewritten to pkg.pr.new, plus a pnpm override pinning `@dxos/echo` to a local build carrying fix (1). Flip the operation-service dep back to `catalog:dxos` + add the catalog entry once they publish
- [ ] Path B (device invitation) STILL BLOCKED — but one layer deeper than before: with the transport fix live the guest now reaches auth (verification emoji + code entry) and the host reaches `READY_FOR_AUTHENTICATION` + "introduced host invitation", then the submitted code never arrives (no further host log; `dx device list` stays at 2; the guest silently falls back to creating its own identity). Reproduced 3×. Next: instrument the guest side (shared-worker logs) around auth-code submission, and check whether the swarm connection survives past introduction
- [x] E2E smoke script #2 (OAuth-stub path): PASSING, fully self-contained — scripts/e2e-oauth-smoke.mjs bootstraps a fresh browser identity (playwright), harvests key+space from edge-dev.log (new-spaces-only filter; busiest-space alone grabs the user's), OAuth+MCP creates text+document, attaches to root collection, asserts title visible in the same browser context (Collections node must be expanded first)
- [ ] FINDING: raw createObject makes ORPHANS — not attached to the space root collection, so invisible in the navtree (old createDocument did CollectionModel.add). Script works around via updateObject on the collection objects[] (racy full-array replace). API fix candidates: attach option on createObject, or curated task/document verbs (task-plugin spec)
- [ ] Design: claude skill ⇄ Composer space sync — TASKS document per project; registry.yml optionally carries the ECHO DXN (spaceid/objectid) of the TASKS doc
- [ ] Design/track: dedicated task-list plugin — reconcile plugin-outliner vs plugin-projects (different notion of project); consider task/project-specific MCP verbs vs the generic object verbs
- [~] USER DIRECTIVE 2026-08-01: prepare for `TaskOperation` from `claude/competent-curie-20057f` — REVIEWED (spec updated with the resolution): plugin-tasks subsumes plugin-outliner; TaskSet (parent-edge containment) + Task@0.2.0 (Actor assignee) + Outline/Journal in @dxos/types; verbs `taskCreate/taskUpdate/taskComplete/taskAssign` + `createOutline/convertToTask/quickEntry` (+ ProjectOperation). Edge side (mine, MILESTONE-5 §7.3): after that branch lands + uniform pin bump — register @dxos/types Outline/TaskSet/Task@0.2.0 in operation-service baseTypes, register TasksPlugin handlers (worker-safety: create/update/complete/assign audited CLEAN — effect/compute/echo/types only; `quick-entry` imports app-toolkit AppSpace + plugin-client — needs a bundle check before full-plugin registration, else schema-only + explicit handler set), then project the verbs as MCP tools (or generically via the planned `McpToolAnnotation`). Identity-through-the-call is the edge prerequisite for assignee-bearing writes
- [ ] OBSOLETED by the above once competent-curie lands: edge branch `operation-service-outliner` (schema-only Outline via `@dxos/plugin-outliner/types` + interim pin) — do NOT open that PR; Outline will import from @dxos/types instead. The `./types` export on plugin-outliner (rides #12428) is harmless
- [ ] Land #12423 first (auto-merge armed), keep working in this worktree

## Milestone 2 — task-planning ⇄ Composer documents (next)

- [x] MCP object CRUD + discovery (edge PR #785 MERGED 2026-08-01 — incl. integration-suite port preserving #758 guards + uuid@14 vitest fix): createObject/getObject/updateObject/deleteObject/queryObjects + listPlugins/listTypes/listOperations; Task+ExternalProject registered; live-verified full Task/ExternalProject lifecycle in user's space
- [x] markdown.update widened to any text-bearing document (dxos, rides #12423); outline edits via MCP activate on next edge @dxos pin bump ≥ dd552dfc74
- [x] deviceInvitationCode race fix MERGED into #12423 (claude/funny-chaplygin-89274c; onboarding is single param owner + reset-and-join dialog); note: primary-checkout composer serve still runs main without the fix
- [ ] Shared composer space to track projects and tasks (tracked 2026-08-01)
- [ ] ExternalProject rename (tracked 2026-08-01)

- [ ] Prototype: task-planning skill reads/writes DESIGN.md/TASKS.md as Composer documents via MCP
- [x] Outline text edits via MCP: RESOLVED in source (markdown.update widened, rides #12423; edge README claim fixed in #785). Runtime condition only: the running mcp/operation-service stack edits outlines once its @dxos pin is ≥ dd552dfc74 — until then `updateObject.edits` on an outline fails at runtime; `properties` CRUD unaffected
- [ ] Edge @dxos pin bump ≥ dd552dfc74 (now on dxos main) — activates outline text edits via updateObject.edits; routine dep-bump covers it
- [x] Local edge checkout back on main; dev stack restarted 2026-08-01 (previous run died after ~11h40m: wrangler node OOM — heap-limit crash, known long-run miniflare growth; remedy = restart, no code fault)
- [ ] Reference: edge PR #781 (mcp-space-service README: commands, deploy, dx CLI round-trip)

## Backlog

- [x] Composer: deviceInvitationCode RACE — FIXED (claude/funny-chaplygin-89274c merged into #12423): onboarding is the single param owner + reset-and-join dialog. Runtime note: any composer served from a checkout without the fix (e.g. primary checkout on main) still hangs
- [ ] CLI under node: tsx chokes on `.tpl` imports from @dxos/assistant (bun-only text loader) — blocks testing invitations outside bun
- [x] CLI: `halo share` — printing + open-failure surfacing were already fixed in the re-registered version (landed with #12423); added the missing joinable URL print (live-verified 2026-08-01)
- [x] CLI: halo create/share re-registration LANDED with #12423 (plugin-client/src/commands/halo/index.ts)
- [x] `listSpaces` verified WORKING 2026-08-01 (returns the identity's spaces); `[]` for identities without a UserAgent row (post-wipe) — see TESTING.md sharp edges. NOT a code bug: registry normalizes hex→DID on lookup (DX-995)
