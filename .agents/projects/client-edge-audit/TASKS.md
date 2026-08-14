# Client–Edge Audit — Tasks

_Resume: Phase 2 — offline verification test in packages/sdk/client, then Phase 3 defaults removal._

## Phase 1: Inventory client→edge communication points

Map every place the client stack talks to edge — `EdgeHttpClient`, `EdgeClient`
(websocket), and ad-hoc `fetch`/`WebSocket` calls — so offline behavior and
defaults can be audited against a complete list. Findings live in DESIGN.md.

### Tasks

- [x] **Inventory `EdgeHttpClient` / `EdgeClient` constructions and consumers** —
      DESIGN.md §Edge client constructions. Boot path fully URL-gated; three
      inconsistent absent-URL policies (skip / throw-on-use / invariant).
- [x] **Inventory direct `fetch`/`WebSocket`/other network calls in the client stack** —
      DESIGN.md §Direct network call sites. Client stack: zero calls without
      edge URL; observability has 2 consent-gating bugs (ipdata pre-`disabled` +
      boot warn, OtelMetrics constructor-started exporter).
- [x] **Inventory config plumbing for the edge endpoint** —
      DESIGN.md §Config plumbing & defaults. SDK boot is clean; violations are
      in @dxos/config (defaultConfig, configPreset, EDGE_SERVICE_DEFAULTS) +
      scattered `??` fallbacks.

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
