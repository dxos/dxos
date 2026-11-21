# Delete legacy Function{Invocation,Execution}Service + ServiceContainer — Deletion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the deprecated local/remote function-execution machinery in `@dxos/compute-runtime` now that operation invocation — including local-vs-edge dispatch — is unified behind `Operation.Service` (`ProcessOperationInvoker`). Every operation runs through the process runtime; edge dispatch is selected per-invocation via `InvokeOptions.on === 'edge'` and keyed by `meta.deployedId`, routed to `RemoteOperationInvoker.Service`.

**Precondition (already landed):** `ProcessOperationInvoker` dispatches `{ on: 'edge' }` invocations to `RemoteOperationInvoker.Service` (optional, resolved via `Effect.serviceOption`; edge invocations die if unconfigured or if the op has no `deployedId`). `ProcessManager` deliberately knows nothing about the remote invoker — dispatch lives only in the operation invoker. See `ProcessOperationInvoker.ts` and the `ProcessOperationInvoker edge dispatch` tests in `ProcessManager.test.ts`.

## Global constraints

- **No compat shims / re-exports.** Every call site is repointed in the same task that deletes the symbol (CLAUDE.md non-negotiable).
- **No casts to silence the type-checker** (`as any`, `as unknown as T`, `!`).
- **Test after every task:** `moon run <pkg>:build`, and `:test` where logic changed. Full sweep before the final task: `moon exec --on-failure continue --quiet :build`.
- Ignore the `Auth token DEPOT_TOKEN does not exist` remote-cache warning.
- Commit messages: `scope: description` (scope `compute-runtime`, or the touched consumer package).

---

## Deletion targets (all in `@dxos/compute-runtime`)

| Symbol                                                                                                        | File                                              | Notes                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `FunctionInvocationService` (tag)                                                                             | `src/services/function-invocation-service.ts`     | Deprecated; only `layerNotAvailable` + static helpers remain.                                    |
| `FunctionInvocationServiceLayer`, `FunctionInvocationServiceLayerWithLocalLoopbackExecutor`                   | `src/services/function-invocation-router.ts`      | Local↔remote router; superseded by `ProcessOperationInvoker` edge dispatch.                      |
| (test)                                                                                                        | `src/services/function-invocation-router.test.ts` | Delete with the router.                                                                          |
| `LocalFunctionExecutionService`, `FunctionImplementationResolver`                                             | `src/services/local-function-execution.ts`        | Local executor + `@deprecated` resolver.                                                         |
| `ServiceContainer`, `RuntimeServices`, `ServiceRecord`, `ServiceTagRecord`, `SERVICE_TAGS`, `SERVICE_MAPPING` | `src/services/service-container.ts`               | Legacy imperative service bag; `@deprecated Use Effect layers directly`.                         |
| `FunctionExecutor`                                                                                            | `src/executor.ts`                                 | `@deprecated Use FunctionInvocationService`; wraps `ServiceContainer.createLayer()`.             |
| `FunctionServices` (union)                                                                                    | `src/sdk.ts`                                      | Remove the `FunctionInvocationService` arm; then evaluate deleting the whole alias (see Task 5). |

### Explicitly OUT of scope (do NOT delete — same/similar names, different things)

- `ServiceRegistry` — `src/services/service-registry.ts` (a live `Context.Tag`, unrelated). **Keep.**
- `@dxos/functions-runtime-cloudflare/src/internal/service-container.ts` — a _different_ `ServiceContainer` (Cloudflare worker env bag). **Keep.**
- `RemoteOperationInvoker` / `EdgeOperationInvoker` — the replacement. **Keep.**
- `RemoteFunctionExecutionService` — already gone (only referenced in comments); nothing to do.

---

## Consumer migration inventory

Each consumer must be repointed off the deleted symbols before/with deletion.

1. **`src/protocol.ts` (compute-runtime, EDGE cloudflare invocation path)**
   - `FunctionContext.createLayer()` returns `Layer.Layer<FunctionServices>` and merges `FunctionInvocationService.layerNotAvailable` (lines ~225–238).
   - `FunctionServices`-typed handler effect at ~109.
   - **Migration:** drop the `FunctionInvocationService.layerNotAvailable` arm; narrow `createLayer()`'s return and the handler effect to the trimmed service set. Handlers already get remote invocation via `makeOperationServiceLayer` (`Operation.Service` backed by the EDGE `FunctionsService`), so no behavior is lost.

2. **`src/services/local-function-execution.ts`** — self-referential (`FunctionServices`, `FunctionInvocationService`). Deleted wholesale in Task 3.

3. **`plugin-doctor/src/diagnostics/providers/operations.ts`**
   - `KNOWN_SERVICES` whitelist includes `FunctionInvocationService.key` (import from `@dxos/compute-runtime`).
   - **Migration:** remove `FunctionInvocationService` from the set (and its import). `Operation.Service` is already whitelisted, which is the modern equivalent.

