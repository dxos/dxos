# Composer error catalog — SigNoz, preview + production

Source: SigNoz logs, `service.name = 'composer'`, `severity_number >= 17` (ERROR),
window **2026-09-13 → 2026-09-20 (7d)**. Environment comes from the
`deployment.environment` resource attribute; error text from the `error` log
attribute; source location from the `meta` attribute (`{file, line}`).

Caveats: browser telemetry, so volume tracks a handful of active sessions, not
users — several families below are one session retrying. `severity_text` is
empty on every composer log; filter on `severity_number` (9=INFO, 13=WARN,
17=ERROR).

Counting convention: every count is a number of log events, grouped by `body`.
An error string quoted under a family is the `error` attribute _of_ those
events, not an additional event — do not add the two together.

## Volume by environment (7d)

| env        | INFO (9) | WARN (13) | ERROR (17) |
| ---------- | -------- | --------- | ---------- |
| preview    | 49,178   | 18,290    | **2,642**  |
| production | 675      | 404       | **104**    |
| local      | 680      | 5,096     | 178        |
| dev        | 596      | 411       | 54         |
| main       | 2,374    | 1,243     | 0          |

## Catalog

### P1 — Subduction replicator send timeouts (preview 1,830; prod 3)

- Body `failed to send message`, `echo-edge-subduction-replicator.ts:725` (1,614)
  and `:773` (216).
- `Error: Timeout [10,000ms]` out of `RpcPeer.send` → `_sendMessage` → `write`.
- Dominates all composer errors (69% of preview ERRORs). Correlates with WARN
  `received subduction error; re-handshaking in place`
  (`ctx_message` = `subduction: session lost`) and WARN
  `collection sync not converging`
  (`automerge-host.ts:1518`, hundreds of passes on one collection).
- Read: EDGE websocket sessions dropping under preview; the replicator retries
  and logs one ERROR per queued message, so counts are inflated per incident.

### P2 — WASM `RuntimeError: unreachable executed` (preview 100)

- Body `uncaught error`, no JS frames. 100 of 101 preview `uncaught error`s.
- Automerge/WASM trap — kills the worker, so it is a hard failure, not noise.

### P3 — RPC timeouts surfacing as unhandled rejections (preview ~140)

- Body `unhandled rejection`, `TimeoutError: RPC timeout: call: {"timeout":20000}`
  (also 30000) from `flush` / `_sendUpdates` paths in the echo client.
- Same underlying stall as P1, escaping as an unhandled rejection instead of a
  handled log.

### P4 — Query/index pipeline errors (preview, empty body)

Grouped by `meta` (body empty — the error is the payload):

| file:line                                                         | count       |
| ----------------------------------------------------------------- | ----------- |
| `core/mesh/edge-client/src/edge-ws-connection.ts:132`             | 83          |
| `echo-host/src/db-host/query-service.ts:275`                      | 66          |
| `echo-client/src/client/index-query-source-provider.ts:296`       | 64          |
| `network-manager/src/transport/webrtc/rtc-transport-proxy.ts:108` | 35          |
| `echo-host/src/automerge/echo-network-adapter.ts:305 / :315`      | 29 / 18     |
| `index-query-source-provider.ts:370 / :399 / :369`                | 19 / 12 / 8 |

### P5 — `repo-proxy` lifecycle invariant (preview 6+)

- `Error: invariant violation [this._lifecycleState === LifecycleState.OPEN] at
packages/core/echo/echo-client/src/automerge/repo-proxy.ts:417`, from
  `_loadLinkedObjects` → `find` → `_getOrLoadHandle`.
- Object loading racing client teardown. Also seen as bare
  `_loadHandle/_loadLinkedObjects` rejections (14).

### P6 — Production: `getEntityKind` on undefined during query traversal (prod 33)

- `TypeError: Cannot read properties of undefined (reading 'system')` at
  `getEntityKind` → `_execRelationTraversal` → `_execStep` → `getResults`.
- The single largest production error. A relation traversal dereferences an
  entity that isn't loaded. Deterministic-looking (one stack, no variants).

### P7 — Production: editor `pending-text` / `factories.ts:136` (prod 34, preview 7)

- Empty body at `packages/ui/ui-editor/src/extensions/core/factories.ts:136`;
  the captured stack points at `pending-text` field construction inside a
  CodeMirror `dispatch` under a deep React commit.

### P8 — Chunk-load failures after deploy (prod ~11)

- `Failed to fetch dynamically imported module: …/assets/<chunk>.js` and
  `Error: Unable to preload CSS for …/assets/src-*.css` (4).
