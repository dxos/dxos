# Composer demo video — running notes

Scratch ledger for the brainstorming phase. Decisions graduate to `DESIGN.md`;
actionable work graduates to `TASKS.md`.

## Clip categories (canonical list)

Source: user brief, 2026-08-21.

1. Basic Composer — space creation, invitations, deck layout, plugin registry, settings.
2. Core plugins — Markdown, Sheets, Tables, Drawings, Kanban.
3. Companions (plugins).
4. Collaboration — multi-user editing, comments, versioned documents.
5. Assistant — create/update documents, generate diagrams, create tables.
6. **ECHO** — explorer graph diagrams, live queries, schema/type views, Ref/DXN
   navigation, local-first storage story. *(added 2026-08-21)*
7. **Agent runtime** — assistant internals: trace panel, tool calls, skills,
   operation invocation, streaming. *(added 2026-08-21)*
8. Advanced plugins — Gmail, unsubscribe, auto-drafts, CRM curation.
9. Advanced scenarios — project management, pipelines.
10. Plugin development — registry, Claude Code skills, MCP server, CLI, Chess tutorial.
11. Advanced plugins II — Meetings, Magazine, Translation, 3D, Games.
12. Mobile and native.

Categories 6 and 7 are the two that no competitor can copy — treat them as
first-class spine material, not B-roll.

## Standing technical findings

- **Playwright cannot drive a Screen Studio recording.** Playwright dispatches
  CDP input events; it never moves the macOS cursor. Screen Studio captures the
  OS cursor and keys its auto-zoom / click-highlight off real cursor events.
  Therefore capture splits into *stage* (agent-owned, deterministic) and
  *perform* (needs a real OS cursor: human, or `cliclick`/computer-use).
- **`exemplar-space.dx.json` is shipped product.** `plugin-onboarding` imports it
  for every new identity. Demo data should be a separate seed, not a mutation of
  the fixture, unless deliberately backported.

## Decisions

### Q1 — audience (answered 2026-08-21)

**One clip library, three cuts** (developer hero / prosumer hero / investor tour),
**plus a fourth cut for a Cloudflare presentation**. The Cloudflare cut is a named,
dated deliverable — not a spin-off — and adds a thirteenth category:

13. **EDGE + Cloudflare deployment** — how DXOS runs on Workers, and how a
    Composer space round-trips through EDGE.

## The Cloudflare surface (grounding)

The `edge` repo (`/Users/burdon/Code/dxos/edge`, a SIBLING repo — not this one)
is a Workers-native services fleet: `packages/services/*` holds ~25 services
(agents, ai-service, blob-service, calls, compute-service, db-service,
functions-service, hub-service, identity-service, jetstream-service, kms-service,
mcp-space-service, operation-service, registry-service, router, sandbox-service,
tail-logger, …). `main` continuously publishes to the `main` environment;
`./scripts/deploy.mjs --env (labs|staging|production)` for the rest.

Cloudflare primitives actually bound in `wrangler.*` configs:

| Primitive | Configs referencing it |
| --- | --- |
| Durable Objects | 49 |
| KV | 42 |
| D1 | 29 |
| R2 | 27 |
| Queues | 8 |
| Workers AI | 8 |
| Images | 3 |
| Containers | 2 |

Composer itself also deploys to Workers (`packages/apps/composer-app/wrangler.jsonc`
in this repo), as do `tasks`, `testbench-app`, `todomvc`, `docs`, and the
storybook. Observability is Grafana (log explorer + log metrics dashboards) and
the Hub admin at `hub.dxos.network/admin/home`.

This is the strongest possible material for a Cloudflare audience: a real
local-first product whose entire backend is Workers + DO + R2 + D1 + Queues,
with the sync engine itself living in Durable Objects.

### Q2 — schedule (answered 2026-08-21)

Cloudflare presentation is **2-4 weeks out** (so ~2026-09-04 to 2026-09-18).
Phase 1 = **5 hybrid clips** that serve both the CF cut and the general library.
Working spine for those five: *one space — local-first, synced through EDGE,
with the agent runtime executing on Workers.* Staging harness gets built for
retakes; demo seed script if it fits the window.

### Partners to showcase (user, 2026-08-21)

**Effect, Automerge, Tauri, Cloudflare.** These are credits, not features — each
needs a moment where it is visibly load-bearing rather than a logo card:

- **Automerge** — the CRDT merge itself. Two windows, concurrent edit, offline
  divergence and reconverge. Also the version-history / document-revisions story.
- **Effect** — the runtime under operations, services and the agent. Visible in
  the trace panel and in plugin-dev / CLI clips, and in typed error handling.
- **Tauri** — the native desktop build (`packages/apps/composer-app` ships Tauri
  targets), i.e. the "mobile and native" category.
- **Cloudflare** — see the EDGE section above.

A partner-credit montage is the cheap version; the good version is one clip per
partner where the technology is the *point* of the clip.

### Q3-Q8 — answered 2026-08-21

| # | Decision | Choice |
| --- | --- | --- |
| 3 | Build | **Local dev (this worktree) + production for hero shots** — bulk recorded locally where we control everything; re-shoot space creation, invitation, EDGE sync and deploy against production. |
| 4 | Demo data | **Separate demo seed** — new script beside `build-exemplar-space.ts`; Bramble superset as a loadable space archive. Shipped exemplar untouched. |
| 5 | Capture | **Staged-manual** — agent stages exact pre-roll state, user performs from a numbered beat sheet. No robot cursor for now; revisit if mechanical clips pile up. |
| 6 | Editor | **Research first** — half-day trial of Descript / Kapwing / Veed against a real Screen Studio export, then a comparison doc with a recommendation. |
| 7 | Voice | **HeyGen avatar intro/outro + user VO** for the body. Synthetic scratch tracks used for timing the edit before any real recording. |
| 8 | Triage | **User marks the candidate list** — so the first deliverable is a complete, annotatable candidate clip list. |
| 9 | Gmail | **Mock locally** — synthetic mailbox in the demo seed, no real OAuth, no real account. The connect/OAuth flow is therefore NOT shown. |
