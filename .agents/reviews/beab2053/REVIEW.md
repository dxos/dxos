---
branch: claude/structured-review-issues-ao3cdn
commit: beab2053bfe815b6179ba22b50c189e6049c0bec
base: 4e417e9d43095c89306c5194d3ce2730e356168c
mode: default
createdAt: 2026-08-18T09:19:28.062Z
isFinalized: true
groups: 20
rules: [no-casts, no-compat-shims, no-echo-internal-in-sdk, no-sleep-in-test, private-new-packages]
reviewId: beab2053
---

_167 error(s), 23 warning(s)._

# ERROR beab2053-1 no-casts `packages/apps/composer-app/src/main.tsx:114`

`const importMeta = import.meta as any;` casts away `ImportMeta`'s type to reach `.hot` for dev-only HMR bookkeeping. Fix at the source per `no-casts`: declare an `ImportMeta.hot?: { dispose(cb: () => void) }` augmentation (or import Vite's `ImportMetaHot` type) instead of widening to `any`.

# ERROR beab2053-2 no-casts `packages/apps/composer-app/src/main.tsx:238`

`(window as any).composer = { profiler, otel };` suppresses the type checker to attach a debug global. Fix per `no-casts`: extend the `Window`/`globalThis` interface (as the file already does a few lines above for other debug hooks) instead of casting to `any`.

# ERROR beab2053-3 no-casts `packages/apps/composer-app/src/main.tsx:600`

`const root = document.getElementById('root')!;` is a non-null assertion on a DOM lookup that can genuinely return `null`. Fix per `no-casts`: check for `null` and throw/render the fatal fallback explicitly instead of asserting.

# ERROR beab2053-4 no-casts `packages/apps/composer-app/vite.config.ts:639`

`function chunkFileNames(chunkInfo: any)` widens the Rollup/Rolldown chunk-info parameter to `any` (and the derived `let segments: any[] = …` on line 641 inherits the same untyped shape). Fix per `no-casts`: type the parameter as Rollup's `PreRenderedChunk` (or the Rolldown equivalent) instead of `any`.

# ERROR beab2053-5 no-casts `packages/common/codec-protobuf/src/service.ts:32`

`Schema<any>` is a widened-`any` generic argument in the `ServiceDescriptor` constructor signature (repeated identically in `Service`'s constructor at line 56 and `ServiceHandler`'s at line 110). Fix per `no-casts`: give `Schema` a concrete or `unknown`-erased default so callers don't need to write `any` at every constructor boundary.

# ERROR beab2053-6 no-casts `packages/common/codec-protobuf/src/service.ts:69`

`(this as any)[methodName] = …` casts `this` to `any` to attach a dynamically-named RPC method (repeated at lines 82 and 97). Fix per `no-casts`: type `this` as an index-signature record (e.g. `(this as Record<string, unknown>)[methodName]`) instead of `any`, or build the method map on a plain object before assigning it via `Object.assign`.

# ERROR beab2053-7 no-casts `packages/common/codec-protobuf/src/service.ts:75`

`method.resolvedRequestType!.fullName` re-asserts non-null on a value the preceding `invariant(method.resolvedRequestType)` already checked (same pattern at lines 88, 132, 153) — the narrowing is lost because the value is read again inside a later closure. Fix per `no-casts`: capture `const requestType = method.resolvedRequestType;` right after the `invariant` call and reference `requestType` inside the closures, so no `!` is needed.

# ERROR beab2053-8 no-casts `packages/common/codec-protobuf/src/service.ts:126`

`request.value!` (repeated at line 147) asserts non-null on `Any.value` without checking it. Fix per `no-casts`: make the check explicit (throw a descriptive error, or make `value` non-optional on `Any` if it is always present by construction).

# ERROR beab2053-9 no-casts `packages/common/codec-protobuf/src/service.ts:161`

`return (handler as any).bind(service);` casts the resolved handler to `any` before binding. Fix per `no-casts`: type `handler` as `(...args: unknown[]) => unknown` (matching `_getHandler`'s declared return) instead of casting to `any`.

# ERROR beab2053-10 no-casts `packages/common/log/src/environment.ts:18`

`const cryptoRef = (globalThis as any).crypto as Crypto | undefined;` is a double cast through `any` to reach an untyped global — the same escape hatch `as unknown as T` names, just routed through `any` instead of `unknown`. Fix per `no-casts`: check `'crypto' in globalThis` and type the lookup as `(globalThis as { crypto?: Crypto }).crypto`, or declare the ambient global directly.

# ERROR beab2053-11 no-casts `packages/common/log/src/environment.ts:58`

`const ctor = (scope as any)?.[ctorName];` casts the `unknown`-typed `scope` parameter to `any` for a dynamic property lookup. Fix per `no-casts`: use `(scope as Record<string, unknown> | null | undefined)?.[ctorName]` so the result stays `unknown` rather than `any`.

# ERROR beab2053-12 no-casts `packages/common/log/src/environment.ts:108`

`const computeEnvironmentName = (scope: any): string => {` widens its parameter to `any`, even though the function only ever reads a handful of known optional properties (`navigator`, `window`, `process`, `location`, `sessionStorage`). Fix per `no-casts`: declare a narrow structural type for the properties actually accessed instead of `any`.

# ERROR beab2053-13 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:175`

`sqlite3.vfs_register(vfs as any, false);` casts the constructed VFS to `any` to satisfy `wa-sqlite`'s loose typing. Fix per `no-casts`: define a minimal local interface for the VFS shape `vfs_register` expects and cast to that instead of `any`.

# ERROR beab2053-14 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:214`

`sqlite3.bind_collection(stmt, params as any);` (repeated at line 262) casts bind params to `any` to work around `wa-sqlite`'s `SQLiteCompatibleType[]`-only typing. Fix per `no-casts`: narrow/convert `params` to `SQLiteCompatibleType[]` (or a typed adapter) instead of `any`.

# ERROR beab2053-15 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:220`

`columns!.length` / `columns![index]` (repeated at lines 221, 267, 268) assert non-null on a `let columns: Array<string> | undefined` that was just assigned on the previous line via `columns = columns ?? sqlite3.column_names(stmt);`. Fix per `no-casts`: capture the assignment's result into a new `const` (e.g. `const cols = (columns ??= sqlite3.column_names(stmt));`) so TypeScript narrows it without `!`.

# ERROR beab2053-16 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:355`

`) as unknown as WasmSqliteClient.SqliteClient;` is the double-cast escape hatch the rule names explicitly, bridging `Object.assign`'s widened return to the branded client type. Fix per `no-casts`: type the `Object.assign` call's target object literal so its shape already matches `SqliteClient` minus the incompatible `updateValues` member, narrowing only that one field instead of casting the whole result.

# ERROR beab2053-17 no-casts `packages/core/compute/ai/src/OpaqueToolkit.ts:59`

The `Any` interface types `toolkit`, `layer`, and `handlers` as `Toolkit.Toolkit<any>` / `Layer.Layer<unknown, any, any>` / `Effect.Effect<Toolkit.WithHandler<any>, any, any>` (lines 59-61); `OpaqueTools`'s `Schema.Codec<any, any>` fields at lines 179-180 are the same widened-`any` pattern. Fix per `no-casts`: parameterize with `unknown` where the value is genuinely unconstrained, reserving `any` for none of these positions.

# ERROR beab2053-18 no-casts `packages/core/compute/ai/src/OpaqueToolkit.ts:84`

`}) as any;` at the end of `make` casts the constructed object to `any` to fit the return type `OpaqueToolkit<...>`. Fix per `no-casts`: type the object literal to match `OpaqueToolkit`'s shape directly (the compiler should accept it without a cast once the literal's `toolkit`/`layer`/`handlers` fields line up).

# ERROR beab2053-19 no-casts `packages/core/compute/ai/src/OpaqueToolkit.ts:116`