- Drives the 20 production `module failed to activate` entries
  (`module-loader.ts:521`) across ~18 distinct modules (`plugin.space.module.schema`,
  `plugin.markdown.module.OperationHandler`, `assistant.module.*`, …) and the
  6 `plugin auto-disabled` (`plugin-catalog.ts:73`).
- Read: clients running against an old build after a redeploy — stale index
  requesting deleted chunks.

### P9 — Passkey / onboarding (prod 10, preview 5)

- `PasskeyDismissedError: No passkey was presented` — `Caused by: The operation
either timed out or was not allowed.` (WebAuthn).
- Surfaces as `operation invocation failed` for
  `dxn:org.dxos.operation.client.redeemPasskey` (prod 5, preview 5) and
  `…createPasskey` (prod 4), plus errors at `WelcomeScreen.tsx:122/124`.
- Read: mostly user dismissal, not a defect — but it is logged at ERROR and
  pollutes the production signal.

### P10 — Trigger dispatcher (prod 4)

Four events, each pairing a log body with the error that caused it:

| body                         | source                      | error payload         | count |
| ---------------------------- | --------------------------- | --------------------- | ----- |
| `trigger execution failure`  | `trigger-dispatcher.ts:615` | `NoHandlerError`      | 2     |
| `trigger dispatcher error`   | `:457`                      | `EntityNotFoundError` | 1     |
| `failed to refresh triggers` | `:1073`                     | `EntityNotFoundError` | 1     |

- `NoHandlerError: No handler found for operation:
dxn:org.dxos.plugin.inbox.operation.googleMailSync` — a stored trigger
  referencing an operation no longer registered.
- `EntityNotFoundError: Entity not found: echo:///01KYMGPJCXG398JQYERR2BJ80W` —
  trigger pointing at a deleted object.

### P11 — Entity manager invariant on space open (prod 2)

- `Error: invariant violation [!this._objects.has(id)] at
packages/core/echo/echo-client/src/core-db/entity-manager.ts:1700`, in
  `_createInlineObjects` → `openWithSpaceState` → `_initializeDb`.
- Duplicate object id while opening a space — blocks that space from opening.

### P12 — Compute runtime process lifecycle (preview 47, prod 9)

- `lifecycle: failed` at `compute-runtime/src/ProcessHandle.ts:96`.

### P13 — Fatal dialog / startup (prod 11, preview 6)

- `fatal dialog` (`ResetDialog.tsx:92`) — 9 in production, i.e. users hit the
  reset screen; 2 in preview.
- `fatal dialog failed to render` — prod 2.
- `client services failed to open` (`main.tsx:550`) — preview 2.
- `client initialization failed` (`plugin-client/capabilities/client.ts:141`) —
  preview 2.
- `StartupTimeoutError: Startup timed out after 30000ms` — 1, observed in
  production. This is an error payload, not a separate log body, so it is
  already counted in the production total above rather than added to it.

### P14 — Assistant / studio operation failures (preview 33)

- `operation invocation failed` for `assistant.createChat` (12),
  `assistant.generateHomeSuggestions` (8), `studio.generate` (9),
  `appToolkit.updateComplementary` (3), `github.importPullRequest` (1).

### P15 — Navigation (preview 24)

- `node has no URL binding, so it cannot be opened` (`plugin-deck/src/url/navigate.ts:78`).

### P16 — Misc (preview)

- `Error: Context disposed.` during `SpaceProxy._reset/_destroy` (4).
- `Minified React error #185` (infinite update loop) from a settings plank (1).
- `plank error` (`PlankFallback.tsx:19`, 2), `space-graph.ts:142` (5),
  `space-list.ts:212` (4), `notarization-plugin.ts:412` (2),
  `control-pipeline.ts:195` (2).

## Suggested triage order

1. **P6** — only high-volume production crash with a clean, deterministic stack.
2. **P2** — WASM trap; hard worker kill.
3. **P1/P3** — one root cause (EDGE session loss); fixing it removes ~80% of
   preview error volume and most of the noise in P4.
4. **P8** — deploy hygiene (serve old chunks or force reload on version skew).
5. **P9** — reclassify user-dismissed passkey as WARN so production ERROR is
   meaningful.
6. **P10/P11** — low volume, high user impact (trigger silently dead, space
   won't open).

## Reproducing these queries

```
signoz_aggregate_logs
  filter: service.name = 'composer' AND severity_number >= 17
  groupBy: deployment.environment, body
  timeRange: 7d
```

Then drill in with `groupBy: error` (full message + stack), `meta` (source
location), `ctx_opKey` (operation DXN), `ctx_module` (plugin module id).
