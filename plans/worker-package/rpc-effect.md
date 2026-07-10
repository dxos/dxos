# Plan: migrate effect-rpc to the native Worker platform (MessagePort-direct), duplex system port

**Branch:** `dm/worker-package`  
**Last updated:** 2026-07-10  
**Status:** Phase A implemented and committed; the whole workspace now builds (`moon exec :build`
is green). Inline service RPC schemas were realigned with the proto wire types so the service
hosts compile against `*.Handlers` (see [service-rpc-schemas.md](./service-rpc-schemas.md)), and the
iframe/extension client consumers (shell, devtools panel, devtools-extension sandbox) were bridged
onto the `MessagePort` proxy. **Remaining Phase A gap:** the 8 `effect-rpc.test.ts` suite-1 cases
still fail — see below. Phases B–D not started.

---

## Current state (as of branch)

### What is done — Phase A (code landed, not committed)

| Area                                           | Status      | Notes                                                                                                                                                                                                              |
| ---------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `worker-framework/src/internal/rpc.ts`         | ✅ Done     | `makeRpcClient` / `serveRpcGroup` use `MessagePort` + `@effect/platform-browser` (`layerProtocolWorker` / `layerProtocolWorkerRunner`). `@dxos/rpc` removed from deps; `@effect/platform-browser` added.           |
| `client-protocol/src/service-rpc.ts`           | ✅ Done     | `ClientRpcServer`, `makeClientServicesRpc` take `MessagePortLike` (= `MessagePort`). Handler layer unchanged.                                                                                                      |
| `client/src/services/service-proxy.ts`         | ✅ Done     | `ClientServicesProxy` takes raw `MessagePort`.                                                                                                                                                                     |
| App-port consumers                             | ✅ Done     | `createWorkerPort` dropped for **app** ports in `worker-client-services.ts`, `dedicated-worker-client-services.ts`, `dedicated-worker.ts`, `test-worker-factory.ts`, `onconnect.ts`.                               |
| `client-services/.../worker-session.ts`        | ✅ Done     | `appPort: MessagePort`; `shellPort?: MessagePort`.                                                                                                                                                                 |
| `client-services/.../worker-runtime.ts`        | ✅ Done     | `CreateSessionProps.appPort` / `shellPort` are `MessagePort`; `systemPort` still `RpcPort`.                                                                                                                        |
| Test harness rewrites                          | ✅ Partial  | `effect-rpc.test.ts` `setupRpc`, `test-builder.ts` `createClientServer`, `client-e2e/shared-worker.test.ts` use `MessageChannel` for app (and shell) ports.                                                        |
| `devtools.ts`                                  | ⚠️ Partial  | `ClientRpcServer` uses a lazy `MessageChannel().port1`. The old `window.postMessage` ↔ content-script `RpcPort` bridge was removed — **devtools extension RPC is broken** until a Worker-protocol bridge is added. |
| Streaming round-trip test (Phase A validation) | ❌ Not done | Still only unary coverage in suite 1; no dedicated DataService/QueryService-style stream test over `serveRpcGroup`.                                                                                                |

### What is unchanged — still on old protocols

| Channel        | Today on branch                                                                      | Target (Phase C)                                                                                          |
| -------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **appPort**    | Native Worker platform (`MessagePort` direct)                                        | Same                                                                                                      |
| **systemPort** | Protobuf duplex via `createProtoRpcPeer` (`WorkerService` / `BridgeService` bundles) | Rename to **bridgePort**; worker→tab `BridgeService` runner on tab, `WorkerService` merged into app group |
| **shellPort**  | Optional second `ClientRpcServer` over `MessagePort` (deprecated iframe path)        | Out of scope (stay protobuf or remove later)                                                              |

`createWorkerPort` is **still used** for `systemPort` everywhere (`onconnect`, dedicated worker, test factory, worker-client-services, dedicated-worker-client-services).

### Phase B — not started (reverted after accidental regeneration)

- `gen-service-rpcs.ts` was briefly extended; running the generator **overwrote** uncommitted inline-schema service files — all generator changes were reverted.
- `WorkerService.ts` / `BridgeService.ts` **do not exist** under `packages/core/protocols/src/`.
- User-restored service definitions (inline Effect schemas in `*Service.ts`, `DevtoolsHost.ts`, `service-schemas.ts`) are intact and must **not** be regenerated blindly.

### Phase C / D — not started

No changes to `shared-worker-connection.ts`, `_iframeRpc` removal, or `effect-rpc.ts` RpcPort cleanup.

---

## Architecture shift

### Today on branch (2 channels, mixed protocols)

```text
Tab                          Worker
─────────────────────────────────────────────────────────
ClientServicesProxy          ClientRpcServer
  (RpcClient, MessagePort)     (RpcServer, MessagePort)
        │ appPort (native Worker platform) ─────────────►│

SharedWorkerConnection       WorkerSession._iframeRpc
  (proto peer, BridgeService)  (proto peer, WorkerService)
        │◄──── systemPort (protobuf duplex) ────────────►│
```