`= function (...args: any[]) {` widens the `provide` overload implementation's rest parameter to `any[]`, and the function itself is cast `as any` on line 122 to satisfy the declared overload signature. Fix per `no-casts`: type the implementation signature to the union of the two overloads' parameter lists instead of `any[]`/`as any`.

# ERROR beab2053-20 no-casts `packages/core/compute/ai/src/OpaqueToolkit.ts:128`

`Layer.provide(self.layer, layer as any)` and the following `make(self.toolkit as any, provided as any) as any` (line 129) chain four `as any` casts through `provideImpl`. Fix per `no-casts`: introduce a local generic helper typed against `Layer.Layer<unknown, unknown, unknown>` so the erasure happens once, explicitly, rather than at each call site.

# ERROR beab2053-21 no-casts `packages/core/compute/ai/src/OpaqueToolkit.ts:155`

`return empty as unknown as OpaqueToolkit<...>` in `merge`'s zero-argument branch (and the equivalent cast at line 164, plus `toolkits.map((t) => t.layer) as [any, ...any[]]` at line 163) are double-cast escape hatches bridging the erased `Any` toolkits back to the precise merged type. Fix per `no-casts`: give `merge` an explicit return-type assertion function (a single named helper) rather than inline `as unknown as`/`as any` at each return point.

# ERROR beab2053-22 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:101`

`capture: (body: any) => void` widens the callback parameter to `any` in `captureRequestBody`'s signature. Fix per `no-casts`: type it as `(body: unknown) => void` and let call sites narrow the parsed JSON as needed.

# ERROR beab2053-23 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:157`

`body.messages.find((message: any) => message.role === 'assistant')` widens the `find` callback's parameter to `any` (repeated identically at line 171). Fix per `no-casts`: give `body` a minimal local interface (e.g. `{ messages: Array<{ role: string; tool_calls?: ... }> }`) instead of typing the callback parameter as `any`.

# ERROR beab2053-24 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.ts:426`

`Tool.getDescription(tool as any)` and `Tool.getJsonSchema(tool as any)` (line 427) cast the already-erased `Tool.Any` value to `any` to satisfy these two helpers. Fix per `no-casts`: adjust `toolsToRequest`'s loop variable type (or the helpers' parameter types) so `Tool.Any` is accepted directly.

# ERROR beab2053-25 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:133`

`readonly rpc: RpcClient.RpcClient<any>;` widens the RPC client field to `any` (the constructor parameter at line 184 repeats the same widened type). Fix per `no-casts`: type the field against the class's own `R`/RPC type parameter, introducing a dedicated invariant-safe wrapper type if `RpcClient`'s variance genuinely blocks it, rather than `any`.

# ERROR beab2053-26 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:388`

`const defWithSchema = definition as unknown as { input: Schema.Codec<I, unknown, never> };` is the double-cast escape hatch, used to reach into `definition`'s runtime-only `input` schema. Fix per `no-casts`: give `Process.Process` a typed (even if narrow/internal) accessor for its input codec instead of casting through `unknown`.

# ERROR beab2053-27 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:63`

`makeLoopbackRpcClient`'s parameters `rpcs: RpcGroup.RpcGroup<any>` / `rpcHandlers: Context.Context<any>` and its return type `Effect.Effect<RpcClient.RpcClient<any>>` (line 66) all widen to `any`, and `EMPTY_RPC_CLIENT`'s declared type (line 75) plus the `as unknown as RpcGroup.RpcGroup<any>` / `as Context.Context<any>` casts feeding it (lines 79-80) compound the same pattern. Fix per `no-casts`: introduce one dedicated "erased RPC surface" type alias (documented once) instead of repeating `any` at every one of these sites.

# ERROR beab2053-28 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:168`

`hydrate(definition: Process.Process<_Input, _Output, any, any>): …` widens two of `Process.Process`'s type parameters to `any` in the public `Handle` interface. Fix per `no-casts`: use `unknown` for the erased positions, or thread the interface's own `_Requirements`/`_Rpcs` parameters through instead of `any`.

# ERROR beab2053-29 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:176`

`export type Any = Handle<any, any, any>;` widens all three of `Handle`'s type parameters to `any`. Fix per `no-casts`: use `unknown` in place of `any` for the erased-type alias, consistent with how `Any` types are erased elsewhere in the codebase.

# ERROR beab2053-30 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:611`

`Effect.provide(fullCtx as Context.Context<any>)` casts the merged context to `any` (the identical cast recurs at line 820). Fix per `no-casts`: type `fullCtx` so it already satisfies whatever `definition.create`'s requirement type is, instead of widening at the call site.

# ERROR beab2053-31 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:644`

`const defRaw = definition as unknown as { input: Schema.Codec<I, any, never> };` is the double-cast escape hatch (the equivalent cast recurs at line 847 with `Schema.Codec<any, any, never>`), reaching into `definition`'s runtime-only input schema. Fix per `no-casts`: expose a typed accessor for the input codec on `Process.Process` instead of casting through `unknown` at each call site.

# ERROR beab2053-32 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:709`

`return handle as unknown as Handle<I, O, _Rpcs>;` is the double-cast escape hatch bridging the untyped internal handle to the public `Handle` type (repeated identically at lines 910, 935, and 947). Fix per `no-casts`: give `ProcessHandleImpl` a typed `asHandle<Rpcs>()` method that performs the narrowing once, in one documented place, instead of casting at every call site.

# ERROR beab2053-33 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:760`

