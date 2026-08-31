---
branch: claude/gracious-planck-c3lqxh
commit: c7a7733c1c63c8cfdf578ab0ca8a57131dc56912
base: a794822a5304e5de0dc0adbb6ea85a18fe1e421c
mode: default
createdAt: 2026-08-25T11:59:21.735Z
isFinalized: true
groups: 20
rules: [namespace-service-layers, no-casts, no-sleep-in-test]
reviewId: c7a7733c
---

_110 error(s), 48 warning(s)._

# ERROR c7a7733c-1 no-casts `packages/apps/composer-app/src/main.tsx:119`

`const importMeta = import.meta as any;` casts away `ImportMeta`'s type to reach the Vite-only `.hot` property. Fix per `no-casts`: declare an `ImportMeta.hot?: { dispose(cb: () => void) }` ambient augmentation (or import Vite's `ImportMetaHot` type) instead of widening to `any`.

# ERROR c7a7733c-2 no-casts `packages/apps/composer-app/src/main.tsx:243`

`(window as any).composer = { profiler, otel };` casts `window` to `any` to attach a debug global. Fix per `no-casts`: extend the `Window` interface with a `composer` field instead of casting.

# ERROR c7a7733c-3 no-casts `packages/apps/composer-app/src/main.tsx:613`

`const root = document.getElementById('root')!;` is a non-null assertion on a DOM lookup that can genuinely return `null`. Fix per `no-casts`: check for `null` explicitly and render/throw the fatal fallback instead of asserting.

# ERROR c7a7733c-4 no-casts `packages/apps/composer-app/src/playwright/harness-helpers.ts:225`

Several callback parameters are widened to `any` instead of a concrete shape: `(event: any)` here, and `(module: any)` at line 227, `(tag: any)` at lines 237-238, and `(entry: any)` at lines 330 and 354. Fix per `no-casts`: give each callback a type matching the harness snapshot's actual module/tag/entry shape instead of `any`.

# ERROR c7a7733c-5 no-casts `packages/apps/composer-app/vite.config.ts:419`

`const url = new URL(req.url!, ...)` asserts `req.url` is non-null on a Node `IncomingMessage`, where `url` is genuinely optional. Fix per `no-casts`: guard for `undefined` and respond with an error status instead of asserting.

# ERROR c7a7733c-6 no-casts `packages/apps/composer-app/vite.config.ts:673`

`function chunkFileNames(chunkInfo: any)` widens the Rollup/Rolldown chunk-info parameter to `any`; the derived `let segments: any[] = ...` on line 675 inherits the same untyped shape. Fix per `no-casts`: type the parameter as the bundler's `PreRenderedChunk` type instead of `any`.

# ERROR c7a7733c-7 no-casts `packages/common/async/src/stream.ts:233`

