# Client–Edge Audit — Tasks

_Resume: run Phase 1 audit (inventory all client→edge communication points)._

## Phase 1: Inventory client→edge communication points

Map every place the client stack talks to edge — `EdgeHttpClient`, `EdgeClient`
(websocket), and ad-hoc `fetch`/`WebSocket` calls — so offline behavior and
defaults can be audited against a complete list. Findings live in DESIGN.md.

### Tasks

- [ ] **Inventory `EdgeHttpClient` / `EdgeClient` constructions and consumers**
  - Who constructs them, with what URL, and how construction is gated on config.
- [ ] **Inventory direct `fetch`/`WebSocket`/other network calls in the client stack**
  - Including boot-time activity (Client.initialize path, worker boot) and
    telemetry/observability.
- [ ] **Inventory config plumbing for the edge endpoint**
  - Every accessor of the edge URL config path and each call site's
    absent-config behavior (skip / warn / throw).

## Phase 2: Offline config works cleanly

With no edge endpoint in config: database works, zero network activity, zero
warnings/errors.

### Tasks

- [ ] **Determine current offline behavior** — trace each Phase 1 site with
      absent edge config; classify OK / warns / errors / still dials out.
- [ ] **Add an automated offline test** — client with edge-less config: DB
      create/query round-trip succeeds; assert no network and no warn/error logs.
- [ ] **Fix each offending site** found by the audit/test.

## Phase 3: No edge-endpoint defaults

### Tasks

- [ ] **Find any code/config default that injects an edge endpoint when config
      omits it** (code fallbacks, bundled yml defaults, env plumbing).
- [ ] **Remove them** — absent config must mean "no edge", never a production
      endpoint.

### References

- DESIGN.md (this directory) — audit findings + decisions.
- PR #12585 — defer edge networking until the worker has booted (related prior work).