`submitOutput: (output: any) => {` widens this callback parameter to `any`. Fix per `no-casts`: type it as `O` (the process's declared output type) or `unknown` if genuinely erased at this point.

# ERROR beab2053-34 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:848`

`const encodeInput = (input: any): Effect.Effect<unknown> =>` widens the parameter to `any`. Fix per `no-casts`: type it as `unknown`, matching the function's own `Effect.Effect<unknown>` return.

# ERROR beab2053-35 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:1036`

`readonly rpc: RpcClient.RpcClient<any> = EMPTY_RPC_CLIENT;` on `DormantHandle` widens the RPC client field to `any`, mirroring the same pattern flagged at `ProcessHandle.ts:133`. Fix per `no-casts`: share one erased-RPC-surface type instead of repeating `any` on every implementing class.

# ERROR beab2053-36 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:59`

`return dbService as any;` casts the test double to `any`. Fix per `no-casts`: type the stub so it structurally matches the service interface the caller expects, instead of erasing it with `any`.

# ERROR beab2053-37 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:475`

`runnable: Ref.make(badFn) as any,` casts a deliberately-malformed test fixture to `any` (repeated identically at line 1321). Fix per `no-casts`: give the fixture object a type that matches the `runnable` field's declared shape (even if the function body itself is intentionally broken) instead of casting the whole `Ref` to `any`.

# WARN beab2053-38 no-sleep-in-test `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:631`

This is a busy-poll loop: up to 100 iterations of checking `registry.get(dispatcher.state)` with `yield* Effect.sleep(Duration.millis(20))` between attempts (worst case 2s of polling). The adjoining comment justifies using real time over `TestClock` because the reactive path is woken by a real subscription, but that only excuses the wall-clock requirement, not the hand-rolled poll loop itself — per the rule, prefer a `Trigger`/`Deferred` resolved from a subscription callback on the atom (or an equivalent "wake on change" mechanism) instead of a fixed-interval `Effect.sleep` retry loop.

# ERROR beab2053-39 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1135`

`Scope.feed(Feed.getFeedUri(feed)!)` asserts `getFeedUri`'s result non-null (repeated at lines 1162, 1195, 1226). Fix per `no-casts`: assert/require the URI up front (e.g. `invariant(uri)`) once, and reuse the narrowed local instead of asserting at each call site.

# ERROR beab2053-40 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1145`

`const kind = spec!.kind as 'feed' | 'subscription';` asserts `spec` non-null before reading `.kind`. Fix per `no-casts`: check `spec` explicitly (e.g. `invariant(spec, …)`) before this line instead of asserting with `!`.

# ERROR beab2053-41 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1222`

`private _prepareInputData = (trigger: Trigger.Trigger, event: TriggerEvent.TriggerEvent): any => {` widens the method's return type to `any`. Fix per `no-casts`: give it a concrete union/return type describing the shapes it actually produces instead of `any`.

# ERROR beab2053-42 no-casts `packages/core/compute/compute/src/Operation.ts:185`

`}) as any;` casts `lazyHandler`'s implementation to `any` to satisfy its declared overload signature. Fix per `no-casts`: type the implementation signature as the union of the two declared overloads instead of casting the whole function to `any`.

# ERROR beab2053-43 no-casts `packages/core/compute/compute/src/Operation.ts:233`

`} as any;` casts the constructed definition object to `any` in `make`. Fix per `no-casts`: shape the returned object literal to satisfy the declared `Definition<...>` return type directly.

# ERROR beab2053-44 no-casts `packages/core/compute/compute/src/Operation.ts:285`

`})) as any;` in `withHandler`'s piped branch (and `} as any;` in its direct-call branch at line 293) cast the constructed object to `any`. Fix per `no-casts`: type both returned object literals against `WithHandler<Def>` instead of casting.

# ERROR beab2053-45 no-casts `packages/core/compute/compute/src/Operation.ts:828`

`invoke: ((op: Operation.Definition.Any, input: any, invocationOptions: InvokeOptions) => …) as any,` widens `input` to `any` and then casts the whole arrow function to `any` (the identical pattern recurs for `invokePromise` at line 830 and `schedule` at line 832). Fix per `no-casts`: type `input` as `unknown` and give `Service.of`'s argument a shape that matches `Service`'s declared members without the outer `as any`.

# ERROR beab2053-46 no-casts `packages/core/compute/compute/src/Operation.ts:875`

`source: from.source as any,` casts the migrated `source` ref to `any`. Fix per `no-casts`: type it against the target schema's `source` field (a `Ref` to `Obj.Unknown`) instead of `any`.

# ERROR beab2053-47 no-casts `packages/core/compute/compute/src/Process.ts:243`

`readonly rpcs: RpcGroup.RpcGroup<any>;` widens the field to `any` on the `Process` interface (repeated on `MakeProcessOpts.rpcs` at line 281). Fix per `no-casts`: if `RpcGroup`'s invariance genuinely blocks referencing `_Rpcs` here (as the adjacent comment explains), introduce one named erased-RPC type instead of writing `any` at each field.

# ERROR beab2053-48 no-casts `packages/core/compute/compute/src/Process.ts:308`

`[ProcessTypeId]: {} as any,` casts the phantom variance marker to `any`. Fix per `no-casts`: type the object literal to match `Variance<...>`'s declared shape (or use a typed helper that constructs the phantom marker) instead of `any`.

# ERROR beab2053-49 no-casts `packages/core/compute/compute/src/Process.ts:331`

`): Context.Context<any> => {` widens `sanitizeRpcs`'s return type to `any`, and the `Context.empty() as Context.Context<any>` cast on line 337 repeats the same widening. Fix per `no-casts`: return `Context.Context<unknown>` instead of `any`.

# ERROR beab2053-50 no-casts `packages/core/compute/link/src/Cursor.test.ts:344`

`expect([...Cursor.readTagHeads(cursor)!]).toEqual(...)` asserts the spread result non-null (repeated identically at lines 348, 358, 362, 373). Fix per `no-casts`: give `readTagHeads` a return type that doesn't require the caller to assert (e.g. always return an iterable, never `undefined`), or check for `undefined` explicitly in the test helper.

# ERROR beab2053-51 no-casts `packages/core/compute/link/src/Cursor.test.ts:433`

`expect([...state.foreignIndex!.keys()].sort())` asserts `foreignIndex` non-null (repeated at lines 435, 436). Fix per `no-casts`: narrow `state` once via a helper/invariant before these assertions instead of repeating `!`.

# ERROR beab2053-52 private-new-packages `packages/core/compute/mcp-server/package.json:1`

This `package.json` is newly added in this change (git diff-filter=A confirms it did not exist at the base commit) but does not set `"private": true`; it even declares `"publishConfig": { "access": "public" }`, meaning the package would be eligible for publishing unintentionally. Per the private-new-packages rule, every newly-added package must set `"private": true` until a trusted publisher exists for it — add `"private": true` to this file.

# ERROR beab2053-53 no-casts `packages/core/compute/mcp-server/src/internal/projection.ts:104`

`const isRefProperty = (property: any): boolean => {` widens the parameter to `any`. Fix per `no-casts`: type it as `unknown` (or the specific JSON-schema-property shape it inspects) instead of `any`.

# ERROR beab2053-54 no-casts `packages/core/compute/mcp-server/src/internal/projection.ts:135`

`export const tolerateStringifiedRefs = (fields: Fields, inputSchema: any): Fields => {` widens `inputSchema` to `any` in an exported function's signature. Fix per `no-casts`: give it a concrete JSON-schema-ish type instead of `any`.

# ERROR beab2053-55 no-casts `packages/core/compute/mcp-server/src/Server.ts:169`

`const toolkit = Toolkit.make(...(tools as any[]));` casts the tools array to `any[]`. Fix per `no-casts`: type `tools` so it already matches what `Toolkit.make`'s spread parameter expects.

# ERROR beab2053-56 no-casts `packages/core/compute/mcp-server/src/Server.ts:178`

`) as unknown as Layer.Layer<` is the double-cast escape hatch bridging the built toolkit layer to its declared return type. Fix per `no-casts`: type the intermediate `toolkit`/`handlers` values so the pipe chain's inferred type already matches the declared return, instead of casting through `unknown`.

# ERROR beab2053-57 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:38`

`private _handles: Record<string, DocHandleProxy<any>> = {};` widens the handle map's value type to `any` (the `handles` getter's return type at line 105 repeats the same widening). Fix per `no-casts`: parameterize `DocHandleProxy` with `unknown` (or the actual document shape) instead of `any`.

# ERROR beab2053-58 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:285`

`this._sendUpdatesJob!.trigger();` asserts the job non-null without a preceding check in this scope. Fix per `no-casts`: initialize `_sendUpdatesJob` so it is never `undefined` at this call site, or guard it explicitly before calling `.trigger()`.

# ERROR beab2053-59 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:262`

`const entries = await this._branchStore!.load();` asserts `_branchStore` non-null (repeated at line 291). Fix per `no-casts`: guard the call site (or make `_branchStore` non-optional once initialization guarantees it) instead of asserting with `!`.

# ERROR beab2053-60 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:475`

`!this._areDepsSatisfied(this._objects.get(objectToLoad.id)!)` and `result[objectToLoad.resultIndex] = this.getObjectCoreById(objectToLoad.id)!;` (line 484), plus `const toUnlink = objects.filter((o) => o?.isDeleted()).map((o) => o!.id);` (line 619), all assert a lookup result non-null without narrowing it into a local first. Fix per `no-casts`: capture each lookup into a `const` and check it (or restructure the surrounding loop to only iterate ids known to be present) instead of asserting with `!`.

# ERROR beab2053-61 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:563`

`delete doc.links![objectId];` asserts `links` non-null before indexing (repeated at `draft.objects![id]` line 593, `draft.links![id]` line 596, and `draft.branches![id]` line 599). Fix per `no-casts`: type these document sections as always-present (initialized at document creation) or guard with an explicit check before `delete`.

# ERROR beab2053-62 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:652`

`newStruct.system!.type = EncodedReference.fromURI(type);` asserts `system` non-null. Fix per `no-casts`: ensure `system` is initialized before this assignment (or check it explicitly) instead of asserting with `!`.

# ERROR beab2053-63 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:864`

