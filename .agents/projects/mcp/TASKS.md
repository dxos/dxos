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
- [ ] cloudflared tunnel :8791; repeat one round-trip via tunnel; record URL + morning Claude Desktop steps
- [ ] Runbook (commands, ports, ids, tunnel URL, morning steps)

## Milestone 2 — task-planning ⇄ Composer documents (next)

- [x] MCP object CRUD + discovery (edge PR #785): createObject/getObject/updateObject/deleteObject/queryObjects + listPlugins/listTypes/listOperations; Task+ExternalProject registered; live-verified full Task/ExternalProject lifecycle in user's space
- [x] markdown.update widened to any text-bearing document (dxos, rides #12423); outline edits via MCP activate on next edge @dxos pin bump ≥ dd552dfc74
- [x] deviceInvitationCode race fix MERGED into #12423 (claude/funny-chaplygin-89274c; onboarding is single param owner + reset-and-join dialog); note: primary-checkout composer serve still runs main without the fix
- [ ] Shared composer space to track projects and tasks (tracked 2026-08-01)

- [ ] Prototype: task-planning skill reads/writes DESIGN.md/TASKS.md as Composer documents via MCP
- [ ] BLOCKER for outlines: MCP updateDocument fails on Outline objects — MarkdownOperation.Update pins `doc: Ref.Ref(Markdown.Document)` (isInstanceOf invariant, Database.ts:408) while Open duck-types on the content ref, so readDocument works on outlines but updateDocument does not. Fix: widen Update (and listDocuments?) to any text-bearing document, or add an outline operation; note the fix only reaches the MCP stack after edge bumps its @dxos pin (operation-service bundles plugin-markdown)
- [ ] querySpace is NOT broken (README stale): returned the Outline by typename with full documentJson — fix the README claim; listSpaces still untested
- [ ] Reference: edge PR #781 (mcp-space-service README: commands, deploy, dx CLI round-trip)

## Backlog

- [ ] Composer: deviceInvitationCode RACE — navigation-handler strips the param + opens JOIN_DIALOG while onboarding-manager (skipAuth=no hub) auto-creates an identity underneath, so device-join hangs on "Connecting…" forever even on a fresh profile; with an existing identity it dies silently (Effect.orDie). Root cause of the failed CLI→browser pairing; task chip filed; fix IN PROGRESS on branch claude/funny-chaplygin-89274c (separate session). (plugin-client navigation-handler.ts ~L26/L44 vs plugin-onboarding onboarding-manager.ts ~L156/L170)
- [ ] CLI under node: tsx chokes on `.tpl` imports from @dxos/assistant (bun-only text loader) — blocks testing invitations outside bun
- [ ] CLI: `halo share --open` swallows browser-launch failures AND suppresses printing the invitation code — print the URL always; surface open errors
- [ ] CLI: decide where the halo create/share re-registration lands (currently uncommitted in worktree: plugin-client/src/commands/halo/index.ts; needs DX_SOURCE=1 to run from source)

- [ ] `listSpaces` / `querySpace` marked BROKEN in mcp-space-service — investigate if needed
