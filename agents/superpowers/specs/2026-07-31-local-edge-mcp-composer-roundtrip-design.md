# Local EDGE + MCP + Composer document round-trip

Date: 2026-07-31 · Status: approved · Owner: burdon
Milestone 1 of: task-planning skill working against Composer documents (DESIGN/TASKS as Composer docs).

## Goal

A fully local test environment proving the loop `Claude ⇔ MCP ⇔ EDGE ⇔ Composer`:
documents created/edited through the MCP server appear live in a local Composer, and
Composer edits read back through MCP. By morning: verified round-trip + runbook; task-planning
integration is explicitly out of scope for this milestone.

## Topology

```
Claude (dx CLI / smoke)──┐
Claude Desktop ── cloudflared https ──► mcp-space-service :8791
                                          │ service bindings (local dev registry)
                                          ▼
                          edge :8787 ◄── operation-service :8792
                                ▲
Composer (vite) ────────────────┘   DX_EDGE_BASE_URL=http://localhost:8787
```

- EDGE stack: `~/Code/dxos/edge` at `origin/main`;
  `START_MCP=1 DX_PARALLEL_WRANGLER_DEV=1 moon run edge:dev`
  (fixed ports: edge 8787, ai 8788, tail 8789, [hub 8790], mcp 8791, operation 8792; logs → `edge-dev.log`).
  `START_HUB=1` only if the login flow demands it. ai-service runs but nothing in this flow depends on it.
- Composer: served from the primary dxos checkout (`moon run composer-app:serve`), pointed at the
  local edge via `DX_EDGE_BASE_URL` (mapped by `dx-env.yml` → `runtime.services.edge.url`).
  No dxos code changes expected for this milestone.

## Identity bootstrap

Create identity + agent on the local edge via a `dx` profile with edge url `http://localhost:8787`
(fallback: through the local Composer UI driven by playwright). The identity key (hex) feeds the
MCP OAuth stub (`/authorize` form). One space is created; its `spaceId` is the working space.

## Verification (deliverable)

Scripted, repeatable, each step with logged evidence:

1. `dx mcp connect http://localhost:8791/mcp` → `mcp tools` → `whoami` matches the identity.
2. `createDocument` via MCP → document visible in local Composer (playwright, screenshot).
3. Edit the document in Composer → `readDocument` returns the edit.
4. `updateDocument` via MCP → change appears live in Composer (screenshot).
5. Repeat one round-trip through the cloudflared tunnel URL (the Claude Desktop path).

## Tunnel

`cloudflared tunnel --url http://localhost:8791`, URL recorded in the runbook with morning
instructions for adding it as a Claude Desktop custom connector. Quick-tunnel URLs die with the
process; restart + re-record on drop.

## Deliverables

- This spec; a runbook (commands, ports, identity/space ids, morning steps, tunnel URL).
- Any smoke scripts added in this worktree.
- Edge fixes if needed: branch + PR on dxos/edge (allowed), linked from the runbook.
- Registry: new project entry; the tracked goal (task-planning ⇄ Composer documents, edge PR 781
  MCP link) files under it.

## Risks / fallbacks

- mcp-space-service local bindings resolving to the *local* `edge`/`operation-service` workers is
  designed-for but unproven — verify first; fix on an edge branch if broken.
- `updateDocument` → Composer liveness depends on local edge replication; if stale, document with
  evidence and check `runtime.client.edgeFeatures` flags.
- Wrangler + vite + playwright on one machine is heavy; fallback `composer-app:serve-min`.
- Secrets self-served via `op` + `.env.tpl` / `secrets:dev` (approved).