`getLoadedDocumentHandles(): DocHandleProxy<any>[] {` widens the return type to `any` (the interface declaration this implements is flagged separately in `proxy-db/database.ts`). Fix per `no-casts`: parameterize `DocHandleProxy` with `unknown` instead of `any`.

# ERROR beab2053-64 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1163`

`const core = queue.shift()!;` asserts the shifted element non-null. Fix per `no-casts`: restructure the loop as `while (queue.length > 0)` so the shift result is not asserted, or check for `undefined` explicitly.

# ERROR beab2053-65 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:1556`

`objectsToRebind.get(spaceRootUrl)!.objectIds.push(object.id);` asserts a `Map.get` result non-null (repeated at `linkedObjectIds.get(object.id)!` on line 1558). Fix per `no-casts`: use `Map.getOrInsert`-style logic (compute-and-set the default first) or check the lookup explicitly before dereferencing.

# ERROR beab2053-66 no-casts `packages/core/echo/echo-client/src/echo-handler/devtools-formatter.ts:20`

`getHeader = (tag: string, id: string, config?: any): JsonML =>` widens `config` to `any` (the same widening recurs on `formatValue`'s `object`/`config` parameters at line 31 and `getBody`'s `objData` parameter at line 41). Fix per `no-casts`: type these as `unknown` — Chrome's devtools formatter API hands over arbitrary values, but `unknown` still forces an explicit check before use, unlike `any`.

# ERROR beab2053-67 no-casts `packages/core/echo/echo-client/src/feed/feed-handle.ts:675`

`const isSqliteNotOpenError = (err: any) => err.cause?.message?.includes(...)` widens the error parameter to `any`. Fix per `no-casts`: type it as `unknown` and narrow via `err instanceof Error` (or an `Error & { cause?: unknown }` shape) before reading `.cause`.

# ERROR beab2053-68 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:122`

`getLoadedDocumentHandles(): DocHandleProxy<any>[];` widens the return type to `any` on the public interface (the implementation at line 847 repeats the same signature). Fix per `no-casts`: parameterize `DocHandleProxy` with `unknown` instead of `any`.

# ERROR beab2053-69 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:542`

`return match as unknown as T;` is the double-cast escape hatch (the identical pattern recurs at line 545, `this._addPersistentSchema(type) as unknown as T`). Fix per `no-casts`: constrain the surrounding function's generic `T` so the compiler can verify `match`/the schema-registration result actually satisfies it, instead of casting through `unknown`.

# ERROR beab2053-70 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:741`

`const output = (await migration.transform(object, { db: this })) as any;` casts the migration result to `any`, then reads it through further `any` casts at `delete (output as any).id;` (line 747) and `meta: metaPatch as any,` (line 752). Fix per `no-casts`: type `output` against the migration's declared target schema instead of `any`.

# ERROR beab2053-71 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:1004`

`async _loadObjectById(objectId: string, options: any = {}): Promise<Entity.Unknown | undefined> {` widens `options` to `any`. Fix per `no-casts`: give it a concrete options type (even an empty/optional-fields interface) instead of `any`.

# ERROR beab2053-72 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:1029`

`const createSchemaNotRegisteredError = (schema?: any) => {` widens the optional parameter to `any`. Fix per `no-casts`: type it as `unknown` (or the specific schema-like shape read inside the function) instead of `any`.

# WARN beab2053-73 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-subduction.test.ts:476`

`await sleep(500);` waits an arbitrary fixed time for the crash-recovery replication state to settle before asserting `subB.getBlobs(sid)` still has length 1, instead of polling the condition. The same file already uses `expect.poll(() => subB.getBlobs(sid)..., { timeout: 5_000 })` a few lines above (line 462) for an equivalent wait — use that idiom here too rather than a blind sleep.

# WARN beab2053-74 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-subduction.test.ts:548`

`await sleep(200);` after `repo.flush()` and before `repo.shutdown()` is a fixed real-time wait for background persistence to quiesce, with no condition being polled. Prefer waiting on a concrete signal (e.g. `waitForCondition` on `storage.writeOps`, or an explicit "flush complete" promise from the repo/storage adapter) instead of a guessed delay.

# WARN beab2053-75 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-subduction.test.ts:566`

Same pattern as line 548: `await sleep(200);` guesses at settling time before `repo.shutdown()` rather than polling for the underlying condition (e.g. pending writes reaching zero).

# ERROR beab2053-76 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:163:55`

New test uses the non-null assertion `chunk.data!` to unwrap `loadRange`'s result before passing it to `Buffer.from`. Per `no-casts`, fix the type at its source instead — narrow with an `invariant(chunk.data, ...)`/`expect(chunk.data).toBeDefined()` first, or change `loadRange`'s return type so `data` isn't optional when the chunk was just saved.

# WARN beab2053-77 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:84`

`await sleep(120);` in `linkObject` waits past the directory listing's 50ms debounce. The comment explains the need for a real gap so two updates don't coalesce, which may be the rule's "real macrotask turn" exception if the debounce timer isn't driven by an injectable/virtual clock — but as written this is still a blind fixed-time wait rather than a wait on an observable "listing updated" signal (e.g. a `Trigger` resolved by the directory-listing subscription itself). If the debounce truly cannot be observed any other way, say so in the comment; otherwise prefer a condition-based wait.

# ERROR beab2053-78 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:99:17`

New `linkExisting` helper calls `parentHandle!.change(...)`, asserting away the `undefined` that `loadDoc` can return. Per `no-casts`, replace the `!` with an `invariant(parentHandle, ...)` guard so a missing document fails loudly at its source instead of being silently asserted past.

# WARN beab2053-79 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:104`

Same pattern as line 84: `await sleep(120);` in `linkExisting` is a fixed real-time wait for the debounced directory listing rather than a wait on an observable completion signal.

# ERROR beab2053-80 no-casts `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:146:58`

Same new helper reads `sharedHandle!.url`, non-null-asserting the result of `loadDoc`. Per `no-casts`, add an `invariant(sharedHandle, ...)` (as done elsewhere in this file) rather than asserting with `!`.

# WARN beab2053-81 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/auto-reclaim.test.ts:152`

`await sleep(1_000);` lets "a reclamation pass run and settle" on a guessed duration with no condition polled, unlike the `test.skip`-ped cases in the same file which use `expect.poll(() => countChunks(...), { timeout: 5_000 })`. Replace with an equivalent `expect.poll`/`waitForCondition` on the chunk count (or an explicit completion signal from the reclamation pass) so the test doesn't rely on a fixed delay.

# ERROR beab2053-82 no-casts `packages/core/echo/echo-host/src/db-host/feed-service.test.ts:257:39`

New test added `JSON.parse(next.objects![0])`, non-null-asserting `objects` before indexing. Per `no-casts`, fix at the source — narrow with an assertion/invariant on `next.objects` (or type `FeedQueryResult.objects` as always-defined) instead of `!`.

# ERROR beab2053-83 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:77:27`

The new `#queryFeedImpl` method (extracted from `queryFeed`) keeps `spaceId: spaceId! as SpaceId` — a non-null assertion feeding a cast. Per `no-casts`, validate `spaceId` at its source (e.g. `invariant(spaceId, 'spaceId is required')` alongside the existing `invariant(query, ...)` two lines above) instead of asserting non-null with `!`.

# ERROR beab2053-84 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:119:40`

New `serve.test.ts` unwraps `Map.get(1)` with the non-null assertion `responses.get(1)!.result`. Per `no-casts`, fix at the source: give the test a helper like `getResponse(id)` that throws a descriptive error (or uses `invariant`) when the id is missing, instead of asserting non-null with `!`.

# ERROR beab2053-85 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:124:73`

Same pattern as line 119: `responses.get(2)!.result.tools` non-null-asserts the `Map.get` result rather than guarding it at the source.

# ERROR beab2053-86 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:137:69`

