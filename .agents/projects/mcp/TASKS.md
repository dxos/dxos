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
- [ ] Reverse: Composer edit → readDocument
- [ ] cloudflared tunnel :8791; repeat one round-trip via tunnel; record URL + morning Claude Desktop steps
- [ ] Runbook (commands, ports, ids, tunnel URL, morning steps)

## Milestone 2 — task-planning ⇄ Composer documents (next)

- [ ] Prototype: task-planning skill reads/writes DESIGN.md/TASKS.md as Composer documents via MCP
- [ ] Reference: edge PR #781 (mcp-space-service README: commands, deploy, dx CLI round-trip)

## Backlog

- [ ] `listSpaces` / `querySpace` marked BROKEN in mcp-space-service — investigate if needed