`catch (err: any)` widens the caught exception to `any` (repeated identically at lines 253, 264, and 286). Fix per `no-casts`: catch as `unknown` (TypeScript's default) and narrow before passing to `throwUnhandledError`/`this._ctx.raise`.

# ERROR c7a7733c-8 no-casts `packages/common/codec-protobuf/src/service.ts:32`

`private readonly _schema: Schema<any>,` is a widened-`any` generic argument in the `ServiceDescriptor` constructor (repeated identically in `Service`'s constructor at line 56 and `ServiceHandler`'s at line 110). Fix per `no-casts`: give `Schema` a concrete or `unknown`-erased default so callers don't need to write `any` at every constructor boundary.

# ERROR c7a7733c-9 no-casts `packages/common/codec-protobuf/src/service.ts:69`

`(this as any)[methodName] = ...` casts `this` to `any` to attach a dynamically-named RPC method (repeated at line 82, and again via `Object.defineProperty((this as any)[methodName], ...)` at line 97). Fix per `no-casts`: type `this` as a `Record<string, unknown>` index signature instead of `any`.

# ERROR c7a7733c-10 no-casts `packages/common/codec-protobuf/src/service.ts:75`

`method.resolvedRequestType!.fullName` re-asserts non-null on a value the preceding `invariant(method.resolvedRequestType)` already checked (same pattern at line 88 for the request type, and lines 132 and 153 for `resolvedResponseType!`). The narrowing is lost because the value is re-read inside a later closure. Fix per `no-casts`: capture `const requestType = method.resolvedRequestType;` right after the `invariant` call and reference the local inside the closures.

# ERROR c7a7733c-11 no-casts `packages/common/codec-protobuf/src/service.ts:126`

`request.value!` (repeated at line 147) asserts non-null on `Any.value` without a preceding check. Fix per `no-casts`: make the check explicit, or make `value` non-optional on `Any` if it is always present by construction.

# ERROR c7a7733c-12 no-casts `packages/common/codec-protobuf/src/service.ts:161`

`return (handler as any).bind(service);` casts the resolved handler to `any` before binding. Fix per `no-casts`: type `handler` as `(...args: unknown[]) => unknown` instead of casting to `any`.

# ERROR c7a7733c-13 no-casts `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:549`

`const handles: readonly ProcessManager.Handle<any, any, HarnessControlRpcs>[] = ...` widens two of `Handle`'s generic parameters to `any`. Fix per `no-casts`: supply the actual input/output types the test's process handles use instead of `any`.

# WARN c7a7733c-14 namespace-service-layers `packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:235`

`AgentService.AgentService.key` repeats the namespace: `AgentService` is imported as `import * as AgentService from '@dxos/compute/AgentService'`, and its `Context.Service` tag is also named `AgentService`, so `.key` forces the double spelling the rule warns about. Give the `AgentService` module a module-level `key` accessor (or reference the tag as `AgentService.AgentService` only where unavoidable, never followed by a further member) so call sites read `AgentService.key`.

# ERROR c7a7733c-15 no-casts `packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:329`

`) as any;` casts the constructed layer/service value to `any` to satisfy its declared type. Fix per `no-casts`: type the constructed object literal so it structurally matches the target type directly.

# WARN c7a7733c-16 namespace-service-layers `packages/core/compute/ai/src/AiModelResolver.test.ts:25`

`AiModelResolver.AiModelResolver.buildAiService` repeats the namespace — `AiModelResolver` is imported with `import * as AiModelResolver from './AiModelResolver'` and the module hangs `buildAiService` as a `static` on the same-named `Context.Service` tag. Per the rule, export `buildAiService` as a module-level `const` beside the tag so this reads `AiModelResolver.buildAiService`.

# WARN c7a7733c-17 namespace-service-layers `packages/core/compute/ai/src/AiModelResolver.test.ts:27`

`AiModelResolver.AiModelResolver.resolver(` repeats the namespace for the same reason as line 25 — `resolver` is a `static` on the `AiModelResolver` tag class instead of a module-level accessor.

# WARN c7a7733c-18 namespace-service-layers `packages/core/compute/ai/src/AiModelResolver.test.ts:39`

Same violation again: `AiModelResolver.AiModelResolver.resolver(` repeats the namespace because `resolver` is hung as a `static` on the tag class rather than exported at module level.

# WARN c7a7733c-19 namespace-service-layers `packages/core/compute/ai/src/resolvers/anthropic/AnthropicResolver.ts:17`

`AiModelResolver.AiModelResolver.resolver(` repeats the namespace — fix at the source by moving `AiModelResolver`'s `static resolver` to a module-level `const`/function beside the tag, which lets every call site (including this one) drop to `AiModelResolver.resolver(`.

# WARN c7a7733c-20 namespace-service-layers `packages/core/compute/ai/src/resolvers/lmstudio/LMStudioResolver.ts:55`

`AiModelResolver.AiModelResolver.fromModelMap(` repeats the namespace for the same reason — `fromModelMap` is a `static` on the `AiModelResolver` tag class rather than a module-level export.

# WARN c7a7733c-21 namespace-service-layers `packages/core/compute/ai/src/resolvers/ollama/OllamaResolver.test.ts:27`

`AiModelResolver.AiModelResolver.buildAiService` repeats the namespace; move `buildAiService` off the `Context.Service` tag class and export it as a module-level `const` so this becomes `AiModelResolver.buildAiService`.

# WARN c7a7733c-22 namespace-service-layers `packages/core/compute/ai/src/resolvers/ollama/OllamaResolver.ts:56`

`AiModelResolver.AiModelResolver.resolver(` repeats the namespace — same root cause as the other resolvers: `resolver` should be a module-level accessor on `AiModelResolver`, not a class `static`.

# WARN c7a7733c-23 namespace-service-layers `packages/core/compute/ai/src/resolvers/openai/OpenAiResolver.ts:18`

`AiModelResolver.AiModelResolver.fromModelMap(` repeats the namespace — same fix as the other call sites: export `fromModelMap` at module level instead of as a `static` on the tag.

# ERROR c7a7733c-24 no-casts `packages/core/compute/ai/src/testing/effect-ai.test.ts:190`

`{ thinking: { type: 'adaptive' as any } }` casts the `thinking.type` literal to `any` (repeated identically at line 255). Fix per `no-casts`: widen the resolver's `thinking.type` option type to include `'adaptive'`, or use the SDK's actual union type, instead of casting.

# WARN c7a7733c-25 namespace-service-layers `packages/core/compute/ai/src/testing/test-layers.ts:22`

`AiModelResolver.AiModelResolver.buildAiService` repeats the namespace; the fix belongs in `AiModelResolver.ts` (module-level `const buildAiService`), which resolves this call site too.

# WARN c7a7733c-26 namespace-service-layers `packages/core/compute/ai/src/testing/test-layers.ts:76`

Same violation again in the same file: `AiModelResolver.AiModelResolver.buildAiService` repeats the namespace because `buildAiService` is a tag `static` instead of a module-level export.

# ERROR c7a7733c-27 no-casts `packages/core/compute/ai/src/tools/call.ts:42`

`toolkit.handle(toolCall.name as any, input as any)` casts both the tool name and input to `any`. Fix per `no-casts`: type `toolCall.name` against the toolkit's known tool-name union and `input` against the resolved tool's input schema instead of `any`.

# ERROR c7a7733c-28 no-casts `packages/core/compute/ai/src/tools/tool-resolver-service.ts:36`

`Effect.Effect<Toolkit.Toolkit<any>, ...>` widens `Toolkit`'s generic argument to `any` in the exported resolver's signature. Fix per `no-casts`: parameterize with the actual tool-definition union (or `unknown`) instead of `any`.

# WARN c7a7733c-29 namespace-service-layers `packages/core/compute/assistant-e2e/src/harness.ts:131`

`AiService.AiService.pipe(...)` repeats the namespace: `@dxos/ai` re-exports `AiService` as `export * as AiService from './AiService'`, and the `Context.Service` tag inside is also named `AiService`, so referencing the tag itself forces `AiService.AiService`. Give the tag's common uses (or the tag reference itself) a module-level alias so callers aren't forced through the doubled name.

# WARN c7a7733c-30 namespace-service-layers `packages/core/compute/assistant-evals/src/runner.ts:65`

Same violation as `harness.ts:131`: `AiService.AiService.pipe(...)` repeats the namespace for the same `@dxos/ai` `AiService` tag.

# WARN c7a7733c-31 namespace-service-layers `packages/core/compute/assistant-toolkit/src/types/Chat.test.ts:48`

`Chat.Chat.fields` repeats the namespace: `Chat.ts` is marked `@import-as-namespace` and exports a `Chat` class under the same name as the module, so referencing the class's own `.fields` from the namespace import doubles the name. Add a module-level `fields` (or `schema`) accessor beside the class so this reads `Chat.fields`.

# ERROR c7a7733c-32 no-casts `packages/core/compute/assistant/src/session/toolkit.ts:54`

`OpaqueToolkit.make(mergedToolkit, combinedHandlerLayer as any) as OpaqueToolkit.OpaqueToolkit` casts the handler layer to `any` and then casts the whole call result again. Fix per `no-casts`: type `combinedHandlerLayer` against `OpaqueToolkit.make`'s declared parameter instead of the double cast.

# ERROR c7a7733c-33 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:26`

`const decodeIn = (schema: Schema.Codec<any, any>, value: unknown): any[] => {` widens both the schema parameter and the return type to `any`; the `const decoded: any = ...` pattern recurs at lines 28, 57, and 188. Fix per `no-casts`: type `schema` against the actual `Fields`/`Struct` shape used by the caller and give `decoded` the decoded struct's type instead of `any`.

# ERROR c7a7733c-34 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:200`

`meta: { key: DXN.make(key as any), name: 'Display Copy' }` casts a test fixture key to `any` before constructing a `DXN`. Fix per `no-casts`: type the fixture `key` as the string type `DXN.make` expects instead of casting.

# ERROR c7a7733c-35 no-casts `packages/core/compute/assistant/src/tool-runtime/services.test.ts:233`

`(registry as any).query = (...args: Parameters<typeof query>) => {` casts the registry to `any` to monkey-patch a method. Fix per `no-casts`: type the stub as a partial/mock of the registry's actual interface instead of casting through `any`.

# ERROR c7a7733c-36 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:148`

`function* (input: any) {` widens the generator's input parameter to `any` inside `toolFunctionHandler`. Fix per `no-casts`: type `input` against the tool's declared input schema (or `unknown`, narrowed at the point of use) instead of `any`.

# ERROR c7a7733c-37 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:155`

`(toolkitHandler.handle as any)(tool.name, input);` casts the handler function to `any` before calling it. Fix per `no-casts`: type `toolkitHandler.handle` against its actual signature instead of casting away the type check on the call.

# ERROR c7a7733c-38 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:173`

`) as any,` and `) as any;` cast two constructed toolkit members to `any` (lines 173-174). Fix per `no-casts`: type the constructed object literals against the toolkit member's declared shape instead of casting.

# ERROR c7a7733c-39 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:208`

`{ definition: Operation.Definition.Any; parameters: Schema.Codec<any, any> }` widens `parameters` to `any`; the identical `Schema.Codec<any, any>` widening recurs at lines 288, 322, 363, and 364. Fix per `no-casts`: parameterize `Schema.Codec` with the actual field type (or a bounded generic) instead of `any`.

# ERROR c7a7733c-40 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:305`

`return node.map(statePropertyOpenness) as unknown as JsonSchema.JsonSchema;` is the double-cast escape hatch. Fix per `no-casts`: type `statePropertyOpenness`'s return so `node.map(...)` already satisfies `JsonSchema.JsonSchema` without casting through `unknown`.

# ERROR c7a7733c-41 no-casts `packages/core/compute/assistant/src/tool-runtime/services.ts:433`

`typeof (value as any).tools === 'object' && typeof (value as any).handle === 'function'` casts `value` to `any` twice in the same type-guard expression. Fix per `no-casts`: narrow `value` (typed as `unknown` at the guard's boundary) with `in` checks instead of casting to `any`.

# ERROR c7a7733c-42 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:198`

`Deferred.succeed(SlowChildGate.alarmStarted!, undefined)` asserts the test-fixture `Deferred` fields non-null (repeated at line 200 for `alarmResume!`, line 201 for `alarmHandlerFinished!`, and again at line 1469 for `alarmResume!`). Fix per `no-casts`: type the gate fixture's fields as non-optional (they are always initialized before use) instead of asserting at each call site.

# WARN c7a7733c-43 no-sleep-in-test `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:481`

`yield* Effect.promise(() => expect.poll(() => outputCount).toEqual(2));` (and the identical poll on `lastOutput` at line 482) busy-polls for output-stream state instead of synchronizing on it — the code even carries a `TODO(dmaretskyi): Output streaming is async, not sure how to sync it.` comment admitting the gap. Fix by awaiting the forked `subscribeOutputs()` fiber directly (e.g. collect via `Stream.take(2)` / `Fiber.join`) or gating on a `Deferred` fulfilled once the expected count is reached, per `no-sleep-in-test`.

# ERROR c7a7733c-44 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:516`

`expect(tree[0]!.pid)` asserts the array access non-null (repeated at lines 517 and 518). Fix per `no-casts`: assert the array's length once (`invariant(tree.length > 0)` or a destructure with a defined check) and reuse the narrowed local instead of asserting at each property access.

# ERROR c7a7733c-45 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:882`

`input.override !== undefined ? { spaceId: input.override as any } : undefined` casts `input.override` to `any`. Fix per `no-casts`: type `spaceId` against the actual `SpaceId` type instead of casting.

# ERROR c7a7733c-46 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:915`

`return dbService as any;` casts the test double to `any`. Fix per `no-casts`: type the stub so it structurally matches the service interface the caller expects.

# ERROR c7a7733c-47 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1004`

`'echo://BBBBBBBBBBBBBBBBBBBBBBBBBB/01JTESTCONVERSATION00000000' as any` casts a literal DXN string to `any`. Fix per `no-casts`: construct it via `DXN.make`/the typed conversation-URI helper instead of casting a raw string.

# WARN c7a7733c-48 no-sleep-in-test `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1419`

`yield* Effect.promise(() => expect.poll(() => EffectEx.runAndForwardErrors(Ref.get(alarmHandlerFinished))).toEqual(true));` busy-polls a `Ref` flag to detect handler completion (repeated identically at line 1470 for the sibling test). The suite already has `Deferred` in scope for this exact purpose (see `alarmStarted`/`alarmResume` a few lines above) — replace the `Ref` + poll with a `Deferred` the handler succeeds once finished and `yield* Deferred.await(...)`, per `no-sleep-in-test`.

# WARN c7a7733c-49 no-sleep-in-test `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1516`

`yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));` uses a fixed real-time sleep to give a forked `submitInput` time to "enter the blocked section before shutdown" (repeated identically at lines 1559, 1566, and 1610). This is a race dressed as a wait: nothing guarantees the handler reached its blocking point within 50ms. Replace with a `Deferred`/signal the handler fulfills right after entering `Effect.never`/the gated branch, and await that instead, per `no-sleep-in-test`.

# WARN c7a7733c-50 no-sleep-in-test `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1522`

`yield* Effect.promise(() => expect.poll(() => handled).toEqual(1));` busy-polls a plain counter to detect that the rehydrated handler ran (repeated at line 1617). Prefer a `Deferred` the handler fulfills on completion, awaited directly, instead of polling `handled`, per `no-sleep-in-test`.

# WARN c7a7733c-51 namespace-service-layers `packages/core/compute/compute-runtime/src/ProcessManager.ts:591`

`StorageService.StorageService.key` repeats the namespace: `StorageService` (`@dxos/compute/StorageService`, marked `@import-as-namespace`) is imported as `import * as StorageService`, and its `Context.Service` tag shares the module name, so `.key` needs the double spelling. Contrast with the neighboring `Trace.TraceService.key` / `Operation.Service.key` in the same array, which don't collide because their tag names differ from their namespaces — `StorageService` should either expose a module-level `key` re-export or the tag should not double as the namespace's own name.

# WARN c7a7733c-52 namespace-service-layers `packages/core/compute/compute-runtime/src/ProcessManager.ts:801`

Same violation, duplicated later in the file: `StorageService.StorageService.key` again repeats the namespace.

# WARN c7a7733c-53 namespace-service-layers `packages/core/compute/compute-runtime/src/protocol.ts:282`

`AiModelResolver.AiModelResolver.buildAiService.pipe(...)` repeats the namespace — same underlying issue: `buildAiService` needs to be a module-level `const` beside the `AiModelResolver` tag.

# ERROR c7a7733c-54 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:59`

`return dbService as any;` casts the test double to `any`. Fix per `no-casts`: type the stub against the service interface the caller expects instead of erasing it with `any`.

# ERROR c7a7733c-55 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:477`

`runnable: Ref.make(badFn) as any,` casts a deliberately-malformed test fixture to `any` (repeated identically at line 1323). Fix per `no-casts`: give the fixture object a type matching the `runnable` field's declared shape instead of casting the whole `Ref` to `any`.

# WARN c7a7733c-56 no-sleep-in-test `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:633`

The `for` loop at lines 633-638 busy-polls `registry.get(dispatcher.state)` up to 100 times with `yield* Effect.sleep(Duration.millis(20))` between attempts to detect that the feed trigger fired. Even though the surrounding `it.live` test legitimately needs real time (reactive subscriptions, not `TestClock`), the wait itself should subscribe to the registry atom (e.g. `Registry.subscribe`) or the dispatcher's own event/state stream and resolve on the first matching update, rather than a manual sleep-and-recheck loop, per `no-sleep-in-test`.

# ERROR c7a7733c-57 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1137`

`Scope.feed(Feed.getFeedUri(feed)!)` asserts `getFeedUri`'s result non-null (repeated at lines 1164, 1197, and 1228). Fix per `no-casts`: assert/require the URI once up front and reuse the narrowed local instead of asserting at each call site.

# ERROR c7a7733c-58 no-casts `packages/core/compute/compute/src/Operation.ts:94`

`readonly services: readonly Context.Key<any, any>[];` widens both of `Context.Key`'s generic parameters to `any`. Fix per `no-casts`: use `Context.Key<string, unknown>` (or a bounded generic tied to `Definition`'s own type parameters) instead of `any`.

# ERROR c7a7733c-59 no-casts `packages/core/compute/compute/src/Operation.ts:112`

`export type Any = Definition<any, any, any>;` and the same `Definition<any, any>` widening recur through the file's overload signatures at lines 171, 172, 173, 216 (`Props<any, any>`), 263, 266, and 270. Fix per `no-casts`: bound each occurrence with `unknown` in place of `any` so `Definition.Any` still type-checks as an existential without erasing member types.

# ERROR c7a7733c-60 no-casts `packages/core/compute/compute/src/Operation.ts:185`

`}) as any;` casts the constructed `lazyHandler` implementation to `any` to satisfy its declared overload signature (the same pattern recurs at line 233's `} as any;` in `make`, lines 285/293 in `withHandler`, and lines 866-871 where `invoke`/`invokePromise`/`schedule` each widen their `input` parameter to `any` and then cast the whole arrow function `as any`). Fix per `no-casts`: type each implementation against the union of its declared overloads instead of casting the whole function/object to `any`.

# ERROR c7a7733c-61 no-casts `packages/core/compute/compute/src/Operation.ts:913`

`source: from.source as any,` casts the migrated `source` ref to `any`. Fix per `no-casts`: type it against the target schema's `source` field instead of `any`.

# ERROR c7a7733c-62 no-casts `packages/core/compute/compute/src/Trace.ts:66`

`export type PayloadType<E extends EventType<any>> = ...` widens `EventType`'s generic argument to `any` in the exported type's bound. Fix per `no-casts`: bound it with `unknown` instead of `any` so the conditional extraction still works without erasing the constraint.

# ERROR c7a7733c-63 no-casts `packages/core/compute/compute/src/types/Project.test.ts:32`

`expect(Obj.getParent(taskSet!)?.id)` asserts a fixture non-null; the same pattern recurs for `outline!` at lines 39, 40, and twice more at line 42 (`outline!.content.target!` and `outline!.id`). Fix per `no-casts`: assert the fixtures are defined once (e.g. via `invariant`) right after creation and reuse the narrowed locals instead of asserting at each use.

# ERROR c7a7733c-64 no-casts `packages/core/compute/compute/src/types/Template.test.ts:51`

`expect(decode(kind as any)).toBe(kind);` casts `kind` to `any` (repeated at line 56 with `'nonsense' as any`). Fix per `no-casts`: type these test values against `Template.InputKind`'s decoder input type instead of `any`.

# ERROR c7a7733c-65 no-casts `packages/core/compute/compute/src/types/Template.test.ts:100`

`Record<string, (input: any) => Effect.Effect<any, any, any>>` widens the handler map's input/output/error/context types to `any`, and the `invoke: (op: any, input: any) => {` stub at line 105 repeats the widening. Fix per `no-casts`: type the stub handlers against `Operation.OperationService`'s real member signatures instead of `any`.

# ERROR c7a7733c-66 no-casts `packages/core/compute/compute/src/types/Template.test.ts:114`

`} as unknown as Operation.OperationService);` is the double-cast escape hatch used to hand the stub above to a caller expecting the real service. Fix per `no-casts`: build the stub so it structurally satisfies `Operation.OperationService` (per the fixes above) so no cast is needed.

# ERROR c7a7733c-67 no-casts `packages/core/compute/compute/src/types/Template.ts:111`

`yield* Operation.invoke(fn, undefined as any).pipe(Effect.orDie);` casts `undefined` to `any` to satisfy `invoke`'s input parameter. Fix per `no-casts`: type `fn`'s input as optional/`void` where it is genuinely absent, instead of casting the call site.

# WARN c7a7733c-68 namespace-service-layers `packages/core/compute/conductor/src/types/compute-events.ts:76:3`

`ComputeNodeContext` is a `Context.Service` tag class carrying a `static layerNoop` member; per `namespace-service-layers`, move `layerNoop` out to a module-level `const layerNoop: Layer.Layer<ComputeNodeContext> = Layer.succeed(ComputeNodeContext, { nodeId: '' });` declared beside the class, and leave the class body empty (`export class ComputeNodeContext extends Context.Service<...>()('@dxos/conductor/ComputeNodeContext') {}`).

# ERROR c7a7733c-69 no-casts `packages/core/compute/crawler/src/testing/index.ts:266`

`} as any),` casts a constructed test fixture to `any`. Fix per `no-casts`: type the object literal against the parameter it is passed to instead of casting.

# ERROR c7a7733c-70 no-casts `packages/core/compute/edge-compute/src/bundler/bundler.test.ts:94`

`Effect.flatMap((res: any) => res.json)` widens the response parameter to `any`; the same value is cast again at line 100 as `(res as any).data.rates[to].toString()`. Fix per `no-casts`: type `res` against the fetch/HTTP client's actual response shape instead of `any`.

# ERROR c7a7733c-71 no-casts `packages/core/compute/functions-testing/src/edge-routine.test.ts:99`

`const runResult: any = await client.edge.http.forceRunCronTrigger(...);` widens the awaited result to `any`. Fix per `no-casts`: type it against `forceRunCronTrigger`'s actual return type instead of `any`.

# ERROR c7a7733c-72 no-casts `packages/core/compute/mcp-server/src/internal/input.test.ts:35`

`const codec = Input.codec(record())!;` asserts `Input.codec`'s result non-null (repeated identically at lines 48, 57, and 65). Fix per `no-casts`: make `Input.codec` return a non-optional value for a valid schema (or assert once via `invariant`) instead of asserting `!` at each call site.

# ERROR c7a7733c-73 no-casts `packages/core/compute/mcp-server/src/internal/input.test.ts:71`

`expect((wire as any).taskSet).to.deep.equal(envelope);` casts `wire` to `any` to reach an untyped field. Fix per `no-casts`: type `wire` against the actual wire-envelope shape instead of `any`.

# ERROR c7a7733c-74 no-casts `packages/core/compute/mcp-server/src/internal/input.ts:20`

`decode: Schema.Codec<any, any>; encode: Schema.Codec<any, any>;` widens both codec fields to `any` (the same `Schema.Codec<any, any>` widening recurs at lines 48, 89, 127, 128, and 131, and the bare `any` parameters at line 59 (`property: any`) and line 83 (`inputSchema: any`)). Fix per `no-casts`: parameterize `Schema.Codec` with `unknown` (or the module's actual `Fields` value type) throughout instead of `any`.

# ERROR c7a7733c-75 no-casts `packages/core/compute/mcp-server/src/internal/wire.test.ts:32`

`const message: any = { result: { serverInfo: { name: 'DXOS', version: '0.1.0' } } };` widens the test fixture to `any` (repeated identically at lines 47, 54, and 60). Fix per `no-casts`: type `message` against the actual wire-message/response type instead of `any`.

# ERROR c7a7733c-76 no-casts `packages/core/compute/mcp-server/src/McpServer.test.ts:272`

`{ input: { title: 42 as unknown as string } }` is the double-cast escape hatch used to smuggle a wrong-typed test value past the input type. Fix per `no-casts`: type the test fixture's `title` field as `unknown`/a union that legitimately includes the invalid value, or construct the malformed input without a source-level cast.

# ERROR c7a7733c-77 no-casts `packages/core/compute/mcp-server/src/McpServer.test.ts:335`

`(row.schema?.input as any).properties.title` casts the schema's input to `any` to reach `.properties`. Fix per `no-casts`: type `row.schema.input` against the JSON-schema shape it actually holds instead of `any`.

# ERROR c7a7733c-78 no-casts `packages/core/compute/mcp-server/src/McpServer.test.ts:614`

`} as unknown as Operation.OperationService;` is the double-cast escape hatch for a hand-built test stub. Fix per `no-casts`: build the stub so it structurally satisfies `Operation.OperationService` instead of casting through `unknown`.

# ERROR c7a7733c-79 no-casts `packages/core/compute/operation/src/invoker.test.ts:23`

`ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>` is the double-cast escape hatch, widening the runtime's generics to `any` on top of it. Fix per `no-casts`: type the test runtime against the actual context/error types the invoker under test requires instead of casting through `unknown`.

# ERROR c7a7733c-80 no-casts `packages/core/compute/operation/src/scheduler.test.ts:19`

`ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>` is the double-cast escape hatch (same as `invoker.test.ts:23`). Fix per `no-casts`: type the test runtime against the scheduler's actual context/error types instead of casting through `unknown`.

# ERROR c7a7733c-81 no-casts `packages/core/compute/operation/src/scheduler.test.ts:48`

`const invokeFn = ((_op: any, input: { id: string }) => ...` widens the operation parameter to `any` (repeated identically at lines 78, 126, and 156); each of these arrow functions also returns `undefined as any` (lines 51, 81, 132, 162), and line 106 casts the whole arrow function `as Scheduler.InvokeFn` after an inner `Effect.succeed(undefined as any)`. Fix per `no-casts`: type `_op` as `Operation.Definition.Any` and give the stub a real (or `void`) return type instead of `any`.

# ERROR c7a7733c-82 no-casts `packages/core/compute/pipeline-discord/src/stages/answer-questions.test.ts:124`

`} as any),` casts a constructed test fixture to `any`. Fix per `no-casts`: type the object literal against the parameter it is passed to instead of casting.

# WARN c7a7733c-83 namespace-service-layers `packages/core/compute/pipeline/src/testing/metrics.ts:34:3`

`Metrics` is a `Context.Service` tag class carrying a `static layer` member; per `namespace-service-layers`, export `layer` as a module-level `const layer: Layer.Layer<Metrics> = Layer.sync(Metrics, () => makeMetrics());` next to the class and leave the class body empty, so a namespace-style import never has to spell `Metrics.Metrics.layer`.

# ERROR c7a7733c-84 no-casts `packages/core/echo/echo-client-e2e/src/integration.test.ts:137`

`await peer.openDatabase(spaceKey, db.rootUrl!, {...})` asserts `rootUrl` non-null; the identical pattern recurs at lines 157, 220, 305, 327, 339, 376, 425, 468, 627, and 796. Fix per `no-casts`: capture `rootUrl` via a helper that asserts once (or narrows the type after `db.rootUrl` is first set) instead of asserting `!` at every call site.

# ERROR c7a7733c-85 no-casts `packages/core/echo/echo-client-e2e/src/integration.test.ts:202`

`const outer = (await db.query(Filter.id(outerId)).first()) as any;` casts the query result to `any` (repeated identically at line 230, and again for `db.add(...) as any` at lines 250 and 278, and `plainObj as any` at lines 759 and 764). Fix per `no-casts`: type the query/add results against the actual `TestSchema.Expando`/typed-object shape instead of `any`.

# ERROR c7a7733c-86 no-casts `packages/core/echo/echo-client-e2e/src/integration.test.ts:445`

`return state.peers!.length;` asserts `state.peers` non-null (repeated at line 452 three more times on the same expression). Fix per `no-casts`: narrow `state.peers` once with a guard/`invariant` before reading its members repeatedly.

# ERROR c7a7733c-87 no-casts `packages/core/echo/echo-client-e2e/src/integration.test.ts:640`

`expect(Type.getURI(Obj.getType(object)!)).to.eq(...)` asserts `Obj.getType`'s result non-null; the identical pattern recurs at lines 635, 660, 674 (`schema!`), 676, 694, and 707. Fix per `no-casts`: assert the type is present once via `invariant` right after the object is created and reuse the narrowed local.

# ERROR c7a7733c-88 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:46`

`[Obj.Meta]?: { tags?: Ref.Ref<any>[]; ... }` widens the meta `tags` field's ref target to `any`. Fix per `no-casts`: parameterize `Ref.Ref` with the actual tag-object type (or `unknown`) instead of `any`.

# ERROR c7a7733c-89 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:953`

`Scope.feed(Feed.getFeedUri(feed)!)` asserts `getFeedUri`'s result non-null; this exact pattern recurs at lines 956, 973, 976, 995, 998, 1015, 1018, 1459, 1466, 1475, 1495, 1553, 1567, 1581, 1582, 2995, 3005, 3015, and 3065. Fix per `no-casts`: assert the feed URI is present once per fixture (`invariant`/a typed helper) and reuse the narrowed local instead of asserting at dozens of call sites.

# ERROR c7a7733c-90 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:1185`

`Obj.update(obj, (obj: any) => { ... })` widens the update callback's parameter to `any`; the identical pattern recurs at lines 1243, 1287, 1303, 1410, 1415, and 3249. Fix per `no-casts`: type the callback parameter against the object's actual schema type instead of `any`.

# ERROR c7a7733c-91 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:1293`

`expect(after).toBeGreaterThan(before!);` asserts `before` non-null; the same pattern recurs for `reloaded!` (line 1336), `createdAt!` (lines 1389-1391), `updatedAt!` (lines 1421-1423), and `traceResult!` (lines 1716, 1736). Fix per `no-casts`: narrow each value once where it is captured (e.g. destructure with a defined check) instead of asserting `!` at each read.

# ERROR c7a7733c-92 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:1795`

`expect(feedResults.map((obj: any) => obj.title).sort())...` widens the map callback's parameter to `any`; the identical widening recurs at lines 1860, 2653, 3652, 3741, 3769, 3816, 3857, 3871, 3874, 3898, 3913, and 3934. Fix per `no-casts`: type these callbacks against the queried object's schema instead of `any`.

# ERROR c7a7733c-93 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:1812`

`expect((feedResult[0] as any).title).toBe('Feed Task');` casts a query-result element to `any` (the same pattern recurs at lines 3534, 3549, 3564, and 3570). Fix per `no-casts`: type the query results against the fixture's actual schema instead of `any`.

# ERROR c7a7733c-94 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:1957`

`doc.links![obj1.id] = 'automerge:...'` asserts `doc.links` non-null (the same document-internals assertions recur at lines 1988-1989 for `docHandle!`, 1993 for `objects!`/`doc()!`, 1996 for `url!`, 2011 for a `.find(...)!` result, and 2012 for `docHandle!.url`). Fix per `no-casts`: narrow the automerge document/handle once via a typed accessor instead of asserting `!` at each internal field access.

# ERROR c7a7733c-95 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:2058`

`objects: [] as any[]` casts an empty array literal to `any[]`; the related `Ref.make(object as any)` at line 2061 casts the object being referenced. Fix per `no-casts`: type the `objects` field against its declared ref-array type and type `object` against the schema being referenced instead of `any`.

# ERROR c7a7733c-96 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:2314`

`objects.sort((a, b) => a.title!.localeCompare(b.title!))` asserts `title` non-null twice (repeated identically at line 2400). Fix per `no-casts`: filter/require `title` to be defined before sorting, or type the fixture's `title` as required, instead of asserting at each comparison.

# ERROR c7a7733c-97 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:3094`

`expect(entry.match!.rank).toBeDefined();` asserts `match` non-null (repeated at lines 3095, 3096, 3117, 3141, and 3164, plus `result!.title` at lines 3121, 3145, 3188, and 3189). Fix per `no-casts`: narrow `match`/`result` once via a filter or `invariant` after the search call instead of asserting `!` at every assertion.

# WARN c7a7733c-98 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/query.test.ts:3252`

`await sleep(10);` is used to give a query subscription time to (not) fire before asserting `expect(updateCount).to.equal(0)`. Waiting a fixed real interval to prove an event never arrived is exactly the flaky pattern `no-sleep-in-test` forbids — it can pass by luck on a loaded CI box just as easily as it can hide a real regression. Replace with `db.flush({ updates: true })` (used elsewhere in this same file to make subscription delivery deterministic) or an explicit `waitForCondition` with a short timeout guarding the negative case.

# ERROR c7a7733c-99 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:3337`

`const names = query.results.map((obj) => obj.name!);` asserts `name` non-null (repeated at line 3437). Fix per `no-casts`: type the fixture's `name` field as required, or filter out unnamed objects, instead of asserting at the map callback.

# ERROR c7a7733c-100 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:4006`

`const assertQuery = async (db: EchoDatabase, filter: Filter.Any, expected: any[]) => {` widens the helper's `expected` parameter to `any[]`; `const sortById = (objects: any[]) => ...` at line 4011 repeats the widening. Fix per `no-casts`: give both helpers a generic type parameter tied to the actual object schema instead of `any[]`.

# ERROR c7a7733c-101 no-casts `packages/core/echo/echo-client-e2e/src/registry.test.ts:50`

`.map((o) => (o as any).value)` casts a registry result to `any` to read an untyped field; the identical pattern recurs at lines 66, 80, 89, 171, 187, 209, and 214. Fix per `no-casts`: type the registry's query/list results against the fixture's actual schema instead of `any`.

# ERROR c7a7733c-102 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:71`

`rootUrl = db.rootUrl!;` asserts `rootUrl` non-null (repeated identically at line 195). Fix per `no-casts`: narrow `db.rootUrl` once via a helper that asserts on database creation instead of at each assignment.

# WARN c7a7733c-103 no-sleep-in-test `packages/core/echo/echo-client/src/proxy-db/database.test.ts:76`

`await sleep(500); // Wait for the object to be saved.` synchronizes with the peer's background persistence purely by guessing at a duration. Use a real completion signal from the storage/persistence layer (e.g. await the flush/save promise the peer already exposes) instead of a fixed sleep, per `no-sleep-in-test`.

# ERROR c7a7733c-104 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:233`

`expect(Type.getSchema(Obj.getType(task)!).ast)...` asserts `Obj.getType`'s result non-null. Fix per `no-casts`: assert the type is present once via `invariant` right after `task` is created and reuse the narrowed local.

# ERROR c7a7733c-105 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:260`

`expect(container.records![0].type)...` asserts the optional `records`/`objects`/`subTasks` array fields non-null throughout the file — recurring at lines 272, 273, 281, 282, 299, 300, 308, 309, 382, 383, 414, 415, 419, 423, 424, 425, 434, 445, 454, 462, 463, 464, 471, and 483. Fix per `no-casts`: initialize these fields as required (non-optional) arrays on the test schema, or destructure/narrow once per test, instead of asserting `!` at every access.

# ERROR c7a7733c-106 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:286`

`expect((target1 as any).foo).to.equal(100);` casts a loaded ref target to `any` (repeated at line 287, and again for `Obj.version(task as any)` at lines 389, 393, and 401). Fix per `no-casts`: type the loaded target/task against the fixture's `Expando`/schema type instead of `any`.

# ERROR c7a7733c-107 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:423`

`const ids = root.subTasks!.map((task: any) => task.target!.id);` widens the map callback's parameter to `any` on top of the `subTasks!` assertion (the identical callback widening recurs at line 424). Fix per `no-casts`: type `task` against the ref-array element type instead of `any`.

# ERROR c7a7733c-108 no-casts `packages/core/echo/echo-client/src/proxy-db/database.test.ts:694`

`const expectObjects = (echoObjects: any[], expectedObjects: any) => {` widens both helper parameters to `any`; `const mapEchoToPlainJsObject = (array: any[]): any[] => {` at line 698 repeats the widening on input and return type. Fix per `no-casts`: give both helpers a generic parameter tied to the actual object schema instead of `any`.

# ERROR c7a7733c-109 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:122`

`getLoadedDocumentHandles(): DocHandleProxy<any>[];` widens the return type to `any` on the public interface (the implementation at line 928 repeats the same signature). Fix per `no-casts`: parameterize `DocHandleProxy` with `unknown` instead of `any`.

# ERROR c7a7733c-110 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:425`

`private _addPersistentSchema(schemaInput: Schema.Codec<any, any> | Type.AnyEntity): Type.AnyEntity {` widens the schema parameter to `any`; `let schema: Schema.Codec<any, any>;` on the next line repeats it. Fix per `no-casts`: parameterize `Schema.Codec` with `unknown` instead of `any`.

# ERROR c7a7733c-111 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:542`

`return match as unknown as T;` is the double-cast escape hatch (repeated identically at line 545 for `this._addPersistentSchema(type) as unknown as T`). Fix per `no-casts`: constrain the surrounding function's generic `T` so the compiler can verify the result actually satisfies it, instead of casting through `unknown`.

# ERROR c7a7733c-112 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:761`

`const output = (await migration.transform(object, { db: this })) as any;` casts the migration result to `any`, then reads/writes it through further `any` casts at `delete (output as any).id;` (line 767) and `meta: metaPatch as any,` (line 772). Fix per `no-casts`: type `output` against the migration's declared target schema instead of `any`.

# ERROR c7a7733c-113 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:1085`

`async _loadObjectById(objectId: string, options: any = {}): Promise<Entity.Unknown | undefined> {` widens `options` to `any`. Fix per `no-casts`: give it a concrete options type instead of `any`.

# ERROR c7a7733c-114 no-casts `packages/core/echo/echo-client/src/proxy-db/database.ts:1106`

`private readonly _rootProxies = new Map<any, Entity.Unknown>();` widens the map's key type to `any`; `const createSchemaNotRegisteredError = (schema?: any) => {` at line 1110 repeats the widening on its parameter. Fix per `no-casts`: key the map by the actual object-id type, and type `schema` as `unknown` (or the specific schema-like shape read inside the function), instead of `any`.

# ERROR c7a7733c-115 no-casts `packages/core/echo/echo-client/src/proxy-db/rename-migration.test.ts:174`

`A.getHeads(getObjectCore(object).docHandle!.doc())` asserts `docHandle` non-null. Fix per `no-casts`: assert the handle is present via `invariant` before dereferencing, or make `getObjectCore`'s return type reflect that `docHandle` is always set for a loaded object.

# ERROR c7a7733c-116 no-casts `packages/core/echo/echo-client/src/registry/registry.ts:119`

`private _query(query: Query.Any | Filter.Any): QueryResult.QueryResult<any> {` widens the query result's generic argument to `any`; `new RegistryQueryResult<any>(this, normalized)` on line 121 repeats it. Fix per `no-casts`: parameterize with `unknown` (or the actual entity type the registry manages) instead of `any`.

# ERROR c7a7733c-117 no-casts `packages/core/echo/echo-client/src/registry/registry.ts:298`

`return this.runSyncEntries().map((entry) => entry.result!);` asserts `entry.result` non-null. Fix per `no-casts`: filter to entries whose `result` is defined (or make `result` non-optional after `runSyncEntries` guarantees it) instead of asserting.

# ERROR c7a7733c-118 no-casts `packages/core/echo/echo-client/src/registry/registry.ts:305`

`result: entity as unknown as T,` is the double-cast escape hatch. Fix per `no-casts`: constrain the surrounding function's generic `T` so `entity` is verified to satisfy it directly, instead of casting through `unknown`.

# WARN c7a7733c-119 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/collection-synchronizer.test.ts:106`

`await sleep(10);` after `peer.setLocalCollectionState(...)` waits for the implementation's internal `queueMicrotask(...)` broadcast to run (same pattern repeated at lines 145, 149, 157, 188, and 223). The file already demonstrates the correct alternative in the first test (`peerCollectionStateUpdated.waitFor(...)`) — use that event, or at minimum flush the microtask queue deterministically (`await Promise.resolve()`), instead of a real 10ms timer, per `no-sleep-in-test`.

# ERROR c7a7733c-120 no-casts `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:45`

`const makeExecutor = (query: { ast: any }): QueryExecutor => ({ indexEngine: {} as any, runtime: {} as any, automergeHost: {} as any, spaceStateManager: {} as any, ..., reactivity: 'reactive' as any, })` widens the `ast` parameter and casts every fixture field to `any`; the identical block of five `as any` casts recurs verbatim at lines 307-316, 422-428, and 441-447. Fix per `no-casts`: give `makeExecutor` a shared fixture type with each field typed against `QueryExecutor`'s real dependencies instead of stubbing every field with `any`.

# ERROR c7a7733c-121 no-casts `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:87`

`expect(result!.spaceIds?.has(spaceId)).toBe(true);` asserts `result` non-null (repeated at lines 89, 90, 91, 93, and 108). Fix per `no-casts`: narrow `result` once via `invariant`/a defined check right after it is produced and reuse the narrowed local for the subsequent assertions.

# ERROR c7a7733c-122 no-casts `packages/core/echo/echo-host/src/filter/filter-match.ts:153`

`const value = (obj as any)[key];` casts `obj` to `any` to read a dynamic key. Fix per `no-casts`: type `obj` as `Record<string, unknown>` (or the entity's actual indexable shape) instead of `any`.

# WARN c7a7733c-123 namespace-service-layers `packages/core/echo/echo/src/Feed.ts:193:3`

`ContextFeedService` extends `Context.Service` inside a module marked `@import-as-namespace`, and hangs its layer constructor off the tag as `static layer = ...`. Per the rule, callers must write `Feed.ContextFeedService.layer(...)`, doubling the module name where `Feed.layer(...)` would do. Move `layer` out to a module-level `const layer = (feed: Feed) => Layer.succeed(ContextFeedService, { feed });` beside the class and leave the class body empty (`export class ContextFeedService extends Context.Service<...>()('@dxos/echo/Feed/ContextFeedService') {}`).

# ERROR c7a7733c-124 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:191:34`

The newly added test `getAuthHeader withholds a header minted for a different identity` declares `vi.fn(async (input: any, _init?: RequestInit) => {...})`, widening the mocked `fetch` input to `any`. Per the `no-casts` rule, type it precisely as `RequestInfo | URL` (matching the global `fetch` signature), which is enough to support the `input instanceof URL ? input : (input.url ?? input)` narrowing already used in the body.

# WARN c7a7733c-125 no-sleep-in-test `packages/core/mesh/rpc/src/rpc.test.ts:60`

`await sleep(5); expect(aliceOpen).toEqual(false);` asserts a negative ("hasn't opened yet") after an arbitrary real delay — the same pattern repeats at lines 79, 120, and 148 (`expect(open).toEqual(false)`). This is inherently racy: a slow machine can make the assertion false-positive, and it does not actually prove the peer would remain closed longer. Assert the pending state some other way (e.g. inspect internal state directly, or restructure so the test only asserts the eventual, awaited outcome) rather than sleeping then checking, per `no-sleep-in-test`.

# WARN c7a7733c-126 no-sleep-in-test `packages/core/mesh/rpc/src/rpc.test.ts:443`

`await expect.poll(() => closeCalled).toEqual(true);` busy-polls for the close notification's round trip. Await the actual completion signal instead — e.g. have the test `Stream`'s close callback resolve a `Trigger`/`Deferred` (the pattern already used a few lines above via `closeTrigger` in the same file's `describe('closure', ...)` block) and await that, per `no-sleep-in-test`.

# ERROR c7a7733c-127 no-casts `packages/core/protocols/src/buf/shape-compat.ts:33:20`

The new `Substitution` type widens both callback parameters to `any` (`toProto: (value: any) => unknown`, `fromProto: (value: any) => unknown`), and the same widened `any` then cascades into every helper built on it — `encodeStructValue`, `encodeStruct`, `decodeStructValue`, `decodeStruct`, `mapValue`, `substituteField`, `normalizeBytes`, `convertField`, `convertOneofs`, and `convert` (lines 87, 121, 125, 143, 187, 202, 217, 224, 236, 260) all type their value parameters and/or return types as `any` rather than `unknown`. Per the `no-casts` rule, fix the type at its source instead of widening every downstream signature: type the per-substitution callbacks with a shared type parameter (`Substitution<T>` keyed by the substituted JS type) so each entry in `substitutions` keeps its concrete parameter type, and use `unknown` with explicit narrowing (or a small `Record<string, unknown>`-based helper) for the generic struct/field traversal instead of `any`.

# ERROR c7a7733c-128 no-casts `packages/core/protocols/src/buf/shape-compat.ts:283:56`

The exported public API `encodeCompat(schema, value: any)` and `decodeCompat(schema, bytes): any` (lines 283 and 289) type their value across the buf boundary as `any`, so every call site loses type checking on the value it encodes/decodes. Per the `no-casts` rule this widened `any` should be fixed at its source, e.g. by giving `encodeCompat`/`decodeCompat` a generic type parameter tied to the `DescMessage`'s shape (or at minimum `unknown` at the boundary with the caller narrowing), rather than accepting/returning `any`.

# ERROR c7a7733c-129 no-casts `packages/devtools/cli/src/commands/mcp/serve.test.ts:186:44`

Several assertions added in this diff read a test response via a non-null assertion on `Map.get()` — `responses.get(9)!.result` (line 186), and the same pattern at lines 204, 212, 243, 258, and 287. Per the `no-casts` rule, `!` is not a fix: since `beforeAll` populates `responses` from a fixed, known set of request ids, add a small typed helper (e.g. `const getResult = (id: number) => { const r = responses.get(id); invariant(r, ...); return r.result; }`) or use `Map#get` with an explicit check that narrows the type, instead of asserting non-null at each call site.

# WARN c7a7733c-130 namespace-service-layers `packages/devtools/cli/src/util/runtime.ts:52:7`

`AiModelResolver` is imported as the `@import-as-namespace` module from `@dxos/ai`, whose `Context.Service` tag class is itself named `AiModelResolver`, so `AiModelResolver.AiModelResolver.buildAiService` repeats the namespace per the `namespace-service-layers` rule; it should read `AiModelResolver.buildAiService` (the same doubling recurs on the next line, `:55`).

# WARN c7a7733c-131 namespace-service-layers `packages/plugins/plugin-assistant/src/capabilities/ai-service.ts:25:7`

Same doubled-namespace call as above: `AiModelResolver.AiModelResolver.fromModelMap(...)` repeats the tag's own namespace name; per the rule it should be `AiModelResolver.fromModelMap(...)`. The following line (`:29`) has the identical issue with `AiModelResolver.AiModelResolver.buildAiService`.

# WARN c7a7733c-132 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:845`

`await expect.poll(() => synced).toEqual([Ref.make(cursor).uri]);` busy-polls because the sync work is "forked so connection setup returns without waiting" (repeated at line 858 for `fired`). Await the forked fiber/effect directly, or have `autoSyncConnection` expose a completion signal to wait on, instead of polling the `synced`/`fired` arrays, per `no-sleep-in-test`.

# WARN c7a7733c-133 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:871`

`await new Promise((resolve) => setTimeout(resolve, 100)); expect(synced).toEqual([]); expect(fired).toEqual([]);` proves a negative by waiting a fixed 100ms and hoping nothing happened afterward — flaky by construction and exactly what `no-sleep-in-test` prohibits. Drive the assertion off the actual absence of a scheduled effect (e.g. assert synchronously after `autoSyncConnection` resolves, since it's already awaited above) rather than sleeping first.

# ERROR c7a7733c-134 no-casts `packages/plugins/plugin-file-system/src/capabilities/app-graph-builder.ts:289`

`constructEntryNode` (a new function in this diff) widens its return type to `Node.NodeArg<any>` instead of a concrete union — the widened-`any` signature the no-casts rule flags. Sibling app-graph-builder extensions reviewed alongside this file (e.g. plugin-space's `collections.ts`/`database.ts`) parameterize `Node.NodeArg<T>` with the real data type instead; here the node's `data` is a `FileSystemCapabilities.FileSystemEntry`, `Text.Text`, or `null`, so a proper union (or a small local alias) should replace `any`.

# WARN c7a7733c-135 namespace-service-layers `packages/plugins/plugin-github/src/services/github-api.ts:146:3`

`GitHubCredentials` extends `Context.Service` and hangs its two layer constructors, `static fromAccessToken` (line 146) and `static fromConnection` (line 156), off the tag class itself. The class's own docstring documents the resulting call site as `GitHubApi.GitHubCredentials.fromConnection(ref)` (`GitHubApi` being the `@import-as-namespace` alias for this module in `services/index.ts`), which is exactly the doubled-namespace pattern `namespace-service-layers` flags for `Context.Service` tags. Move both constructors out to module-level `const`s (`export const fromAccessToken = ...` / `export const fromConnection = ...`) beside the tag and leave the class body empty.

# WARN c7a7733c-136 namespace-service-layers `packages/plugins/plugin-inbox/src/operations/extractor/ai-gate.test.ts:14:41`

Same doubled-namespace access as `ai-gate.ts`: `AiService.AiService.key` (here, and again at line 22) repeats the `AiService` namespace to reach the tag's own `key` property. Once `ai-gate.ts`'s module-level `key` accessor exists (see the companion diagnostic), update these call sites to `AiService.key`.

# WARN c7a7733c-137 namespace-service-layers `packages/plugins/plugin-inbox/src/operations/extractor/ai-gate.ts:25:15`

`AiService` is imported from `@dxos/ai`, whose barrel re-exports the `AiService.ts` module as the namespace `AiService` (`export * as AiService from './AiService'`), and that module's own `Context.Service` tag class is also named `AiService`. Reading the built-in tag property as `AiService.AiService.key` (here, and again at line 68) repeats the namespace per `namespace-service-layers` — this is a value-position access, not the type-position case the rule exempts. Since the tag itself can't drop its own name, fix this by adding a module-level accessor to `AiService.ts` (e.g. `export const key = AiService.key`) so call sites read the single-dot `AiService.key`.

# WARN c7a7733c-138 namespace-service-layers `packages/plugins/plugin-linear/src/services/linear-api.ts:126:3`

`LinearCredentials` extends `Context.Service` and defines `static fromConnection` (line 126) and `static fromAccessToken` (line 140) on the tag class rather than as module-level exports, mirroring the same anti-pattern in `plugin-github`'s `github-api.ts`. Consumers going through the `LinearApi` namespace (`services/index.ts`) must write `LinearApi.LinearCredentials.fromConnection(...)`, the `Name.Name.member` doubling the rule targets. Export both as module-level `const`s beside the `LinearCredentials` tag and leave the class body empty.

# ERROR c7a7733c-139 no-casts `packages/plugins/plugin-lingo/src/types/Word.test.ts:36`

This new test file builds a partial object and forces it through `as unknown as Word.Word` four times (also lines 41, 46, 47) to satisfy `isDue`'s parameter — the double-cast escape hatch the no-casts rule flags. `isDue` (in `Word.ts`) only ever reads `word.progress`, so fixing the type at its source — narrowing `isDue`'s parameter to `Pick<Word.Word, 'progress'>` or an equivalent structural type — would let these tests pass plain `{ progress }` objects with no cast at all.

# ERROR c7a7733c-140 no-casts `packages/plugins/plugin-magazine/src/operations/sources/rss.ts:145`

The new `channelLink` helper types its `channel` parameter as `any`, and the `link` callback parameter on line 151 the same way — a widened-`any` signature the no-casts rule flags. The rest of this file already handles the same untyped fast-xml-parser output through `unknown` plus a narrow structural cast (see `text()` above it); `channelLink` should follow that established local convention instead of falling back to `any`.

# WARN c7a7733c-141 namespace-service-layers `packages/plugins/plugin-native/src/capabilities/ollama.ts:284:3`

`OllamaSidecar` extends `Context.Service<...>()('@dxos/plugin-native/OllamaSidecar')` and hangs `static layerLive = Layer.effect(...)` off the tag class body, which is exactly the pattern the `namespace-service-layers` rule flags. Per the rule, export the layer constructor as a module-level `const OllamaSidecarLive = Layer.effect(OllamaSidecar, ...)` beside the tag and leave the `OllamaSidecar` class body empty; update the sole call site (`ManagedRuntime.make(OllamaSidecar.layerLive)`) to use the module-level export instead.

# ERROR c7a7733c-142 no-casts `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:36`

This new test's `setup` helper builds its stub runtime with `ManagedRuntime.make(Layer.empty) as unknown as ManagedRuntime.ManagedRuntime<any, any>` (repeated verbatim at line 98) — the double-cast escape hatch plus widened `any, any` that the no-casts rule flags. Since only `OperationInvoker.make` consumes the value, giving it a signature that accepts the concrete empty-layer runtime (or a small typed test helper) would avoid manufacturing the type through a double cast.

# WARN c7a7733c-143 no-sleep-in-test `packages/plugins/plugin-observability/src/capabilities/invocation-listener.test.ts:51`

The `flush` helper's `for` loop busy-polls `sent.length` with `await new Promise((resolve) => setTimeout(resolve, 10))` up to 100 times (the same loop shape is duplicated inline at line 112 for `attempts`). The listener already emits through an Effect stream (`listen(...)`); fulfill a `Deferred` from the `(event) => ...` sink once the expected count is reached and await that, instead of a manual sleep-and-recheck loop, per `no-sleep-in-test`.

# ERROR c7a7733c-144 no-casts `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.test.ts:57`

After `expect(artifacts).toBeDefined()`, the test still reaches for the non-null assertion `artifacts!` (here and again at lines 60 and 61) because `toBeDefined()` doesn't narrow the type — exactly the pattern the no-casts rule flags. Use a narrowing check instead (e.g. `invariant(artifacts)` from `@dxos/invariant`) so the type is fixed at its source rather than asserted away.

# WARN c7a7733c-145 namespace-service-layers `packages/plugins/plugin-slack/src/services/slack-api.ts:129:3`

`SlackCredentials` extends `Context.Service` and hangs its two layer constructors, `static fromAccessToken` (line 129) and `static fromConnection` (line 138), off the tag class itself. Per `namespace-service-layers`, a consumer must then spell `SlackApi.SlackCredentials.fromAccessToken(...)` (repeating the tag name), exactly the doubling the rule flags — the module's own docstring above the class even shows callers writing `SlackApi.SlackCredentials.fromConnection(ref)`. Move both constructors out to module-level `const`s (`export const fromAccessToken = ...` / `export const fromConnection = ...`) beside the tag and leave the class body empty.

# ERROR c7a7733c-146 no-casts `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.stories.tsx:31`

`mockSpaces` is forced to `Space[]` via `as unknown as Space[]` — the double-cast escape hatch the no-casts rule flags. Since the story only exercises `id`, `db`, and `displayName`, typing `mockSpaces` as `Pick<Space, 'id' | 'db' | 'displayName'>[]` (and widening `CreateObjectPanelProps.spaces` to accept that projection, or building real minimal `Space`-shaped mocks) would avoid the cast.

# ERROR c7a7733c-147 no-casts `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.stories.tsx:65`

`mockMetadata.createObject` returns `object: {} as any` — an `as any` cast the no-casts rule flags. `Metadata['createObject']`'s return type should accept a lighter stub shape for this story (or build a real minimal object) instead of forcing an empty object through `any`.

# ERROR c7a7733c-148 no-casts `packages/plugins/plugin-space/src/operations/serialize.test.ts:58`

`Operation.serialize(addObject!)` uses a non-null assertion right after `expect(addObject).toBeDefined()`, which doesn't narrow the type — the pattern the no-casts rule flags. Replace with a narrowing check (e.g. `invariant(addObject)`) so `addObject` is genuinely typed non-nullable at this point.

# ERROR c7a7733c-149 no-casts `packages/plugins/plugin-space/src/operations/serialize.test.ts:72`

The sort comparator asserts both sides non-null with `a!.localeCompare(b!)` — another non-null assertion the no-casts rule flags. `a`/`b` come from `.split('.').at(-1)`, which is genuinely `string | undefined`; filter out `undefined` (or fall back to `''`) before sorting instead of asserting it away.

# WARN c7a7733c-150 no-sleep-in-test `packages/plugins/plugin-space/src/util/object-form.test.ts:18`

`const tick = () => new Promise((resolve) => setTimeout(resolve, 10));` is used (lines 37, 49, 53, 64, 78) to let `object-form.ts`'s internal `setTimeout(...)` (a real 0ms-delay macrotask) fire, assuming 10ms is always enough. Use `vi.useFakeTimers()` with `vi.advanceTimersByTimeAsync(0)` / `vi.runAllTimersAsync()` to flush that timer deterministically instead of racing it with a real wall-clock wait, per `no-sleep-in-test`.

# WARN c7a7733c-151 namespace-service-layers `packages/plugins/plugin-trello/src/services/trello-api.ts:136:3`

`TrelloCredentials` extends `Context.Service` and defines `static fromConnection` (line 136) and `static fromAccessToken` (line 150) on the tag class rather than as module-level exports. The class's own comment documents the resulting call site as `TrelloApi.TrelloCredentials.fromConnection(ref)`, the `Name.Name.member` doubling `namespace-service-layers` flags. Export both as module-level `const`s beside the `TrelloCredentials` tag and leave the class body empty.

# WARN c7a7733c-152 namespace-service-layers `packages/plugins/plugin-typefully/src/services/typefully-api.ts:47:3`

`TypefullyCredentials` extends `Context.Service` and defines its layer constructor as `static fromConnection` (line 47) on the tag class instead of a module-level export, forcing callers (e.g. `runConnection` in this same file, line 324) through `TypefullyCredentials.fromConnection(...)` accessed via the namespace import — the same doubling pattern `namespace-service-layers` flags for `Context.Service` tags. Move `fromConnection` to a module-level `const` beside the tag and leave the class body empty.

# WARN c7a7733c-153 no-sleep-in-test `packages/sdk/client-services/src/packlets/services/effect-rpc.test.ts:232`

`await sleep(50); expect(called).toBe(false);` asserts the handler has not run yet after an arbitrary delay — a negative assertion racing real time, which `no-sleep-in-test` calls out directly. Since the gate is a `Trigger` (`ready`), assert the pending state through the trigger/dispatch machinery itself (or simply drop the timing-dependent check and rely on the subsequent `ready.wake(); await request; expect(called).toBe(true);`) instead of sleeping first.

# WARN c7a7733c-154 namespace-service-layers `packages/sdk/client/src/client/client-service.ts:17:3`

`ClientService` extends `Context.Service` and hangs two layer constructors off the tag itself: `static fromClient` (line 17) and `static layer` (line 19). Per `namespace-service-layers`, a namespace-style consumer would have to spell `ClientService.ClientService.layer` instead of `ClientService.layer`. Move both out to module-level `const`s (`export const fromClient = (client: Client) => Layer.succeed(ClientService, client);` and `export const layer = Layer.effect(ClientService, ...)`) declared beside the tag, leaving the class body empty.

# WARN c7a7733c-155 no-sleep-in-test `packages/sdk/client/test/e2e/sync.test.ts:117`

`waitForSync`'s `setInterval(async () => { ... }, 500)` polls `db.getAutomergeSyncState()` every 500ms to detect sync completion, and the call site even notes "its likely that this could miss the mutation and stil report that the sync has completed" — the busy-poll's own flakiness, called out by `no-sleep-in-test`. Prefer subscribing to the database's sync-state changes (an event/observable) and resolving on the first matching update, or use the `waitForCondition` helper from `@dxos/async` (already used for the same purpose in `echo-client-e2e/src/query.test.ts`) rather than a hand-rolled `setInterval` loop.

# WARN c7a7733c-156 namespace-service-layers `packages/sdk/config/src/config-service.ts:68:3`

`ConfigService` extends `Context.Service` and hangs two layer constructors off the tag itself: `static layerMemory` (line 68) and `static fromConfig` (line 70). Per `namespace-service-layers`, this forces a namespace-style consumer to spell `ConfigService.ConfigService.layerMemory` instead of `ConfigService.layerMemory`. Move both out to module-level `const`s (`export const layerMemory = Layer.effect(ConfigService, Effect.succeed(memoryConfig));` and `export const fromConfig = (config: Config) => Layer.succeed(ConfigService, config);`) declared beside the tag, leaving the class body empty.

# ERROR c7a7733c-157 no-casts `packages/sdk/observability/test/e2e/metrics-export.test.ts:40:29`

The `attributesOf` helper takes `raw: any[]`, widening the OTLP attribute array to `any` instead of typing it per the `no-casts` rule. The wire shape used right below (`entry.key`, `entry.value?.stringValue`, `entry.value?.intValue`) is known, so give the parameter a local interface such as `{ key: string; value?: { stringValue?: string; intValue?: string } }[]` instead of `any[]`.

# ERROR c7a7733c-158 no-casts `packages/sdk/observability/test/e2e/metrics-export.test.ts:72:42`

The `.map((point: any) => ...)` callback parameter is typed `any`, again suppressing the type checker per `no-casts`. The fields accessed (`asInt`, `asDouble`, `count`, `attributes`, `bucketCounts`) are all known OTLP data-point fields, so replace `any` with a local interface describing that shape (or reuse one shared with `attributesOf`'s point-list caller) rather than widening to `any`.