`tools.find((tool) => tool.name === 'taskCreate')!.inputSchema...` non-null-asserts the result of `Array.find`, which is typed to allow `undefined`. Per `no-casts`, fix at the source with an `invariant`/explicit assertion (e.g. `expect(taskTool).toBeDefined()`) before dereferencing, rather than `!`.

# ERROR beab2053-87 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:141:57`

Same pattern as line 119: `responses.get(3)!.result.prompts` non-null-asserts the `Map.get` result.

# ERROR beab2053-88 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:148:47`

Same pattern as line 119: `responses.get(4)!.result.content[0].text` non-null-asserts the `Map.get` result.

# ERROR beab2053-89 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:153:99`

Same pattern as line 119: `responses.get(5)!.result.messages` non-null-asserts the `Map.get` result.

# ERROR beab2053-90 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:162:37`

Same pattern as line 119: `responses.get(6)!.result` non-null-asserts the `Map.get` result.

# ERROR beab2053-91 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:171:45`

Same pattern as line 119: `responses.get(2)!.result.tools.map(...)` non-null-asserts the `Map.get` result.

# ERROR beab2053-92 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:176:46`

Same pattern as line 119: `responses.get(7)!.result.content[0].text` non-null-asserts the `Map.get` result.

# ERROR beab2053-93 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:185:23`

Same pattern as line 119: `responses.get(2)!.result.tools` non-null-asserts the `Map.get` result.

# ERROR beab2053-94 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:202:37`

Same pattern as line 119: `responses.get(8)!.result` non-null-asserts the `Map.get` result. A single `getResponse(id)` helper (throwing or `invariant`-guarding on a missing id) would fix this and the eight other occurrences in this file at once, per `no-casts`.

# WARN beab2053-95 no-compat-shims `packages/plugins/plugin-assistant/src/processor/processor.ts:51:14`

`AiChatServices` is explicitly marked `@deprecated ... Retained for backward compatibility with CLI and update-name`, but no call site — in this package or anywhere else in the repo — imports it from this path; `@dxos/devtools-cli` defines its own separate `AiChatServices` type in `packages/devtools/cli/src/util/runtime.ts` rather than referencing this one. Per `no-compat-shims`, a construct kept only for backward compatibility must not be left behind after the code it served moved on; delete the unused type here (its declared purpose is unmet since nothing actually consumes it).

# WARN beab2053-96 no-sleep-in-test `packages/plugins/plugin-computer/src/vite-plugin/shell-middleware.test.ts:83`

`await new Promise((resolve) => setTimeout(resolve, 1_500));` is a fixed real-time wait for the killed process group's async OS-level teardown before checking `fs.existsSync(...)`. Even though the underlying event (process-group termination) is real OS scheduling outside a virtual clock, the fix should be a bounded poll (e.g. `waitForCondition(() => !fs.existsSync(survivorPath), { timeout: 5_000 })`) rather than a single blind sleep, which is either slower than necessary or flaky if teardown ever takes longer than 1.5s.

# ERROR beab2053-97 no-casts `packages/plugins/plugin-connector/src/Binding.ts:55:27`

`refEntityId`'s parameter is typed `Ref.Ref<any>`, a widened-`any` signature per the no-casts rule. The function only reads `ref.uri`, a field that exists regardless of the referenced type, so `Ref.Ref<unknown>` types the same behavior without erasing the referenced type for callers.

# ERROR beab2053-98 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:156:5`

`lastManager!.contribute(...)` uses a non-null assertion on the module-level `lastManager` variable. Narrow it properly (e.g. an `invariant`/early-return guard, or restructure so the value is known non-null at this point) instead of asserting past the type checker.

# ERROR beab2053-99 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:157:11`

`lastContext!.expand(...)` is another non-null assertion on the same module-level `lastContext` variable. Same fix as the `lastManager!` case above — guard or restructure rather than assert.

# ERROR beab2053-100 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:158:28`

`const actions: any[] = lastContext!.registry.get(lastContext!.graph.actions(...))` combines a widened `any[]` declaration with two more `lastContext!` non-null assertions on the same line. Type `actions` from `registry.get`'s real return type instead of `any[]`, and remove the `!` assertions per the guidance above.

# ERROR beab2053-101 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:163:42`

`getGroupChildIds = async (group: any): Promise<string[]> => {...}` — the `group` parameter is widened to `any`. The call sites pass the result of `getConnectGroup`, so `group` can be typed with that concrete (possibly-undefined) node type instead.

# ERROR beab2053-102 no-casts `packages/plugins/plugin-connector/src/capabilities/connector-auth-actions.test.ts:169:55`

`child.id.split('/').at(-1)!` non-null-asserts the result of `Array.prototype.at`, which is legitimately `string | undefined` here. Fall back explicitly (e.g. `?? child.id`) instead of asserting it away.

# WARN beab2053-103 no-echo-internal-in-sdk `packages/plugins/plugin-connector/src/types/ConnectorAnnotations.ts:7:10`

Imports `createAnnotationHelper` from the private `@dxos/echo/internal` surface to build `ConnectorAuthAnnotation`, a plugin-defined user annotation. Use the public `Annotation.make` from `@dxos/echo` instead, per `no-echo-internal-in-sdk`.

# ERROR beab2053-104 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:118:73`

`Scope.feed(Feed.getFeedUri(feed)!)` non-null-asserts `Feed.getFeedUri`'s result. Handle the `undefined` case (e.g. `invariant`) instead of asserting past it.

# ERROR beab2053-105 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:121:73`

`Obj.getMeta(message).keys.find(...)!.id` non-null-asserts the result of `Array.prototype.find`. Use `invariant`/an explicit check instead of `!`.

# ERROR beab2053-106 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:136:58`

`mailbox.feed.target!` is a non-null assertion on a ref target that can genuinely be unresolved. Same issue recurs at line 168. Assert with `invariant` (as this file already does elsewhere) instead of `!`.

# ERROR beab2053-107 no-casts `packages/plugins/plugin-google/src/operations/mail/sync/sync-live.test.ts:175:31`

`gmailIdOf(target!)` non-null-asserts `target`, the result of `Array.prototype.find` two lines above. Guard with `invariant`/an explicit check instead of `!`.

# ERROR beab2053-108 no-casts `packages/plugins/plugin-inbox/src/capabilities/skill-definition.ts:29:39`

`.map((connector) => connector.sync!.operation)` non-null-asserts `connector.sync`, but the preceding `.filter((connector) => connector.sync?.targetTypename === typename)` does not narrow `sync` to defined (only its `targetTypename` property). Restructure the filter to narrow (e.g. `filter((c): c is ... => c.sync?.targetTypename === typename)`) instead of asserting past it.

# ERROR beab2053-109 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:88:25`

`(query.ast as any).queries` casts the AST to `any` to reach an untyped `.queries` property. Use the real `QueryAST` union/discriminated type (narrowing on `_tag`/`type`) instead of casting to `any`.

# ERROR beab2053-110 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:97:25`

`(query.ast as any).queries[1]` is the same `as any` escape as line 88, reached again here instead of through the new `semiJoinArm` helper already used elsewhere in this test file.

# ERROR beab2053-111 no-casts `packages/plugins/plugin-inbox/src/containers/MailboxArticle/mailbox-search.test.ts:242:67`

`const semiJoinArm = (query: ...): any => (query.ast as any).queries[0];` both declares an `any` return type and casts `query.ast as any` to index into it. Since every call site expects a `union` query AST, type this against the real AST shape instead of `any`.

# ERROR beab2053-112 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:52:20`

`const run = <A>(db: any, effect: Effect.Effect<A, any, Database.Service>) =>` widens both the `db` parameter and the effect's error channel to `any`. `db` is always the `Database.Database` returned by `setup()`/`builder.createDatabase()` elsewhere in this file, so it can be typed concretely instead of `any`.

