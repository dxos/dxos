# Client–Edge Audit — Design

## Goal

Make the DXOS client run cleanly **without** an edge connection:

1. **Complete inventory** of every point where the client communicates with
   edge — `EdgeHttpClient`, `EdgeClient` (websocket), and ad-hoc `fetch`/
   `WebSocket` call sites.
2. **Offline config is first-class**: with no edge endpoint in config, the
   database works, there is **no network activity**, and **no warnings or
   errors** are logged.
3. **No defaults**: nothing in code or bundled config silently falls back to an
   edge endpoint when the config omits one.

Scope: the client stack (`@dxos/client`, `@dxos/client-services`, echo/halo/
mesh cores, `@dxos/edge-client` consumers). Composer plugin usage is inventoried
for completeness but fixes target the SDK.

## Findings

_To be filled by the Phase 1 audit._

### Edge client constructions

### Direct network call sites

### Config plumbing & defaults

## Decisions

_None yet._