4. **`plugin-transcription` — `normalization/normalization.test.ts` + `normalization/message-normalizer.ts`**
   - `message-normalizer.ts` takes a `FunctionExecutor`; the test builds `new FunctionExecutor(new ServiceContainer().setServices({...}))`.
   - **Migration:** replace `FunctionExecutor` with invocation through `Operation.Service` / the `ProcessOperationInvoker` layer (or a minimal Effect layer providing the handler's declared services). Update `MessageNormalizer` to depend on the invoker rather than `FunctionExecutor`.

5. **`edge-compute/src/testing/services.ts`** — `createTestServices(): ServiceContainer`.
   - **Migration:** rewrite the test helper to return composed Effect `Layer`s (credentials/database/trace) instead of a `ServiceContainer`. Update its consumers (test-only).

6. **`conductor/src/nodes/gpt/gpt.test.ts`** — builds a `ServiceContainer`, calls `services.createLayer()`.
   - **Migration:** provide the equivalent Effect layers directly (`Database.layer`, credentials, trace, `Operation.Service`) via `Effect.provide`.

7. **`devtools/cli` — `util/trigger-runtime.ts` + `commands/chat/processor.ts`** — `FunctionImplementationResolver.layerTest({ functions })`.
   - **Migration:** the resolver only mapped an `OperationHandlerSet` to a per-key lookup for the local executor. Replace with `OperationHandlerSet.provide(functions)` feeding the `ProcessOperationInvoker` / `Operation.Service` runtime already used elsewhere in the CLI.

8. **`plugin-assistant/src/skills/assistant/skill.ts`** — comment reference only (`LocalFunctionExecutionService`). Update the comment; no code change.

9. **Barrels** — `src/services/index.ts` (exports `function-invocation-service`, `function-invocation-router`, `local-function-execution`, `service-container`) and `src/index.ts` (`export * from './executor'`). Remove the corresponding lines.

---

## Phase 1 — Repoint consumers off the deleted symbols

No deletions yet; make every consumer stop importing the doomed symbols so Phase 2/3 deletes compile cleanly.

### Task 1.1: plugin-doctor whitelist

- [ ] Remove `FunctionInvocationService` from `KNOWN_SERVICES` and its import in `plugin-doctor/src/diagnostics/providers/operations.ts`.
- [ ] `moon run plugin-doctor:build` → success.
- [ ] Commit: `plugin-doctor: drop FunctionInvocationService from operation service whitelist`.

### Task 1.2: EDGE invocation protocol

- [ ] In `compute-runtime/src/protocol.ts`, remove the `FunctionInvocationService.layerNotAvailable` arm from `FunctionContext.createLayer()` and narrow the return type; update the `FunctionServices`-typed handler effect to the trimmed set.
- [ ] `moon run compute-runtime:build` → success; `moon run functions-runtime-cloudflare:build` → success (wrapper consumes this path).
- [ ] Commit: `compute-runtime: stop providing FunctionInvocationService in EDGE function context`.

### Task 1.3: transcription normalizer

- [ ] Rewrite `message-normalizer.ts` to invoke via `Operation.Service` (inject the invoker) instead of `FunctionExecutor`.
- [ ] Update `normalization.test.ts` to build the invoker/layers instead of `FunctionExecutor` + `ServiceContainer`.
- [ ] `moon run plugin-transcription:build && moon run plugin-transcription:test -- src/normalization/normalization.test.ts` → PASS.
- [ ] Commit: `plugin-transcription: invoke normalization via Operation.Service`.

### Task 1.4: devtools CLI resolver

- [ ] Replace `FunctionImplementationResolver.layerTest(...)` in `trigger-runtime.ts` and `chat/processor.ts` with `OperationHandlerSet.provide(...)` + the process invoker runtime.
- [ ] `moon run cli:build` → success (and any CLI smoke test that exercises chat/trigger).
- [ ] Commit: `cli: resolve operations via OperationHandlerSet instead of FunctionImplementationResolver`.

### Task 1.5: edge-compute + conductor test helpers

- [ ] Rewrite `edge-compute/src/testing/services.ts` `createTestServices` to return composed Effect layers; update its importers.
- [ ] Rewrite `conductor/src/nodes/gpt/gpt.test.ts` to `Effect.provide` layers directly.
- [ ] `moon run edge-compute:build && moon run conductor:build && moon run conductor:test -- src/nodes/gpt/gpt.test.ts` → PASS.
- [ ] Commit: `edge-compute,conductor: replace ServiceContainer test helpers with Effect layers`.

### Task 1.6: comment-only reference

- [ ] Update the stale `LocalFunctionExecutionService` comment in `plugin-assistant/src/skills/assistant/skill.ts`.
- [ ] Commit (fold into 1.4/1.5 if trivial).

---

## Phase 2 — Delete `ServiceContainer` + `FunctionExecutor`

### Task 2.1: remove `FunctionExecutor`

- [ ] Delete `compute-runtime/src/executor.ts`; remove `export * from './executor'` from `src/index.ts`.
- [ ] Confirm no importers remain: `rg -n "FunctionExecutor" packages --glob '*.ts'` → empty.
- [ ] `moon run compute-runtime:build` → success.

### Task 2.2: remove `ServiceContainer`

- [ ] Delete `compute-runtime/src/services/service-container.ts`; remove `export * from './service-container'` from `src/services/index.ts`.
- [ ] Confirm no importers of `ServiceContainer`/`RuntimeServices`/`ServiceRecord` from `@dxos/compute-runtime` remain (mind the Cloudflare same-name class — that one stays).
- [ ] `moon run compute-runtime:build` → success.
- [ ] Commit: `compute-runtime: delete legacy ServiceContainer and FunctionExecutor`.

---

## Phase 3 — Delete the function-invocation/execution services

### Task 3.1: remove router + local execution + tag

- [ ] Delete `function-invocation-router.ts` (+ `.test.ts`), `local-function-execution.ts`, `function-invocation-service.ts`.
- [ ] Remove their lines from `src/services/index.ts`.
- [ ] `rg -n "FunctionInvocationService|LocalFunctionExecutionService|FunctionImplementationResolver|FunctionInvocationServiceLayer" packages --glob '*.ts'` → empty.
- [ ] `moon run compute-runtime:build` → success.
- [ ] Commit: `compute-runtime: delete FunctionInvocationService and Local function execution`.

---

## Phase 4 — Simplify `FunctionServices`

### Task 4.1: trim / remove the union

- [ ] In `sdk.ts`, remove the `FunctionInvocationService` arm from `FunctionServices` (import now gone). If the remaining consumers (`protocol.ts` after Task 1.2) can express their requirements directly with `AiService | Credential | Database | Trace | Operation.Service`, delete the `FunctionServices` alias entirely and inline it; otherwise keep the trimmed alias.
- [ ] `moon run compute-runtime:build` → success.
- [ ] Commit: `compute-runtime: drop FunctionInvocationService from FunctionServices`.

---

## Phase 5 — Full sweep + changeset

### Task 5.1: repo-wide verification

- [ ] `moon exec --on-failure continue --quiet :build` → resolve any dangling import.
- [ ] `MOON_CONCURRENCY=4 moon run compute-runtime:test edge-compute:test conductor:test plugin-transcription:test -- --no-file-parallelism` → PASS.
- [ ] `moon run :lint -- --fix && pnpm format`.
- [ ] No-cast audit on touched files: `rg -n " as any| as unknown as |!\." packages/core/compute/compute-runtime/src` → nothing new introduced by this change.

### Task 5.2: changeset

- [ ] Add `.changeset/*.md` (bump `@dxos/compute-runtime` minor) noting the breaking removal of `FunctionInvocationService`, `LocalFunctionExecutionService`, `FunctionImplementationResolver`, `ServiceContainer`, and `FunctionExecutor`; direct consumers to `Operation.Service` (with `{ on: 'edge' }` for edge dispatch).

---

## Risks / notes

- **EDGE path parity.** Task 1.2 removes `FunctionInvocationService.layerNotAvailable` from the Cloudflare `FunctionContext`. Any deployed operation handler still `yield*`-ing `FunctionInvocationService` would previously have _died at invocation time_ anyway; after deletion it becomes a _type_ error at build. Grep operation handlers for `FunctionInvocationService` before deleting (Phase 1 confirms none in-repo).
- **Two `ServiceContainer`s.** Do not touch `@dxos/functions-runtime-cloudflare`'s `ServiceContainer`; only the `@dxos/compute-runtime` one is deprecated.
- **Test helpers were the main consumers.** Most remaining usage is in tests (`normalization.test.ts`, `gpt.test.ts`, `edge-compute/testing`) and the CLI; production wiring already runs through `ProcessOperationInvoker` / `Operation.Service`.
- **Follow-up (not in this plan): real per-space Edge wiring into the app runtime.** `ProcessOperationInvoker.layer` resolves `RemoteOperationInvoker.Service` optionally; `app-framework`'s process-manager runtime currently has no `RemoteOperationInvoker` in context (space-agnostic), while `plugin-routine` provides `EdgeOperationInvoker` at _space_ affinity in the LayerStack. Bridging the space-scoped Edge invoker into the runtime that backs `Capabilities.OperationInvoker` is what makes `{ on: 'edge' }` actually reach EDGE in the app, and should be tracked separately.

```

```