# ERROR beab2053-113 no-casts `packages/plugins/plugin-inbox/src/operations/FeedCursor.test.ts:98:30`

`const addLegacyCursor = (db: any, mailbox: Mailbox.Mailbox) =>` — same widened-`any` parameter as `run` above; `db` should be typed as `Database.Database`.

# ERROR beab2053-114 no-casts `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/Loader.solid-stories.tsx:23:6`

New story file's `decorators` entry types its parameter as `(Story: any) => (...)`, a widened-`any` signature that the `no-casts` rule flags. Fix the type at its source: import the renderer's own decorator type (e.g. `Decorator` from `storybook-solidjs-vite`, alongside the already-imported `Meta`/`StoryObj`) and annotate `Story` with it instead of `any`.

# WARN beab2053-115 no-echo-internal-in-sdk `packages/sdk/app-toolkit/src/echo/TypeOptions.ts:13:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build `TypeInputOptionsAnnotation`. This sdk package already imports the public `@dxos/echo/Annotation` entry point elsewhere in the file (`HiddenAnnotation`, `getTypeAnnotation`) — replace this call with the public `Annotation.make`, per `no-echo-internal-in-sdk`.

# WARN beab2053-116 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:427`

`await sleep(50);` is used to wait for replication to *not* deliver `bobPersonalDoc` to `aliceSharedSpace` before asserting its absence. A fixed sleep for a negative assertion is exactly the flaky pattern the rule targets — prefer waiting on a positive, already-replicated signal (e.g. a marker object created after `bobPersonalDoc` and observed via `waitForObject`) to bound the window deterministically instead of guessing 50ms.

# WARN beab2053-117 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:444`

Same pattern as line 427: `await sleep(50);` guesses a window before asserting `doc1`/`doc2` never replicated to `eveSpaceB`, instead of anchoring on an observable signal.

# WARN beab2053-118 no-sleep-in-test `packages/sdk/client-services/src/packlets/services/feed-syncer.test.ts:296`

`await new Promise((resolve) => setTimeout(resolve, 250));` waits a fixed 250ms to assert the client feed store has *not* yet synced the newly appended block, before calling `syncer.schedulePoll()`. This is a fixed-delay negative-assertion wait; prefer `vi.waitFor`/`waitForCondition` anchored to an observable "poll attempted" signal (the same file already uses `vi.waitFor` elsewhere for the positive case) rather than a guessed timeout.

# WARN beab2053-119 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/api-key.ts:5:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build `RecognizedDomainsAnnotation`. Use the public `Annotation.make` from `@dxos/echo` instead, per `no-echo-internal-in-sdk`.

# WARN beab2053-120 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/atproto-record.ts:6:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build both `AtprotoRecordAnnotation` and `AtprotoPolicyAnnotation`. Use the public `Annotation.make` from `@dxos/echo` for these instead, per `no-echo-internal-in-sdk`.

# WARN beab2053-121 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/atproto-visibility.ts:5:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build `AtprotoVisibilityAnnotation`. Use the public `Annotation.make` from `@dxos/echo` instead, per `no-echo-internal-in-sdk`.

# WARN beab2053-122 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/collection-item.ts:5:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal`, ECHO's private surface. `createAnnotationHelper` is documented in-repo as "only for system annotations" with a standing TODO to reconcile it with `Annotation.make`; user-defined annotations like `CollectionItemAnnotation` should be built with the public `Annotation.make({ id, schema })` from `@dxos/echo` instead.

# WARN beab2053-123 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/factory.ts:5:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build `FactoryAnnotation`. Replace with the public `Annotation.make({ id: FactoryAnnotationId, schema })` from `@dxos/echo` — `createAnnotationHelper` is reserved for ECHO's own system annotations, not sdk-defined ones.

# WARN beab2053-124 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/icon.ts:8:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build `IconAnnotation`. Use the public `Annotation.make({ id: IconAnnotationId, schema: Schema.String })` from `@dxos/echo` in its place — `createAnnotationHelper` is marked internal-only ("only for system annotations") and carries no compatibility guarantee.

# WARN beab2053-125 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/parent-label.ts:5:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build `ParentLabelAnnotation`. Replace with the public `Annotation.make({ id: ParentLabelAnnotationId, schema: Schema.Boolean })` from `@dxos/echo`, which is the supported entry point for user-defined annotations.

# WARN beab2053-126 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/queue.ts:5:10`

Imports `createAnnotationHelper` from `@dxos/echo/internal` to build `QueueAnnotation`; the file's own TODO already flags migrating this to `Annotation.make` to get proper `PropertyMeta` serialization. Replace the import with the public `Annotation.make({ id: QueueAnnotationId, schema: Schema.Boolean })` from `@dxos/echo`.

# WARN beab2053-127 no-echo-internal-in-sdk `packages/sdk/schema/src/annotations/view.ts:9:38`

Imports both `AnnotationHelper` (type) and `createAnnotationHelper` from `@dxos/echo/internal` to build `ViewAnnotation`; the file's own TODO already flags migrating this to `Annotation.make` for proper `PropertyMeta` serialization. Replace `createAnnotationHelper(ViewAnnotationId)` with the public `Annotation.make({ id: ViewAnnotationId, schema })` from `@dxos/echo`, and base `ViewAnnotationModule` on the public `Annotation.Annotation<EchoViewRefPath>` type instead of the internal `AnnotationHelper<T>`.

# ERROR beab2053-128 no-casts `packages/stories/stories-assistant/vite.config.ts:26:68`