### Target (2 channels, all effect-rpc on native Worker platform)

```text
Tab                          Worker
─────────────────────────────────────────────────────────
RpcClient                    RpcServer runner
  ClientServices + WorkerService   ClientServices + WorkerService
        │ appPort (tab=platform → worker=runner) ───────►│

RpcServer runner             RpcClient
  BridgeService (RtcTransport)     BridgeService
        │◄── bridgePort (worker=platform → tab=runner) ──│
```

**Key rule:** one `MessagePort` = one client→server direction, fully multiplexed. `WorkerService` (tab→worker) folds into the app group; only `BridgeService` (worker→tab) needs the reverse channel.

---

## Phase A — App port to native Worker platform

**Status: code complete, verification incomplete.**

### Completed checklist

- [x] Rework `packages/sdk/worker-framework/src/internal/rpc.ts` to `MessagePort` + `BrowserWorker` / `BrowserWorkerRunner`.
- [x] Add `@effect/platform-browser` to `worker-framework` deps; remove `@dxos/rpc`.
- [x] `ClientServicesProxy`, `ClientRpcServer`, `makeClientServicesRpc` → `MessagePort`.
- [x] Drop `createWorkerPort` for app ports in listed consumers.
- [x] `devtools.ts` → `MessagePort` (extension bridge not migrated).
- [x] `setupRpc` / `createClientServer` / `shared-worker.test.ts` → `MessageChannel`.

### Remaining Phase A work

- [ ] **Fix suite 1 in `effect-rpc.test.ts`** — 8/10 tests fail with `RpcClosedError` ("Fiber was
  interrupted"). Suites 2/3 (direct `BrowserWorker` in a single fiber) pass, so the transport is
  sound; the failure is specific to the production-shaped split-runtime path (`ClientRpcServer.open`
  + `makeClientServicesRpc` in a held scope + calls dispatched on `Runtime.defaultRuntime` via
  `makeServicesFromRpc`), which mirrors `ClientServicesProxy.open`. Instrumentation narrows it down:
  the connection establishes (client receives the runner ready `[0]`) and the request reaches the
  worker protocol (`proto.send` with a `Request` fires), but the request fiber is **immediately
  interrupted** — a follow-up `Interrupt` is sent and `worker.send`/`executeAcquire` never runs, so
  the server handler is never invoked. In the passing suites the call runs inside the fiber that
  built the client (its context carries the client-layer scope); in the failing path it runs on a
  bare runtime. Neither hosting the server via a long-lived `Scope` (vs `ManagedRuntime`) nor
  wrapping the call in `Effect.scoped` changes the outcome — the interrupt originates in
  `@effect/rpc`'s unary `onEffectRequest` fork and needs an `@effect/rpc`-level fix (likely how
  `makeServicesFromRpc`/`runServiceCall` supply the runtime for forked requests).
- [ ] Add streaming round-trip test over `ClientRpcServer` + `makeClientServicesRpc` (QueryService/DataService-style).
- [x] Re-bridge iframe/extension consumers (shell, devtools panel, devtools-extension sandbox) onto
  the `MessagePort` proxy via a `MessageChannel` relayed over `window.postMessage` (structured clone
  keeps protocol frames intact). The host-side Worker-protocol bridge (the other end of these
  relays) is still a follow-up — the connections type-check and build but carry no live traffic yet.
- [x] Commit Phase A (build green; the suite-1 test fix above is the sole open item).

---

## Phase B — Define Bridge/Worker effect-rpc groups

**Status: not started. Do not run full generator against uncommitted inline-schema services.**

Extend `gen-service-rpcs.ts` with a **separate, targeted** generation path (or manual files) so existing `*Service.ts` WIP is not overwritten:

- **WorkerService** (`dxos.iframe.WorkerService`): `start(StartRequest)→void`, `stop→void`.
- **BridgeService** (`dxos.mesh.bridge.BridgeService`): `open→stream BridgeEvent`, `sendSignal`, `sendData`, `close`, `getDetails`, `getStats`.

Output: `packages/core/protocols/src/WorkerService.ts`, `BridgeService.ts` with `.Rpcs` / `.Handlers` / `.Client`, exported from `@dxos/protocols/rpc`. Reuse `protoMessage(fqn)`.

**Blocker resolved elsewhere:** `echo-host` build currently fails on `FeedService.Handlers` vs impl payload types (`readonly string[]` vs `string[]`) from inline schema services — fix before `client:build` / full CI.

---

## Phase C — System port to duplex effect-rpc (2 channels total)

**Status: not started.**

