# mcp — Tasks

Goal: task-planning skill working with Composer so DESIGN and TASKS are Composer documents,
over the loop Claude ⇔ MCP ⇔ EDGE ⇔ Composer.
Design: [agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md](../../../agents/superpowers/specs/2026-07-31-local-edge-mcp-composer-roundtrip-design.md)

## Milestone 1 — local round-trip (current)

- [ ] Leg 1: composer dev server syncing with local edge (edge:dev :8787 + composer serve + DX_EDGE_BASE_URL) — FIRST, user watching
- [ ] Pull ~/Code/dxos/edge to origin/main; secrets via `op` / secrets:dev as needed
- [ ] Identity + agent on local edge (dx profile → localhost:8787); create working space
- [ ] MCP leg: START_MCP=1 DX_PARALLEL_WRANGLER_DEV=1; verify bindings hit LOCAL edge/operation-service
- [ ] dx mcp connect → tools → whoami
- [ ] Round-trip: createDocument → visible in Composer; Composer edit → readDocument; updateDocument → live in Composer (screenshots)
- [ ] cloudflared tunnel :8791; repeat one round-trip via tunnel; record URL + morning Claude Desktop steps
- [ ] Runbook (commands, ports, ids, tunnel URL, morning steps)

## Milestone 2 — task-planning ⇄ Composer documents (next)

- [ ] Prototype: task-planning skill reads/writes DESIGN.md/TASKS.md as Composer documents via MCP
- [ ] Reference: edge PR #781 (mcp-space-service README: commands, deploy, dx CLI round-trip)

## Backlog

- [ ] `listSpaces` / `querySpace` marked BROKEN in mcp-space-service — investigate if needed