`configureServer: async (server: { middlewares: { use: (handler: any) => void } }) => {` widens `use`'s parameter to `any`, which is exactly the widened-`any`-in-signature case the `no-casts` rule flags. Use Vite's real connect middleware type instead, e.g. `use: (handler: import('connect').NextHandleFunction) => void` (or `Connect.NextHandleFunction` from `vite`'s exported types), so the handler signature stays checked.

# ERROR beab2053-129 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:29:16`

`(entity as unknown as Record<string, unknown>)[IMAGE_PROPERTY]` is the double-cast escape hatch the `no-casts` rule forbids — going through `unknown` defeats structural checking even though a comment explains why. Fix the type at its source instead: declare a narrow local interface such as `interface HasImage { image?: unknown }` and cast directly to that (`entity as HasImage`), or add a type guard (`'image' in entity`) that narrows without a blind cast, so the property access stays checked.

# ERROR beab2053-130 no-casts `packages/ui/react-ui-components/src/components/QueryEditor/query-extension.ts:335:62`

`this._identifier.split(/\W/).at(-1)!` uses a non-null assertion to suppress the `string | undefined` result of `Array.at`. Per the `no-casts` rule, fix the type at its source instead — e.g. fall back with `?? ''` or narrow with an explicit check before using `label`.

# ERROR beab2053-131 no-casts `packages/ui/react-ui-components/src/components/QueryEditor/query-extension.ts:376:40`

`constructor(private readonly _props: any)` widens the constructor parameter to `any`, and the resulting `_entries: [string, any][]` field inherits the same loss of type safety. Per `no-casts`, give `_props` a real shape (e.g. `Record<string, unknown>` or the actual object-tag payload type) instead of `any`.

# ERROR beab2053-132 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:104:26`

`DX_ANCHOR_ACTIVATE as any` casts the event name to `any` to satisfy `addEventListener`'s type parameter. Per `no-casts`, type `addEventListener`/`DX_ANCHOR_ACTIVATE` so the event name and the `DxAnchorActivate` handler line up without an `any` escape hatch.

# ERROR beab2053-133 no-casts `packages/ui/react-ui-editor/src/stories/Popover.stories.tsx:31:42`

`const generator: ValueGenerator = random as any;` casts `random` to `any` to force it into the `ValueGenerator` type. Per `no-casts`, fix this at the source — either give `random` a signature compatible with `ValueGenerator` or adapt it with a small typed wrapper instead of `as any`.

# ERROR beab2053-134 private-new-packages `packages/ui/react-ui-feed/package.json:1:1`

This is a newly-added package (confirmed via `git diff --name-status 4e417e9d43095c89306c5194d3ce2730e356168c -- packages/ui/react-ui-feed/package.json`, status `A`), and its `package.json` lacks `"private": true` — it even declares `"publishConfig": {"access": "public"}`, the opposite of private. Per the `private-new-packages` rule, add `"private": true` to this manifest until a trusted publisher exists for the package.

# ERROR beab2053-135 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:420:17`

`(viewport as any).__feed = {...}` casts the viewport element to `any` to attach a debug property. Per `no-casts`, declare `__feed` via a proper interface augmentation (e.g. `(viewport as HTMLElement & { __feed?: ... })`) instead of erasing the element's type with `any`.

# ERROR beab2053-136 no-casts `packages/ui/react-ui-feed/src/stories/assistant.stories.tsx:285:86`

`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!` uses two non-null assertions to suppress the `PropertyDescriptor | undefined` and `set` being possibly undefined. Per `no-casts`, guard with an explicit check (e.g. `invariant`/early return) instead of asserting both away.

# ERROR beab2053-137 no-casts `packages/ui/react-ui-feed/src/stories/assistant.stories.tsx:304:95`

`canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!` uses a non-null assertion to suppress the possibly-null query result. Per `no-casts`, fix at the source with an assertion helper (e.g. `invariant(scroller)`) rather than `!`.

# ERROR beab2053-138 no-casts `packages/ui/react-ui-feed/src/stories/assistant.stories.tsx:315:100`

`canvasElement.querySelector<HTMLInputElement>('[data-testid="assistant.prompt"]')!` uses a non-null assertion on the query result. Per `no-casts`, replace with an explicit null check/`invariant` instead of `!`.

# ERROR beab2053-139 no-casts `packages/ui/react-ui-feed/src/stories/assistant.stories.tsx:373:95`

`canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!` again asserts non-null instead of checking. Per `no-casts`, replace with an explicit check/`invariant`.

# ERROR beab2053-140 no-casts `packages/ui/react-ui-feed/src/stories/streaming.stories.tsx:103:95`

`canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!` uses a non-null assertion on the query result. Per `no-casts`, replace with an explicit null check/`invariant` instead of `!`.

# ERROR beab2053-141 no-casts `packages/ui/react-ui-feed/src/stories/streaming.stories.tsx:121:32`

`samples.at(-1)!.behind` asserts the array element is non-null. Per `no-casts`, guard the access (e.g. check `samples.length` first) instead of asserting with `!`.

# ERROR beab2053-142 no-casts `packages/ui/react-ui-feed/src/testing/MessageWindow.tsx:33:37`

`Custom?: ComponentType<{ content: any; message: Message.Message }>` widens `content` to `any` in this exported prop type. Per `no-casts`, type `content` as the real renderer payload (mirroring `ReturnType<MessageRenderer>` used elsewhere in this file) instead of `any`.

# ERROR beab2053-143 no-casts `packages/ui/react-ui-feed/src/testing/MessageWindow.tsx:129:37`

The inner `Item` component repeats `Custom?: ComponentType<{ content: any; message: Message.Message }>`, again widening `content` to `any`. Per `no-casts`, give it the same real content type as the sibling `content` prop on this same type instead of `any`.

# ERROR beab2053-144 no-casts `packages/ui/react-ui-feed/src/testing/scenarios.tsx:70:37`

`Custom?: ComponentType<{ content: any; message: Message.Message }>` widens `content` to `any` in `ScenarioDefinition`. Per `no-casts`, replace with the concrete custom-content type instead of `any`.

# ERROR beab2053-145 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:79:70`

`XmlWidgetProps<any>` explicitly instantiates the widget props generic with `any`. Per `no-casts`, supply the actual props shape used by `Frame` (an object with `icon`/`title`) instead of `any`.

# ERROR beab2053-146 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:132:19`

`.map((option: any) => option?._tag === 'option' && ...)` widens the callback parameter to `any`. Per `no-casts`, type `option` using the real XML child element shape (e.g. the node type returned by the XML parser) instead of `any`.

# ERROR beab2053-147 no-casts `packages/ui/react-ui-feed/src/virtualizer/placement.test.ts:238:42`

`offsets.indexOf(offsets.at(-1)!)` asserts the array element is non-null. Per `no-casts`, guard the access (e.g. check `offsets.length` first) instead of asserting with `!`.

# ERROR beab2053-148 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:342:95`

`canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!` uses a non-null assertion to suppress the possibly-null query result. Per `no-casts`, replace with an explicit null check/`invariant` instead of `!`.

# ERROR beab2053-149 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:343:88`

`canvasElement.querySelector<HTMLElement>('[data-testid="window.window"]')!` again asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-150 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:344:89`

`canvasElement.querySelector<HTMLElement>('[data-testid="window.sizer"]')!` again asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-151 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:426:97`

`canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!` again asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-152 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:526:83`

`canvasElement.querySelector('[data-testid="placement.report"]')!.textContent` asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-153 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:542:94`

`canvasElement.querySelector(...)!.textContent!.trim()` chains two non-null assertions — one on the query result, one on `textContent`. Per `no-casts`, replace both with explicit checks (or default `textContent` with `?? ''`) instead of `!`.

# ERROR beab2053-154 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:547:45`

`scroller.parentElement!.getBoundingClientRect()` asserts `parentElement` is non-null. Per `no-casts`, guard with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-155 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:565:88`

`canvasElement.querySelector<HTMLElement>('[role="navigation"] button')!` asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-156 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:585:74`

`canvasElement.querySelector('[data-testid="minimap"]')!.getBoundingClientRect()` asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-157 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:586:70`

`canvasElement.querySelector('[role="navigation"]')!.getBoundingClientRect()` asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-158 no-casts `packages/ui/react-ui-feed/src/virtualizer/Window.stories.tsx:647:97`

`canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!` again asserts the query result is non-null. Per `no-casts`, replace with an explicit check/`invariant` instead of `!`.

# ERROR beab2053-159 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:129:24`

`schema: Schema.Codec<any, any>` widens both type parameters of `Schema.Codec` to `any` in the exported `StoryArgs` type. Per `no-casts`, use the schema's real encoded/decoded types (or a bounded generic) instead of `any, any`.

# ERROR beab2053-160 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:136:60`

`useCallback<NonNullable<FormRootProps<any>['onSave']>>` instantiates `FormRootProps` with `any` to extract `onSave`'s type. Per `no-casts`, parameterize `FormRootProps` with the actual values type (e.g. `FlightValues`) instead of `any`.

# ERROR beab2053-161 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:204:60`

Same pattern repeats: `useCallback<NonNullable<FormRootProps<any>['onSave']>>` widens `FormRootProps` to `any`. Per `no-casts`, use the concrete values type for this story instead of `any`.

# ERROR beab2053-162 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:246:60`

Same pattern again: `useCallback<NonNullable<FormRootProps<any>['onSave']>>` widens `FormRootProps` to `any`. Per `no-casts`, use the concrete values type for this story instead of `any`.

# ERROR beab2053-163 no-casts `packages/ui/react-ui-form/src/components/Form/FormLayout/FormLayout.stories.tsx:310:60`

Same pattern again: `useCallback<NonNullable<FormRootProps<any>['onSave']>>` widens `FormRootProps` to `any`. Per `no-casts`, use the concrete values type for this story instead of `any`.

# ERROR beab2053-164 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:58:24`

`Pick<FormRootProps<any>, 'readonly' | 'db'>` instantiates `FormRootProps` with `any` inside the exported `ViewEditorProps` type. Per `no-casts`, pick these fields from a properly-typed `FormRootProps<T>` (parameterized or `unknown`-bounded) instead of `any`.

# ERROR beab2053-165 no-casts `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.tsx:182:16`

`const handleUpdate = useCallback((values: any) => {...})` widens the callback parameter to `any`, even though the body immediately accesses `values.target`. Per `no-casts`, type `values` with the form's actual values shape instead of `any`.

# ERROR beab2053-166 no-casts `packages/ui/react-ui-list/src/components/Listbox/Listbox.tsx:202:25`

`forwardedRef as unknown as ForwardedRef<HTMLOListElement>` is the double-cast escape hatch the rule specifically calls out. Per `no-casts`, fix the ref's declared type at its source (e.g. type `forwardedRef` as `ForwardedRef<HTMLOListElement>` directly) instead of routing through `unknown`.

# ERROR beab2053-167 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListContext.ts:17:30`

`export type ListItemRecord = any;` defines the shared item-record type as `any`, which then widens every generic constrained by it (including `createContext<OrderedListContextValue<any>>` on line 35). Per `no-casts`, fix the type at its source — use `unknown` (or a minimal structural bound like `{ id?: string }`) instead of `any`.

# ERROR beab2053-168 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListItem.tsx:269:39`

`titleClassNames?: ThemedClassName<any>['classNames']` widens `ThemedClassName`'s generic to `any` in this exported prop type. Per `no-casts`, index into `ThemedClassName<unknown>['classNames']` (or the real payload type) instead of `any`.

# ERROR beab2053-169 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:31:19`

`isItem?: (item: any) => boolean;` widens this exported prop's callback parameter to `any`. Per `no-casts`, type `item` as `unknown` (the comment already notes the values are ignored) instead of `any`.

# ERROR beab2053-170 no-casts `packages/ui/react-ui-list/src/components/OrderedList/OrderedListRoot.tsx:47:67`

`(item as any)?.id` casts `item` to `any` to read `.id` off a generic `T extends ListItemRecord`. Per `no-casts`, fix the type at its source (a proper bound on `ListItemRecord`, see the `OrderedListContext.ts:17` finding) so `item.id` type-checks without a cast.

# ERROR beab2053-171 no-casts `packages/ui/react-ui-list/src/hooks/useListSelection.test.ts:22:62`

`result.current.bind('a').rowProps.onClick({} as any)` casts an empty object to `any` to satisfy the click-handler's event parameter. Per `no-casts`, construct a minimal typed stub event (or use the real event type) instead of `as any`.

# ERROR beab2053-172 no-casts `packages/ui/react-ui-list/src/hooks/useListSelection.test.ts:29:64`

`result.current.bind('a').rowProps.onFocus?.({} as any)` casts an empty object to `any` for the focus handler's event parameter, even though this same file already defines a typed `focusEvent(...)` helper used later (lines 47, 53) for exactly this purpose. Per `no-casts`, use `focusEvent({...})` instead of `as any`.

# ERROR beab2053-173 no-casts `packages/ui/react-ui-list/src/hooks/useListSelection.test.ts:64:82`

`result.current.bind('a', { disabled: true }).rowProps.onClick({} as any)` repeats the `as any` cast for the click event. Per `no-casts`, use a typed stub event instead of `as any`.

# ERROR beab2053-174 no-casts `packages/ui/react-ui-list/src/hooks/useListSelection.test.ts:84:62`

`result.current.bind('a').rowProps.onClick({} as any)` repeats the `as any` cast for the click event. Per `no-casts`, use a typed stub event instead of `as any`.

# ERROR beab2053-175 no-casts `packages/ui/react-ui-list/src/hooks/useListSelection.test.ts:97:64`

`result.current.bind('a').rowProps.onFocus?.({} as any)` repeats the `as any` cast for the focus event, again bypassing the file's own typed `focusEvent(...)` helper. Per `no-casts`, use `focusEvent({...})` instead of `as any`.

# ERROR beab2053-176 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/create-controller.ts:47:41`

`pendingContextRef: RefObject<{ value: any } | undefined>` widens the stored context value to `any` in this exported deps type. Per `no-casts`, type it against the actual context payload (the value passed to `xmlTagContextEffect`) instead of `any`.

# ERROR beab2053-177 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/create-controller.ts:124:27`

`setContext: (context: any) => {...}` widens the parameter to `any` (matching the same widened `any` in `MarkdownStreamController.setContext`). Per `no-casts`, fix the type at its source — give the controller's context a real shape instead of `any`.

# ERROR beab2053-178 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/create-controller.ts:161:39`

`updateWidget: (id: string, value: any) => {...}` widens `value` to `any`. Per `no-casts`, type `value` against the widget-state shape it is forwarded into (`xmlTagUpdateEffect`'s payload) instead of `any`.

# ERROR beab2053-179 no-casts `packages/ui/react-ui/src/components/Banner/Banner.stories.tsx:46:26`

`component: Banner.Root as any` casts the Storybook `component` meta field to `any`. Per `no-casts`, fix the underlying `meta` typing (e.g. via `satisfies Meta<typeof Banner.Root>` or adjusting `DefaultStory`'s props) instead of `as any`.

# ERROR beab2053-180 no-casts `packages/ui/ui-editor/src/extensions/language/xml/stub.ts:23:36`

`updated(id: string, widgetState: any): void;` widens `widgetState` to `any` in the exported `XmlWidgetNotifier` interface, even though the sibling `mounted` method uses the real `XmlWidgetState` type. Per `no-casts`, type `widgetState` as `Partial<XmlWidgetState['props']>` (or similar) instead of `any`.

# ERROR beab2053-181 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:48:38`

`export type XmlEventHandler<TEvent = any> = (event: TEvent) => void;` defaults the event generic to `any`. Per `no-casts`, default to `unknown` (or a concrete base event type) instead of `any`.

# ERROR beab2053-182 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:53:37`

`export type XmlWidgetProps<TProps = any, TContext = any> = ...` defaults both generics to `any`. Per `no-casts`, default `TProps`/`TContext` to `unknown` (or `Record<string, unknown>`) instead of `any`.

# ERROR beab2053-183 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:57:14`

`children?: any[];` widens the widget's children field to `any[]` in the exported `XmlWidgetProps` type. Per `no-casts`, type children against the real XML child node shape instead of `any`.

# ERROR beab2053-184 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:125:43`

`export const getXmlTextChild = (children: any[]): string | null => {...}` widens the exported function's parameter to `any[]`. Per `no-casts`, type `children` with the real XML child node type instead of `any`.

# ERROR beab2053-185 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:137:55`

`export const xmlTagContextEffect = StateEffect.define<any>();` instantiates the effect's value type as `any`. Per `no-casts`, give this effect a concrete context-value type instead of `any`.

# ERROR beab2053-186 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:153:75`

`export const xmlTagUpdateEffect = StateEffect.define<{ id: string; value: any }>();` widens `value` to `any` inside the effect's payload type. Per `no-casts`, type `value` against the real widget-state payload instead of `any`.

# ERROR beab2053-187 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:162:41`

`type XmlWidgetStateMap = Record<string, any>;` widens the map's value type to `any`. Per `no-casts`, use the real per-widget state shape instead of `any`.

# ERROR beab2053-188 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:167:10`

`props: any;` widens the `props` field of the exported `XmlWidgetState` type to `any`. Per `no-casts`, type it against `XmlWidgetProps` (or the relevant subset) instead of `any`.

# ERROR beab2053-189 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:214:51`

`const widgetContextStateField = StateField.define<any>({...})` widens the field's stored value type to `any`. Per `no-casts`, give this state field a concrete context-value type instead of `any`.

# ERROR beab2053-190 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:327:40`

`updated: (id: string, widgetState: any) => {...}` widens `widgetState` to `any` in the `XmlWidgetNotifier` implementation (matching the interface's own widened `any`, flagged separately in `stub.ts:23`). Per `no-casts`, type `widgetState` against the real widget-state payload instead of `any`.