- Worker app runner serves merged group = `ClientServicesRpcs ∪ WorkerService.Rpcs`; `WorkerService.start/stop` in `WorkerSession` drives `_startTrigger`, `origin`/`lockKey`.
- Repurpose `systemChannel` → `bridgeChannel` (flipped roles): worker = `BrowserWorker.layerPlatform` (`BridgeService` client → `RtcTransportProxyFactory`); tab = `BrowserWorkerRunner` serving `BridgeService.Handlers` (`RtcTransportService`).
- `shared-worker-connection.ts`: replace `createProtoRpcPeer` with app-client `WorkerService.start` + tab-side `BridgeService` runner.
- `worker-session.ts`: remove `_iframeRpc`; `bridgeService` from `BridgeService.Client` over `bridgePort`.
- `createSession({ appPort, bridgePort })` across `worker-runtime`, `onconnect`, `dedicated-worker`, `test-worker-factory`, worker-framework message types.

---

## Phase D — Cleanup

**Status: not started.**

- Remove `makeProtocolRpcPortClient` / `layerProtocolRpcPort*` from `@dxos/rpc/effect-rpc` if no consumers remain (verify first).
- Retire `createWorkerPort` where fully replaced (keep for OPFS worker).
- `createLinkedPorts` only where system proto peer tests still need it.

**Out of scope (stay protobuf):** shell/iframe — `client.ts` shellClientProxy, `shell-manager.ts`, `shell-runtime.ts`.

---

## Risks to validate

| Risk                                          | Phase A status                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Streaming over `layerProtocolWorkerRunner`    | Not validated in suite 1; suite 2/3 pass (direct BrowserWorker tests).                       |
| Init race (no Ping/Pong)                      | Failing tests suggest lifecycle/timing issue; needs explicit reconnect/steal test after fix. |
| Transferables (`supportsTransferables: true`) | Not exercised; optional Automerge perf win.                                                  |
| `MessageChannel` + structured clone in vitest | Suite 2/3 OK; suite 1 broken after harness switch.                                           |
| Devtools extension / shell iframe             | Consumers bridged onto `MessagePort` (builds); host-side Worker-protocol window bridge still a follow-up. |
| Service definition regeneration               | **High** — do not run full `gen-service-rpcs.ts` against WIP inline schemas.                 |

---

## Verification

### Current results (2026-07-10, after main merge)

| Command                                                            | Result                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `moon exec --on-failure continue :build` (whole workspace)         | ✅ Pass                                                                          |
| `moon run worker-framework:build`                                  | ✅ Pass                                                                          |
| `moon run protocols:compile` / `client-protocol:build`             | ✅ Pass (echo-host `readonly` mismatch fixed via schema realignment)             |
| `moon run echo-host:build` / `client-services:build` / `client:build` | ✅ Pass                                                                       |
| `moon run protocols:test` / `worker-framework:test`                | ✅ Pass                                                                          |
| `moon run client-services:test -- effect-rpc.test.ts`              | ❌ 8/10 suite-1 tests fail (`RpcClosedError`); suite 2/3 pass (see remaining work) |

### Target (Phase A complete)

```bash
moon run worker-framework:build
moon run client-protocol:build
moon run client:build
moon run client-services:test -- src/packlets/services/effect-rpc.test.ts
moon run client:test -- src/services/dedicated/dedicated-worker-client-services.test.ts
moon run client-e2e:test -- src/shared-worker.test.ts   # if applicable
moon run :lint -- --fix
# audit: git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'
```

### Target (full migration)

Add after Phase B/C:

```bash
moon run protocols:build
moon run rpc:build
```

---

## Modified files (uncommitted on `dm/worker-package`)

```text
packages/sdk/worker-framework/package.json
packages/sdk/worker-framework/src/internal/rpc.ts
packages/sdk/worker-framework/tsconfig.json
packages/sdk/client-protocol/src/service-rpc.ts
packages/sdk/client-services/src/packlets/worker/worker-session.ts
packages/sdk/client-services/src/packlets/worker/worker-runtime.ts
packages/sdk/client-services/src/packlets/services/effect-rpc.test.ts
packages/sdk/client/src/services/service-proxy.ts
packages/sdk/client/src/services/worker-client-services.ts
packages/sdk/client/src/services/dedicated/dedicated-worker-client-services.ts
packages/sdk/client/src/services/dedicated/dedicated-worker.ts
packages/sdk/client/src/testing/test-worker-factory.ts
packages/sdk/client/src/testing/test-builder.ts
packages/sdk/client/src/worker/onconnect.ts
packages/sdk/client/src/devtools/devtools.ts
packages/sdk/client-e2e/src/shared-worker.test.ts
pnpm-lock.yaml
plans/worker-package/rpc-effect.md
```

**Not modified (protocols / Phase B):** `gen-service-rpcs.ts`, `WorkerService.ts`, `BridgeService.ts`, `shared-worker-connection.ts`.
