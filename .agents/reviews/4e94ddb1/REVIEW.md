---
branch: claude/gracious-planck-hc0fmi
commit: 4e94ddb1dff821af443851dae49909778aae7289
base: bd06669eee461b4c350d62dec88da8f2c4b233d9
mode: default
createdAt: 2026-09-14T02:08:49.941Z
isFinalized: true
groups: 20
rules: [declare-optional-services-with-noop-layers, import-as-namespace-is-all-or-nothing, inline-obj-parent, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-sleep-in-test, no-trivial-wrappers-over-official-apis, operations-take-refs-not-ids]
reviewId: 4e94ddb1
---

_68 error(s), 176 warning(s)._

# WARN 4e94ddb1-1 import-as-namespace-is-all-or-nothing `packages/common/crx-protocol/src/Proxy.ts:42:14`

`Proxy.ts` carries `// @import-as-namespace` (namespace `Proxy`), but declares `export const ProxyError = Schema.Literals([...])` / `export type ProxyError = ...` — a member prefixed with the module's own namespace name. Per the rule ("`Options`, not `FooOptions` — callers write `Foo.Options` either way"), this should be named `Error` so callers write `Proxy.Error` instead of the redundant `Proxy.ProxyError`.

# WARN 4e94ddb1-2 namespace-service-layers `packages/common/effect/src/layers.test.ts:18:3`

`Client extends Context.Service` and defines `static layer = Layer.effect(Client, ...)` on the class body. Per `namespace-service-layers`, export `layer` as a module-level `const` beside the (empty) tag class rather than a static member.

# WARN 4e94ddb1-3 no-sleep-in-test `packages/common/feed-store/src/feed-queue.browser.test.ts:44:7`

Same `sleep(400)`-before-close pattern as `feed-queue.test.ts`'s `'queue closed while reading'` test — an arbitrary wait standing in for a real "reader is now blocked" signal. Prefer a deterministic condition (e.g. via `queue.updated`) over the fixed delay.

# WARN 4e94ddb1-4 no-sleep-in-test `packages/common/feed-store/src/feed-queue.test.ts:59:7`

`await sleep(400)` inside `untilPromise` is used to guess that the concurrent `pop()`-loop has drained the 10 pre-written blocks and is now parked waiting for an 11th, before calling `queue.close()`. `untilPromise` is a trivial passthrough (`(cb) => cb()`), so there is no retry/condition backing this — it is a fixed-delay assumption about a race, which is exactly the flakiness the rule targets. Replace it with a deterministic signal (e.g. observe `queue.updated`/index reaching the written count) before closing.

# WARN 4e94ddb1-5 no-sleep-in-test `packages/common/feed-store/src/feed-queue.test.ts:96:7`

Same pattern as the `'queue closed while reading'` test above (`await sleep(400)` before `feedStore.close()`), guessing that the reader loop is blocked on the next `pop()` rather than waiting on an explicit signal. Use a deterministic wait (e.g. an event/counter reaching the written block count) instead of the fixed delay.

# ERROR 4e94ddb1-6 no-casts `packages/common/test-utils/src/claude-agent.ts:40:9`

`Turn.events` is typed `any[]`, so every consumer of a finished turn's event log gets no shape checking at all. Per `no-casts`, give it a real (even if loose) union for the stream-json event shapes this file already parses, instead of widening the field to `any`.

# ERROR 4e94ddb1-7 no-casts `packages/common/test-utils/src/claude-agent.ts:51:10`

`#events: any[] = []` is the backing store for the same untyped event log. Per `no-casts`, type it with the real event union rather than `any[]` — the constructor already knows exactly what `JSON.parse` on a `claude --print` stream-json line produces.

# ERROR 4e94ddb1-8 no-casts `packages/common/test-utils/src/claude-agent.ts:54:20`

`#onEvent?: (event: any) => void` widens the one callback every event flows through. Per `no-casts`, give `event` the same real event type used elsewhere in the file instead of `any`.

# ERROR 4e94ddb1-9 no-casts `packages/common/test-utils/src/claude-agent.ts:242:16`

`let event: any;` receives the result of `JSON.parse(line)` directly. Per `no-casts`, declare it `unknown` and narrow (or type it with the real event union) instead of widening to `any`, so a malformed event is caught here rather than silently propagated.

# ERROR 4e94ddb1-10 no-casts `packages/common/test-utils/src/claude-agent.ts:256:30`

`toolCallNames`'s `events: any[]` parameter throws away the type of the very events this module just typed as `Turn.events`. Per `no-casts`, take the real event array type instead of `any[]`.

# ERROR 4e94ddb1-11 no-casts `packages/common/test-utils/src/claude-agent.ts:260:19`

`.filter((block: any) => block?.type === 'tool_use')` widens the content-block parameter to `any`. Per `no-casts`, type `block` as the real assistant-message content-block union so the `type === 'tool_use'` check narrows it instead of suppressing checking entirely.

# ERROR 4e94ddb1-12 no-casts `packages/common/test-utils/src/claude-agent.ts:261:16`

`.map((block: any) => String(block.name))` repeats the same widened `any` on the content block. Per `no-casts`, use the real content-block type (after the `tool_use` narrowing above) instead of `any`.

# WARN 4e94ddb1-13 import-as-namespace-is-all-or-nothing `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:25:1`

This imports `getSession, hydrate` as named members directly from `@dxos/compute/AgentService`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as AgentService from '@dxos/compute/AgentService'` (or `import { AgentService } from` the package barrel) and reference the members as `AgentService.<Member>`.

# WARN 4e94ddb1-14 import-as-namespace-is-all-or-nothing `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:104:18`

`AgentService.ts` carries `// @import-as-namespace` (namespace `AgentService`), but declares `export interface AgentServiceOptions { ... }` — a member self-prefixed with the module's own name. Per the rule's own example ("`Options`, not `FooOptions`"), this should be named `Options`, so callers write `AgentService.Options` rather than `AgentService.AgentServiceOptions`.

# ERROR 4e94ddb1-15 no-casts `packages/core/compute/ai/src/AiParser.test.ts:612:13`

The `tool-result` part literal is cast wholesale `as any` to get past `Response.makePart`'s type check. Per `no-casts`, either build a value that actually satisfies `Response.makePart`'s parameter type, or give the object literal an explicit, correctly-typed annotation instead of casting away the checking.

# ERROR 4e94ddb1-16 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:110:17`

`capture: (body: any) => void` widens the captured-request-body callback to `any`, and every call site below (`let body: any`, `(message: any) =>`, etc.) inherits the same untyped shape. Per `no-casts`, give `capture` a real parameter type — a minimal interface for the OpenAI/Ollama wire body this test asserts against — instead of `any`.

# ERROR 4e94ddb1-17 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:195:19`

`let deepseek: any;` receives a captured request body with no type. Per `no-casts`, type it with the same wire-body shape recommended for `captureRequestBody` above instead of `any`.

# ERROR 4e94ddb1-18 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:199:17`

`let openai: any;` is the same pattern as `deepseek` above — an untyped captured body. Per `no-casts`, give it a real type instead of `any`.

# ERROR 4e94ddb1-19 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:204:32`

`assistantOf`'s `body: any` parameter and its inline `(message: any) =>` callback both widen to `any` on this one line. Per `no-casts`, type `body` (and therefore `message`) with the real wire-body/message shape instead of `any`.

# ERROR 4e94ddb1-20 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:216:15`

`let body: any;` is another untyped captured request body (see the `capture` callback at line 110). Per `no-casts`, type it instead of widening to `any`.

# ERROR 4e94ddb1-21 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:221:52`

`body.messages.find((message: any) => ...)` widens the message parameter to `any` rather than inferring it from a typed `body`. Per `no-casts`, fix this at the source by typing `body` (line 216) so `message` is inferred, instead of annotating it `any` here.

# ERROR 4e94ddb1-22 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:250:15`

`let body: any;` repeats the untyped captured-body pattern in a third test case. Per `no-casts`, give it a real type instead of `any`.

# ERROR 4e94ddb1-23 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:255:55`

`body.messages.filter((message: any) => ...)` again widens the message parameter to `any` instead of letting it flow from a typed `body`. Per `no-casts`, fix the `body` type at its source (line 250) rather than annotating this callback `any`.

# ERROR 4e94ddb1-24 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:258:48`

`assistants[0].tool_calls.map((call: any) => call.id)` widens the tool-call parameter to `any`. Per `no-casts`, type it with the real OpenAI/Ollama tool-call shape instead of `any`.

# ERROR 4e94ddb1-25 no-casts `packages/core/compute/ai/src/resolvers/ChatCompletionsAdapter.test.ts:436:57`

`(part as any).id` casts a parsed stream part to `any` to read `.id` off it. Per `no-casts`, narrow `part` to the specific part variant that actually carries `id` (a type guard on `part.type`) instead of casting past the type.

# WARN 4e94ddb1-26 namespace-service-layers `packages/core/compute/ai/src/tools/tool-execution-service.ts:25:3`

`ToolExecutionService extends Context.Service` carries `static layerEmpty = Layer.succeed(...)` on the class body. Move it to a module-level `export const layerEmpty = ...` beside the (now-empty) tag class, per `namespace-service-layers`.

# WARN 4e94ddb1-27 namespace-service-layers `packages/core/compute/ai/src/tools/tool-execution-service.ts:37:3`

The operation accessor `static handlersFor = (...) => ToolExecutionService.use(...)` is likewise hung on the `Context.Service` subclass. `namespace-service-layers` calls for the service's operations to be module-level accessors built on `Context.Service.use`, not class statics — export `handlersFor` as a module-level `const`.

# WARN 4e94ddb1-28 namespace-service-layers `packages/core/compute/ai/src/tools/tool-resolver-service.ts:27:3`

`ToolResolverService extends Context.Service` carries `static layerEmpty = Layer.succeed(...)`. Per `namespace-service-layers`, hoist it to a module-level `export const layerEmpty = ...` and leave the class body empty.

# WARN 4e94ddb1-29 namespace-service-layers `packages/core/compute/ai/src/tools/tool-resolver-service.ts:31:3`

`static resolve = (id) => ToolResolverService.use(...)` is an operations accessor hung on the tag class. `namespace-service-layers` requires these as module-level accessors built on `Context.Service.use`, e.g. `export const resolve = ...`, not statics.

# WARN 4e94ddb1-30 namespace-service-layers `packages/core/compute/ai/src/tools/tool-resolver-service.ts:34:3`

`static resolveToolkit = (ids) => ...` is another operations accessor defined as a class static on `ToolResolverService`. Export it as a module-level `const` instead, per `namespace-service-layers`.

# ERROR 4e94ddb1-31 no-casts `packages/core/compute/assistant-evals/src/Scorer.ts:27:89`

`Memo`'s service shape is `{ readonly cache: Map<unknown, Exit.Exit<any, any>> }`, widening both the success and error type parameters of the memoized `Exit` to `any`. Per `no-casts`, give the cache real `A`/`E` type parameters (even if generic on `Memo` itself) instead of `any, any`.

# WARN 4e94ddb1-32 no-trivial-wrappers-over-official-apis `packages/core/compute/assistant-evals/src/Scorer.ts:154:7`

`describe` is a module-local one-line helper whose body is a single call to `Cause.pretty(cause)`, used at two call sites in this file. It only renames the official `Cause.pretty` API without adding any logic; inline `Cause.pretty(exit.cause)` at each call site instead.

# ERROR 4e94ddb1-33 no-casts `packages/core/compute/assistant-evals/src/Scorer.ts:186:43`

`new Map<unknown, Exit.Exit<any, any>>()` repeats the same widened `Exit` type parameters as the `Memo` service shape above. Per `no-casts`, use real type parameters here instead of `any, any`.

# ERROR 4e94ddb1-34 no-casts `packages/core/compute/assistant-evals/src/Usage.ts:63:44`

`response: ReadonlyArray<Response.AllParts<any>>` widens `Response.AllParts`'s generic parameter to `any` in a function signature. Per `no-casts`, supply the real part-content type `AllParts` is generic over instead of `any`.

# WARN 4e94ddb1-35 no-trivial-wrappers-over-official-apis `packages/core/compute/assistant-evals/src/Usage.ts:73:9`

`attribute` is a function-local one-line helper whose body is a single call to `span.attributes.get(key)`, used at six call sites within `fromResponse` (`attribute('gen_ai.request.temperature')`, `attribute('gen_ai.system')`, `attribute('dxos.ai.input')`, etc.). Per the rule, this adds no branching, error handling, or derived value over the official span-attributes API; inline `span.attributes.get(key)` at each call site instead.

# WARN 4e94ddb1-36 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/agent/operations/definitions.ts:11:1`

This imports `AgentService` as named members directly from `@dxos/compute/AgentService`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as AgentService from '@dxos/compute/AgentService'` (or `import { AgentService } from` the package barrel) and reference the members as `AgentService.<Member>`.

# WARN 4e94ddb1-37 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/skills/agent/operations/relay.ts:13:1`

This imports `getSession` as named members directly from `@dxos/compute/AgentService`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as AgentService from '@dxos/compute/AgentService'` (or `import { AgentService } from` the package barrel) and reference the members as `AgentService.<Member>`.

# WARN 4e94ddb1-38 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:13:1`

This imports `getSession` as named members directly from `@dxos/compute/AgentService`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as AgentService from '@dxos/compute/AgentService'` (or `import { AgentService } from` the package barrel) and reference the members as `AgentService.<Member>`.

# WARN 4e94ddb1-39 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-toolkit/src/types/McpServer.ts:11:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-40 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant/src/request/format.ts:13:1`

This imports `EntityNotFoundError` as named members directly from `@dxos/echo/Error`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Error from '@dxos/echo/Error'` (or `import { Error } from` the package barrel) and reference the members as `Error.<Member>`.

# WARN 4e94ddb1-41 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant/src/types/Agent.ts:13:1`

This imports `EntityNotFoundError` as named members directly from `@dxos/echo/Error`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Error from '@dxos/echo/Error'` (or `import { Error } from` the package barrel) and reference the members as `Error.<Member>`. Note this file *also* correctly imports `Annotation` as a whole namespace from `@dxos/echo` a few lines above — the `Error` import should follow the same pattern.

# WARN 4e94ddb1-42 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant/src/types/Chat.ts:15:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-43 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/ProcessHandle.ts:5:1`

`ProcessHandle.ts` carries `// @import-as-namespace` and sits alongside `ProcessManager.ts`, `ProcessMonitor.ts`, `LayerStack.ts` and the rest of `compute-runtime/src`, every one of which the package barrel (`src/index.ts`) re-exports as `export * as <Name> from './<Name>.ts'` — except this one. `ProcessHandle` is imported only internally by `ProcessManager.ts` and never appears in the barrel under its own name, so the directive and the barrel disagree on whether it is a namespace module. Either add `export * as ProcessHandle from './ProcessHandle.ts';` to `src/index.ts`, or drop the directive if the module is meant to stay a private implementation detail.

# ERROR 4e94ddb1-44 no-casts `packages/core/compute/compute-runtime/src/RemoteProcessHandle.test.ts:154:6`

`traceMessage`'s return value is built as a partial object and pushed through the double-cast escape hatch `as unknown as Trace.Message`. Per `no-casts`, either fill in the fields `Trace.Message` actually requires, or give the fixture builder its own narrower return type instead of laundering it through `unknown`.

# WARN 4e94ddb1-45 import-as-namespace-is-all-or-nothing `packages/core/compute/compute-runtime/src/SwarmTraceSink.ts:9:18`

`SwarmTraceSink.ts` carries `// @import-as-namespace` (namespace `SwarmTraceSink`), but declares `export interface SwarmTraceSinkOptions { ... }` — a member prefixed with the module's own namespace name. Per the rule ("`Options`, not `FooOptions`"), this should be renamed `Options`, so callers reach it as `SwarmTraceSink.Options` instead of `SwarmTraceSink.SwarmTraceSinkOptions`.

# WARN 4e94ddb1-46 no-sleep-in-test `packages/core/compute/compute-runtime/src/TriggerMonitor.test.ts:320:11`

The test polls a real wall-clock `setTimeout(resolve, 20)` up to 150 times waiting for `registry.get(monitor.triggers).length` to become nonzero, instead of subscribing to the registry/atom directly or using `waitForCondition`. The comment explains why `Effect.sleep` won't work under `TestClock`, but that only rules out one alternative — a busy-poll loop with a real timer is exactly the pattern the rule forbids. Prefer subscribing to the atom's change notification (or wrapping the same loop in `@dxos/async`'s `waitForCondition`) so the wait is driven by the registry itself rather than a guessed 20ms cadence times 150 attempts.

# WARN 4e94ddb1-47 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:249:3`

`TriggerDispatcher` extends `Context.Service`, and its `layer` constructor is hung off the class as `static layer = (...)`. Per `namespace-service-layers`, export it as a module-level `const layer = (...)` beside the tag instead, leaving the class body empty — otherwise a namespace-import consumer must write `TriggerDispatcher.TriggerDispatcher.layer(...)`.

# WARN 4e94ddb1-48 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/types/Project.ts:10:1`

This imports `FormInlineAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-49 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/types/Script.ts:10:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-50 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/types/Template.ts:11:1`

This imports `EntityNotFoundError` as named members directly from `@dxos/echo/Error`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Error from '@dxos/echo/Error'` (or `import { Error } from` the package barrel) and reference the members as `Error.<Member>`.

# WARN 4e94ddb1-51 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/types/Trigger.ts:14:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-52 import-as-namespace-is-all-or-nothing `packages/core/compute/conductor/src/nodes/registry.ts:11:1`

This imports `instanceOf as isInstanceOf` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or use the already-imported `{ Obj }` from `@dxos/echo` a few lines above, which this file already has) and reference the member as `Obj.instanceOf`.

# WARN 4e94ddb1-53 import-as-namespace-is-all-or-nothing `packages/core/compute/edge-compute/src/EdgeProcessControl.ts:5:1`

`EdgeProcessControl.ts` carries `// @import-as-namespace`, like its siblings `EdgeOperationInvoker.ts`, `EdgeProcessManager.ts` and `EdgeTriggerManager.ts` — all four of which are consumed the same way (`import * as X from './X.ts'`) — but the package barrel (`src/index.ts`) re-exports only the other three (`export * as EdgeOperationInvoker/EdgeProcessManager/EdgeTriggerManager from ...`) and omits `EdgeProcessControl` entirely. Add `export * as EdgeProcessControl from './EdgeProcessControl.ts';` to the barrel, or remove the directive if it is meant to stay private to `EdgeProcessManager.ts`.

# WARN 4e94ddb1-54 declare-optional-services-with-noop-layers `packages/core/compute/edge-compute/src/EdgeProcessManager.ts:90:7`

`make`'s `Effect.serviceOption(RemoteTraceMonitor.Service)` reads a tag that the enclosing layer never declares: its return type is `Layer.Layer<RemoteProcessManager.Service, never, Registry.AtomRegistry>` (line 83), so `RemoteTraceMonitor.Service` is absent from the `R` union. Per `RemoteProcessManagerSpec` in `plugin-routine/src/capabilities/layer-specs.ts`, this layer is built inside a `LayerSpec.make({ requires: [ClientService, AtomRegistry.AtomRegistry], ... })` — since that `requires` list also omits `RemoteTraceMonitor.Service`, the tag is never in context for this stack even where the app provides a real swarm-backed `RemoteTraceMonitor.Service` elsewhere, so the `serviceOption` read comes back `None` unconditionally and every edge process manager silently falls back to ring-polling. Declare `RemoteTraceMonitor.Service` in `make`'s `Layer.Layer<..., ..., Registry.AtomRegistry | RemoteTraceMonitor.Service>` signature (and add it to the `RemoteProcessManagerSpec`'s `requires`), and have hosts that lack a swarm monitor provide `RemoteTraceMonitor.layerNoop` — which already exists for exactly this case — instead of leaving the requirement undeclared.

# WARN 4e94ddb1-55 import-as-namespace-is-all-or-nothing `packages/core/compute/functions-runtime-cloudflare/src/wrap-handler-for-cloudflare.ts:9:1`

This imports `JsonSchema as JsonSchemaType` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import type * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the member as `JsonSchema.JsonSchema`.

# WARN 4e94ddb1-56 import-as-namespace-is-all-or-nothing `packages/core/compute/link/src/AccessToken.ts:10:1`

This imports `HiddenAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-57 import-as-namespace-is-all-or-nothing `packages/core/compute/link/src/Connection.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-58 import-as-namespace-is-all-or-nothing `packages/core/compute/link/src/Cursor.ts:14:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-59 import-as-namespace-is-all-or-nothing `packages/core/compute/mcp-client/src/McpToolkit.ts:44:18`

`McpToolkit.ts` carries `// @import-as-namespace` (namespace `McpToolkit`), but declares `export interface McpToolkitOptions { ... }` — a member self-prefixed with the module's own name. Per the rule ("`Options`, not `FooOptions`"), this should be named `Options`, so callers write `McpToolkit.Options` rather than `McpToolkit.McpToolkitOptions`.

# WARN 4e94ddb1-60 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:233:7`

`await sleep(200); // Wait for the object to be saved without flush.` assumes the background save completed before closing and later reopening to verify persistence, with no condition backing the wait. Prefer polling the on-disk/storage state for the save to land rather than a fixed 200ms delay.

# WARN 4e94ddb1-61 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:270:7`

Same pattern as the `'new document persists without flush'` test above — `await sleep(200)` assumed to be long enough for the unflushed mutation to be auto-saved before closing. Replace with a deterministic wait on the save completing.

# WARN 4e94ddb1-62 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:111:5`

`await sleep(100); // Wait for the changes to be processed` is a fixed delay standing in for a completion signal from the synchronizer, and the following assertion (`expect(counter).to.be.greaterThanOrEqual(0)`) is true regardless of whether the sleep elapsed, so the wait is not actually synchronizing with anything observable. Replace it with a `waitForCondition`/`expect.poll` on `counter` (or another emitted event) tied to a specific expected value.

# WARN 4e94ddb1-63 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:142:9`

`await sleep(500); // Wait for auto-save (no explicit flush)` assumes the background auto-save has completed before the document/runtime is closed and later reopened to check persistence. There is no deterministic wait on the save completing; a slow CI runner can make this both flaky and needlessly slow. Poll for the persisted state (e.g. re-read via the storage layer) instead of sleeping a fixed 500ms.

# WARN 4e94ddb1-64 no-trivial-wrappers-over-official-apis `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:144:7`

`writeHandlerOf` is a module-local, one-line helper whose entire body is a single call to the official `Reflect.get(target, symbolReactiveHandler)`, and it is used at six call sites in this file (lines 233, 240, 247, 287, 294, 301). Per the rule, this only renames the API without adding branching, error handling, or a derived value; inline `Reflect.get(target, symbolReactiveHandler)` at each call site instead.

# WARN 4e94ddb1-65 no-trivial-wrappers-over-official-apis `packages/core/echo/echo/src/Json.test.ts:14:7`

`newId` is a test-local helper whose body is only `EntityId.random()`, forwarding to that single official API call and used at twelve call sites in this file. This is exactly the pattern the rule targets in tests: the reader must jump to the definition to learn which API mints the id and what it is passed, so inline `EntityId.random()` at each call site instead of keeping the alias.

# ERROR 4e94ddb1-66 no-casts `packages/core/halo/credentials/src/credentials/golden-credential.test.ts:112:37`

`(assertion as any).deviceKey` casts the decoded assertion to `any` to reach a field the buf-generated union type does not expose without narrowing. Per `no-casts`, narrow `assertion` by its `$typeName`/tag (as the surrounding test already does one line above) instead of casting to `any`.

# ERROR 4e94ddb1-67 no-casts `packages/core/halo/credentials/src/credentials/golden-credential.test.ts:138:16`

This one line carries four non-null assertions (`clone.subject!`, `.assertion!`, and the same pair again inside the template-literal interpolation) to reach and rewrite `typeUrl`. Per `no-casts`, guard `clone.subject` and `.assertion` explicitly (an early return or a narrowing `if`) instead of asserting them non-null four times on one line.

# WARN 4e94ddb1-68 no-trivial-wrappers-over-official-apis `packages/core/mesh/messaging/src/signal-manager/memory-signal-manager.test.ts:26:7`

`const message = (init: MessageInitShape<typeof MessageSchema>): Message => create(MessageSchema, init);` forwards `init` to `create(MessageSchema, init)` completely unchanged — no branching, no derived value, no default. Per `no-trivial-wrappers-over-official-apis`, this only renames the protobuf `create` API; inline `create(MessageSchema, {...})` at each of the ~9 call sites (or drop the helper and call `create` directly) so the reader sees which schema is being constructed without following the alias.

# ERROR 4e94ddb1-69 no-casts `packages/devtools/cli/src/commands/mcp/agent-e2e.test.ts:319:24`

`sessions[0]!.title` asserts the first element non-null; since `sessions` is a plain array under this project's TS config, `sessions[0]` is already typed as the element type (not `T | undefined`), so this `!` is not even guarding anything — it can simply be removed. Per `no-casts`, drop the non-null assertion (or add a real `toHaveLength`/length guard first if the intent is to document that expectation).

# ERROR 4e94ddb1-70 no-casts `packages/devtools/cli/src/commands/mcp/agent-e2e.test.ts:320:24`

`sessions[0]!.summary` repeats the same unnecessary non-null assertion as line 319. Per `no-casts`, remove the `!` (or add an explicit guard) instead of asserting.

# ERROR 4e94ddb1-71 no-casts `packages/devtools/cli/src/commands/mcp/agent-e2e.test.ts:340:70`

`uri(session!.id)` asserts `session` (from `const [session] = readSessions();`) non-null; again the destructured element is already non-optional under this project's config, so the assertion is asserting away nothing real and hides the case where `readSessions()` actually returns empty. Per `no-casts`, remove the `!` or add a real emptiness check.

# ERROR 4e94ddb1-72 no-casts `packages/devtools/cli/src/testing/mcp-session.ts:24:38`

`type Message = { id?: number; result?: any; ... }` widens the JSON-RPC `result` field to `any`. Per `no-casts`, type it `unknown` (callers already have to narrow per-method) instead of `any`.

# ERROR 4e94ddb1-73 no-casts `packages/devtools/cli/src/testing/mcp-session.ts:97:92`

`invoke(...): Promise<any>` widens this method's return type to `any`, so every caller loses checking on the operation's output. Per `no-casts`, return `Promise<unknown>` (or a real per-operation result type) instead of `any`.

# ERROR 4e94ddb1-74 no-casts `packages/experimental/ner/src/named-entity-recognition.test.ts:51:41`

`entities.filter((e: any) => ...)` annotates the callback parameter `any` even though `entities` is already a properly-typed array (inferred from the `.map` two lines above), so this widening is pure regression, not a necessity. Per `no-casts`, drop the `: any` annotation and let it infer, instead of widening.

# ERROR 4e94ddb1-75 no-casts `packages/experimental/ner/src/named-entity-recognition.test.ts:53:31`

`companies.forEach((company: any) => ...)` repeats the same unnecessary widening — `companies` is already typed via the `.filter` above. Per `no-casts`, remove the `: any` annotation instead of overriding a good inferred type with `any`.

# ERROR 4e94ddb1-76 no-casts `packages/experimental/ner/src/named-entity-recognition.ts:87:23`

`group.at(0)!.entity` asserts non-null on `Array#at`, which always returns `T | undefined` regardless of TS config (unlike index access), so this silently assumes `group` is non-empty. Per `no-casts`, guard `group.length` (or destructure with a fallback) before combining tokens instead of asserting `.at(0)!`.

# ERROR 4e94ddb1-77 no-casts `packages/experimental/ner/src/named-entity-recognition.ts:89:22`

`group.at(0)!.index` repeats the same unguarded `.at(0)!` non-null assertion as the `entity` field above. Per `no-casts`, rely on the single guard recommended for line 87 instead of asserting again here.

# ERROR 4e94ddb1-78 no-casts `packages/experimental/ner/src/named-entity-recognition.ts:90:21`

`group.at(0)!.word` is another non-null assertion on the same unguarded `.at(0)`. Per `no-casts`, this should fall out of the guard recommended at line 87 rather than asserting independently.

# ERROR 4e94ddb1-79 no-casts `packages/experimental/ner/src/named-entity-recognition.ts:91:22`

`group.at(0)!.start` repeats the pattern again. Per `no-casts`, cover it with the same guard as the other `.at(0)!` uses in this object literal instead of a fourth independent assertion.

# ERROR 4e94ddb1-80 no-casts `packages/experimental/ner/src/named-entity-recognition.ts:92:22`

`group.at(-1)!.end` asserts non-null on the *last* element instead of the first, so a length guard for `.at(0)` needs to cover this case too (an empty array makes both undefined). Per `no-casts`, guard emptiness once and read both ends of `group` without asserting.

# WARN 4e94ddb1-81 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/hooks/useFilteredTypes.ts:9:1`

This imports `HiddenAnnotation, getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-82 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/hooks/useFilteredTypes.ts:10:1`

This imports `Kind as EntityKind` as named members directly from `@dxos/echo/Entity`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Entity from '@dxos/echo/Entity'` (or `import { Entity } from` the package barrel) and reference the members as `Entity.<Member>`.

# WARN 4e94ddb1-83 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.ts:16:1`

This imports `HiddenAnnotation, getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-84 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.ts:17:1`

This imports `Kind as EntityKind` as named members directly from `@dxos/echo/Entity`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Entity from '@dxos/echo/Entity'` (or `import { Entity } from` the package barrel) and reference the members as `Entity.<Member>`.

# WARN 4e94ddb1-85 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:12:1`

This imports `getSession` as named members directly from `@dxos/compute/AgentService`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as AgentService from '@dxos/compute/AgentService'` (or `import { AgentService } from` the package barrel) and reference the members as `AgentService.<Member>`.

# ERROR 4e94ddb1-86 no-casts `packages/plugins/plugin-assistant/src/session-timeline/session-timeline.test.ts:23:41`

`subAgentFixture as unknown as Trace.Message[]` is the double-cast escape hatch, applied to an entire imported JSON fixture. Per `no-casts`, give the fixture file's shape a real (even if partial) type and adjust `buildSessionTimeline`'s test call to accept that narrower shape, instead of laundering the whole fixture through `unknown`.

# WARN 4e94ddb1-87 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/types/AssistantOperation.ts:12:1`

This imports `AgentService` as named members directly from `@dxos/compute/AgentService`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as AgentService from '@dxos/compute/AgentService'` (or `import { AgentService } from` the package barrel) and reference the members as `AgentService.<Member>`.

# WARN 4e94ddb1-88 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.stories.tsx:16:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-89 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.stories.tsx:16:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-90 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-blogger/src/types/Blog.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-91 namespace-service-layers `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:340:3`

This module is marked `@import-as-namespace`, so `Credentials` (a `Context.Service` subclass) carrying `static fromConnection = (...) => Layer.effect(Credentials, ...)` forces a namespace-import consumer to write `Credentials.Credentials.fromConnection(...)`. Export `fromConnection` as a module-level `const` beside the tag, per `namespace-service-layers`.

# WARN 4e94ddb1-92 namespace-service-layers `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:355:3`

Same issue as `fromConnection` above: `static fromAccessToken = (...) => Layer.effect(Credentials, ...)` is a layer constructor hung on the `@import-as-namespace`-marked `Credentials` tag class. Move it to a module-level `export const fromAccessToken = ...`.

# WARN 4e94ddb1-93 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-board/src/types/Board.ts:8:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-94 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-bookmarks/src/types/Bookmark.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-95 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-chess-com/src/types/ChessComAccount.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-96 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-chess/src/types/Chess.ts:10:1`

This imports `FormInputAnnotation, HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`. Note this file *also* correctly imports `Annotation` as a whole namespace from `@dxos/echo` a few lines above — the two imports are redundant with each other.

# WARN 4e94ddb1-97 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-chess/src/types/ChessPositionIndex.ts:10:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-98 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-chess/src/types/PlayerReview.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-99 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-claude/src/types/ClaudeAgentSession.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-100 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-claude/src/types/ClaudeManagedAgent.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-101 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-code/src/types/Spec.ts:10:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# ERROR 4e94ddb1-102 no-casts `packages/plugins/plugin-connector/src/components/CreateConnectionPanel/CreateConnectionPanel.tsx:120:26`

`onSave={(values: any) => submit(connector, values)}` widens `Form.Root`'s save callback to `any` in real (non-test) UI code. Per `no-casts`, type `values` with the same schema-derived type `Form.Root`'s `onSave` prop expects instead of `any`.

# WARN 4e94ddb1-103 no-echo-internal-in-sdk `packages/plugins/plugin-connector/src/types/ConnectorAnnotations.ts:9:1`

Imports `createAnnotationHelper` from `@dxos/echo/internal`, ECHO's private surface, to build `ConnectorAuthAnnotation` at line 47. Per `no-echo-internal-in-sdk`, use the public `Annotation.make` from `@dxos/echo` instead (the file already imports `Obj` from `@dxos/echo` on line 8) — pass a permissive `schema` (e.g. `Schema.Any`) since, per this annotation's own doc comment, its value is never serialized.

# WARN 4e94ddb1-104 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-debug/src/DebugPlugin.ts:17:13`

`DebugPlugin.ts` carries `// @import-as-namespace` (namespace `DebugPlugin`), but re-exports its options type under the self-prefixed name `DebugPluginOptions` (`export type { DebugPluginOptions } from './types/Debug.ts';`). Per the rule's naming guidance, this member should be exposed as `Options` (re-exported under that name, e.g. `export type { DebugPluginOptions as Options }`), so callers write `DebugPlugin.Options` instead of the redundant `DebugPlugin.DebugPluginOptions`.

# WARN 4e94ddb1-105 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:168:7`

`const usePlankContext = () => useContext(PlankContext);` is a module-local one-liner whose body is a single forward to React's `useContext`, with no branching, derived value, or default, and it is used at exactly one call site (line 453) in the same file. Per `no-trivial-wrappers-over-official-apis`, this renames `useContext` rather than removing duplication; inline `useContext(PlankContext)` at its one use site, or drop the wrapper.

# WARN 4e94ddb1-106 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-deck/src/DeckPlugin.ts:19:13`

`DeckPlugin.ts` carries `// @import-as-namespace` and is re-exported as the `DeckPlugin` namespace, so a member inside it must not repeat that name — per the rule, "`Options`, not `FooOptions` — callers write `Foo.Options` either way". `export type DeckPluginOptions = DeckCapabilities.DeckPluginOptions;` should be renamed to `export type Options = DeckCapabilities.DeckPluginOptions;`, giving callers `DeckPlugin.Options`.

# ERROR 4e94ddb1-107 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:107:100`

`FiberHandle.make<string | undefined, any>()` widens the fiber's error/result type parameter to `any` for `DeckCapabilities.Projection`. Per `no-casts`, use `DeckCapabilities.Projection`'s real error type there instead of `any`.

# WARN 4e94ddb1-108 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-game/src/util/index.ts:6:1`

This barrel adds `export * as GameUtil from './load-game.ts';` on top of the already-present flat `export * from './load-game.ts';` — uniquely among every plugin's `util/index.ts` (all others, e.g. `plugin-kanban`, `plugin-deck`, `plugin-space`, `plugin-illustrator`, use a plain flat re-export with no namespace wrapper). `load-game.ts` carries no `@import-as-namespace` directive and is not capital-cased, so this namespace-style re-export disagrees with the other three signals the rule requires to agree; either rename `load-game.ts` to `GameUtil.ts` and add the directive, or drop the `export * as GameUtil` wrapper and keep the plain re-export like its siblings.

# WARN 4e94ddb1-109 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-inbox/src/hooks/shadow.test.ts:35:9`

`const addNote = (value: string) => db.add(Obj.make(Note, { value }));` is a describe-local helper whose body is nothing but `Obj.make` immediately handed to `db.add` — it renames the ECHO API rather than removing duplication, per the rule. It is called at exactly two sites in the one test (`addNote('Draft')`, `addNote('Synced')`); inlining `db.add(Obj.make(Note, { value: 'Draft' }))` at each call site is no longer and keeps the database/object-creation API being exercised visible in the test body.

# WARN 4e94ddb1-110 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-magazine/src/types/CreateSubscription.ts:47:13`

`CreateSubscription.ts` carries `// @import-as-namespace` and is re-exported as the `CreateSubscription` namespace, but declares `export type CreateSubscriptionInput = ...` — a member prefixed with the module's own namespace name. Per the rule, it should be named `Input` (`export type Input = ...`), so callers reach it as `CreateSubscription.Input` instead of the redundant `CreateSubscription.CreateSubscriptionInput`.

# WARN 4e94ddb1-111 operations-take-refs-not-ids `packages/plugins/plugin-meeting/src/types/MeetingOperation.ts:58:5`

`HandlePayload`'s `meetingId` field is `Schema.optional(Schema.String)`, but the handler (`operations/handle-payload.ts`) parses it with `parseId` and uses the resulting `spaceId`/`objectId` to query the space for the Meeting object (`space.db.query(Query.select(Filter.id(objectId))).first()`). Per `operations-take-refs-not-ids`, this should be `Schema.optional(Ref.Ref(Meeting.Meeting))` so the operation carries the type alongside the identity and resolves through the database itself instead of the handler hand-rolling a space/object id parse and lookup.

# WARN 4e94ddb1-112 inline-obj-parent `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:86:3`

`project` is created at the top of `createProject` (`space.db.add(Project.make({ name: PROJECT_NAME }))`) well before `instructions` is constructed via `Instructions.make({...})`, so the parent is already known at `instructions`' construction time. Per `inline-obj-parent`, this should set `[Obj.Parent]: project` on the `Instructions.make` call rather than calling `Obj.setParent(instructions, project)` afterward; `Instructions.make` would need to forward the prop through to its internal `Obj.make(Instructions, {...})` call (or the call site can construct via `Obj.make` directly) to make that possible.

# WARN 4e94ddb1-113 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-registry/src/RegistryPlugin.ts:18:13`

`RegistryPlugin.ts` carries `// @import-as-namespace` (namespace `RegistryPlugin`), yet re-exports `RegistryPluginOptions` under its own prefixed name (`export type { RegistryPluginOptions };`). Following the rule's example ("`Options`, not `FooOptions`"), this should be renamed/re-exported as `Options` so callers use `RegistryPlugin.Options` rather than `RegistryPlugin.RegistryPluginOptions`.

# WARN 4e94ddb1-114 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-sample/src/types/SampleItem.ts:12:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-115 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-script/src/types/Notebook.ts:9:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-116 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-script/src/types/Notebook.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-117 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-search/src/search/exa.ts:11:1`

This imports `ReferenceAnnotationId` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-118 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-sequencer/src/types/Score.ts:9:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-119 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-sheet/src/components/SheetToolbar/useToolbarState.ts:27:14`

`useToolbarStateValue = (stateAtom) => useAtomValue(stateAtom)` is a one-expression forward of `useAtomValue` with no added branching, error handling, derived value, or default — it only renames the official `@effect/atom-react` hook. Callers should call `useAtomValue(stateAtom)` directly instead of importing this indirection.

# WARN 4e94ddb1-120 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-sheet/src/components/SheetToolbar/useToolbarState.ts:34:14`

`useToolbarStateRegistry = () => useContext(RegistryContext)` is a bare forward of `useContext` with nothing added (contrast the sibling `useSheetContext`-style hooks elsewhere in this codebase, which at least add a missing-context error). Per the rule, inline `useContext(RegistryContext)` at call sites rather than keeping this renaming wrapper.

# WARN 4e94ddb1-121 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-sheet/src/types/Sheet.ts:12:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-122 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/commands/database/add.ts:20:1`

This imports `HiddenAnnotation, getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-123 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/commands/database/add.ts:21:1`

This imports `Kind as EntityKind` as named members directly from `@dxos/echo/Entity`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Entity from '@dxos/echo/Entity'` (or `import { Entity } from` the package barrel) and reference the members as `Entity.<Member>`.

# WARN 4e94ddb1-124 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/commands/space/schema/list/list.ts:13:1`

This imports `getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-125 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:17:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-126 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/containers/SpaceHomeArticle/SpaceHomeArticle.stories.tsx:17:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-127 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/containers/SpaceHomeDashboard/SpaceHomeDashboard.stories.tsx:14:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-128 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:14:1`

This imports `HiddenAnnotation, getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-129 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:15:1`

This imports `Kind as EntityKind` as named members directly from `@dxos/echo/Entity`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Entity from '@dxos/echo/Entity'` (or `import { Entity } from` the package barrel) and reference the members as `Entity.<Member>`.

# WARN 4e94ddb1-130 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:18:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-131 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/dashboard/shortcuts.test.ts:11:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-132 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-space/src/hooks/useRelatedObjects.ts:10:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-133 operations-take-refs-not-ids `packages/plugins/plugin-space/src/types/SpaceOperation.ts:135:5`

`WaitForObject`'s input field `id: Schema.optional(Schema.String)` names the ECHO object to wait for (the handler stores it as `awaiting`, and `AwaitingObject.tsx` matches it against live objects via `Obj.getURI(object) === id`). This is a raw object identifier rather than `Ref.Ref(Obj.Unknown)`; per `operations-take-refs-not-ids` it should carry a Ref so the identity resolves through the database rather than a bespoke DXN string comparison.

# WARN 4e94ddb1-134 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-spacetime/src/types/Model.ts:10:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-135 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-spacetime/src/types/Scene.ts:10:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-136 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.stories.tsx:12:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-137 inline-obj-parent `packages/plugins/plugin-studio/src/templates/studio.ts:54:7`

`lightbox` is created fresh via `Lightbox.make({ name: 'Lightbox' })` while `project` already exists in scope, then immediately parented with `Obj.setParent(lightbox, project)` two statements later. Per `inline-obj-parent`, the parent should be passed at make time instead — the very next block in this same function already does this correctly for `task` (`Task.make({ [Obj.Parent]: taskSet, ... })`). Fix by threading `[Obj.Parent]: project` into the `Lightbox.make` call (extending it to forward extra props, or constructing via `Obj.make(Lightbox, { [Obj.Parent]: project, ... })` directly) and dropping the trailing `Obj.setParent` call.

# WARN 4e94ddb1-138 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-studio/src/types/Frame.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-139 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-studio/src/types/Lightbox.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-140 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-studio/src/types/MediaArtifact.ts:12:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-141 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-studio/src/types/Storyboard.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-142 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-studio/src/types/Variant.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-143 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-support/src/types/Support.ts:9:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# ERROR 4e94ddb1-144 no-casts `packages/plugins/plugin-tasks/src/operations/report-session.test.ts:115:24`

`sessions[0]!.session.title` asserts non-null on a plain array element that is already non-optional under this project's TS config (no `noUncheckedIndexedAccess`), so the `!` guards nothing. Per `no-casts`, drop it (or add a real `toHaveLength` check first) instead of asserting.

# ERROR 4e94ddb1-145 no-casts `packages/plugins/plugin-tasks/src/operations/report-session.test.ts:245:16`

`row!.dxn` asserts non-null on `row` from `const [row] = reported.tasks ?? [];`, which is likewise already non-optional after destructuring under this config. Per `no-casts`, remove the assertion or add an explicit length check on `reported.tasks` instead.

# ERROR 4e94ddb1-146 no-casts `packages/plugins/plugin-tasks/src/operations/report-session.test.ts:246:16`

`row!.status` repeats the same unnecessary assertion on `row`. Per `no-casts`, this should be covered by the same fix as line 245 rather than asserted independently.

# ERROR 4e94ddb1-147 no-casts `packages/plugins/plugin-tasks/src/operations/report-session.test.ts:247:16`

`row!.project` is a third repetition of the same unguarded assertion on `row`. Per `no-casts`, fix it at the one guard recommended above instead of asserting again.

# ERROR 4e94ddb1-148 no-casts `packages/plugins/plugin-tasks/src/operations/report-session.test.ts:248:16`

`row!.projectDxn` repeats the pattern a fourth time on the same `row`. Per `no-casts`, all four of these (lines 245-248) should be resolved by one guard on `reported.tasks` instead of four separate `!` assertions.

# ERROR 4e94ddb1-149 no-casts `packages/plugins/plugin-tasks/src/operations/report-session.test.ts:280:29`

`byId.sessions[0]!.session.state` asserts non-null on another plain array element. Per `no-casts`, drop the `!` (already non-optional under this config) or add a real length check instead.

# ERROR 4e94ddb1-150 no-casts `packages/plugins/plugin-tasks/src/operations/update-task.test.ts:63:43`

`task.assignee!.subject!` asserts non-null twice in one expression, right after the line above (`task.assignee?.role`) correctly used optional chaining for the same field. Per `no-casts`, use `?.` (or an explicit guard) here too instead of `!`.

# ERROR 4e94ddb1-151 no-casts `packages/plugins/plugin-tasks/src/operations/update-task.test.ts:90:43`

`task.assignee!.subject!` repeats the identical double non-null assertion in a second test. Per `no-casts`, apply the same `?.`/guard fix recommended for line 63 instead of asserting.

# WARN 4e94ddb1-152 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-tasks/src/types/Journal.ts:10:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-153 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-terra/src/types/Terra.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-154 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-terra/src/types/TerraObject.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-155 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:40:1`

This imports `qualifyId` as named members directly from `@dxos/graph/GraphNode`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as GraphNode from '@dxos/graph/GraphNode'` (or `import { GraphNode } from` the package barrel) and reference the members as `GraphNode.<Member>`.

# WARN 4e94ddb1-156 inline-obj-parent `packages/plugins/plugin-trip/src/operations/extractor/trip-extractor.ts:402:9`

In every path through this `else` branch, `trip` is already bound (either an existing/nearby trip or the just-made `Trip.make(...)` at line 392) before `booking = Booking.make({...})` runs, so the parent is known at `booking`'s construction. Per `inline-obj-parent`, add `[Obj.Parent]: trip` to the `Booking.make(...)` props (which already forwards `Obj.MakeProps`, so this needs no factory change) and remove the following `Obj.setParent(booking, trip)` call.

# WARN 4e94ddb1-157 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-trip/src/types/Booking.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-158 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-trip/src/types/Trip.ts:11:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-159 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-video/src/types/Video.ts:10:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-160 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-voxel/src/types/Voxel.ts:8:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-161 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-zen/src/types/Dream.ts:8:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-162 import-as-namespace-is-all-or-nothing `packages/reflect/introspect/src/__fixtures__/packages/pkg-a/src/Task.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-163 import-as-namespace-is-all-or-nothing `packages/sdk/app-graph/src/AppGraphBuilder.ts:307:1`

This re-exports `addExtension, destroy, explore, flush, release, removeExtension` as named members directly from `@dxos/graph/GraphBuilder`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, a consumer (including a re-exporting barrel) must go through the namespace rather than pulling individual members out of it. Fix: re-export the namespace itself, `export * as GraphBuilder from '@dxos/graph/GraphBuilder'`, and have callers use `GraphBuilder.addExtension` etc.

# ERROR 4e94ddb1-164 no-casts `packages/sdk/app-graph/src/path-resolution.test.ts:521:47`

`representAfterResolve`'s `pairs: any[]` parameter widens to `any` even though `PathResolution.resolveUrl` (which it is immediately passed to) already declares `pairs` as `ReadonlyArray<UrlPair>`. Per `no-casts`, use `ReadonlyArray<UrlPair>` here instead of `any[]`.

# WARN 4e94ddb1-165 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/echo/Query.ts:14:1`

This imports `ReferenceAnnotationId, type ReferenceAnnotationValue, getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-166 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/echo/TypeOptions.test.ts:9:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-167 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/echo/TypeOptions.ts:11:1`

This imports `HiddenAnnotation, getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-168 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/echo/TypeOptions.ts:12:1`

This imports `Kind as EntityKind` as named members directly from `@dxos/echo/Entity`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Entity from '@dxos/echo/Entity'` (or `import { Entity } from` the package barrel) and reference the members as `Entity.<Member>`.

# WARN 4e94ddb1-169 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/types/CollectionModel.test.ts:12:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-170 import-as-namespace-is-all-or-nothing `packages/sdk/app-toolkit/src/types/CollectionModel.ts:12:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-171 no-sleep-in-test `packages/sdk/client-services/src/packlets/pipeline/pipeline.test.ts:133:5`

`await sleep(1000)` after `pipeline.start()` assumes the pipeline has caught up and is idle-polling before the test pauses it and changes the cursor, with no condition tied to that assumption. Since the pipeline exposes `pause()`/consumption events, prefer waiting on an observable signal (e.g. a "caught up" event or polling `pipeline.consume()` progress) instead of a fixed 1s delay.

# WARN 4e94ddb1-172 no-sleep-in-test `packages/sdk/client-services/src/packlets/services/feed-syncer.test.ts:298:5`

`await new Promise((resolve) => setTimeout(resolve, 250))` is used to assume the server-appended block has replicated to the client before querying for it, rather than polling for the expected state. The sibling `edge-feed-replicator.test.ts` in this same package consistently uses `expect.poll(...)` for this exact "wait for async replication" shape — follow that pattern here instead of the fixed delay.

# ERROR 4e94ddb1-173 no-casts `packages/sdk/client/src/halo/halo-proxy.test.ts:35:5`

The fake `serviceProvider` object is pushed through `as unknown as ClientServicesProvider`, the double-cast escape hatch. Per `no-casts`, either implement enough of `ClientServicesProvider`'s real shape to satisfy the type, or give the stub its own minimal interface and have `HaloProxy`'s constructor accept that narrower type in tests, instead of casting through `unknown`.

# WARN 4e94ddb1-174 no-trivial-wrappers-over-official-apis `packages/sdk/react-client/src/client/ClientProvider.test.tsx:36:9`

`render` is a describe-local helper whose entire body is a single call to `useClient()`, reused at two call sites (`renderHook(render, {...})`). Since `useClient` already has the exact `() => Client` shape `renderHook` expects, the wrapper adds nothing over passing `useClient` (or an inline `() => useClient()`) directly — per the rule, inline it so the hook under test stays visible at each `renderHook` call instead of behind a same-file rename.

# WARN 4e94ddb1-175 no-trivial-wrappers-over-official-apis `packages/sdk/react-client/src/client/useConfig.test.tsx:16:9`

`render` is a describe-local helper whose entire body is a single call to `useConfig()`, reused at three call sites (`renderHook(render)` / `renderHook(render, { wrapper })`). This matches the rule's trivial-wrapper pattern exactly — sibling tests in this package (`useSpaces.test.tsx`, `useDevices.test.tsx`) inline `renderHook(() => useSpaces(), { wrapper })` directly instead; do the same here (`renderHook(() => useConfig(), { wrapper })`) so the hook being tested is visible at the call site.

# WARN 4e94ddb1-176 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/experimental/json-schema.test.ts:10:1`

This imports `type Mutable` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-177 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/projection/format.ts:11:1`

This imports `type JsonSchema as JsonSchemaType` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-178 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/projection/projection.test.ts:15:1`

This imports `toJsonSchema` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-179 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/projection/projection.test.ts:16:1`

This imports `Ref` as named members directly from `@dxos/echo/Ref`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Ref from '@dxos/echo/Ref'` (or `import { Ref } from` the package barrel) and reference the members as `Ref.<Member>`.

# WARN 4e94ddb1-180 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/projection/projection.ts:13:1`

This imports `type JsonSchema as JsonSchemaType` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-181 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/projection/projection.ts:14:1`

This imports `type Mutable` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-182 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/StateMap.ts:11:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-183 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/TagIndex.ts:11:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-184 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/testing/deprecated.ts:8:1`

This imports `FieldLookupAnnotationId, GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-185 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/testing/generator.ts:8:1`

This imports `GeneratorAnnotationId, type GeneratorAnnotationValue, getTypeAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-186 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/testing/generator.ts:10:1`

This imports `type JsonSchema as JsonSchemaType` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-187 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/types/ViewModel.ts:13:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-188 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/types/ViewModel.ts:15:1`

This imports `type JsonSchema as JsonSchemaType, toEffectSchema` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-189 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/types/ViewModel.ts:16:1`

This imports `type Mutable` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-190 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/util/schema.ts:10:1`

This imports `type JsonSchema as JsonSchemaType, toEffectSchema` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-191 import-as-namespace-is-all-or-nothing `packages/sdk/schema/src/util/schema.ts:11:1`

This imports `type Mutable` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-192 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Account.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-193 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Channel.ts:10:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-194 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Event.ts:10:1`

This imports `DescriptionAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-195 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/File.ts:11:1`

This imports `FormInputAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-196 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Issue.ts:10:1`

This imports `GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-197 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Message.ts:10:1`

This imports `GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-198 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Milestone.ts:10:1`

This imports `GeneratorAnnotation, HiddenAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-199 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Organization.ts:10:1`

This imports `GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-200 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Person.ts:10:1`

This imports `GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-201 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Pipeline.ts:10:1`

This imports `FormInputAnnotation, GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-202 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/PullRequest.ts:10:1`

This imports `GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-203 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/RemoteSession.ts:10:1`

This imports `LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-204 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Repo.ts:10:1`

This imports `GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-205 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Task.ts:11:1`

This imports `GeneratorAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-206 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/TaskSet.ts:13:1`

This imports `GeneratorAnnotation, HiddenAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-207 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Thread.ts:10:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-208 import-as-namespace-is-all-or-nothing `packages/sdk/types/src/types/Transcript.ts:10:1`

This imports `HiddenAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# ERROR 4e94ddb1-209 no-casts `packages/stories/stories-assistant/src/stories/Studio.stories.tsx:65:25`

`binder: { bind: (props: any) => Promise<void> }` widens the chat binder's `bind` callback to `any`. Per `no-casts`, type `props` with the real object shape `binder.bind` is called with (`{ objects: Ref<...>[] }`) instead of `any`.

# WARN 4e94ddb1-210 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-assistant/src/testing/test-generator.ts:8:1`

This imports `type Mutable` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-211 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-canvas-compute/src/shapes/Function.tsx:10:1`

This imports `instanceOf as isInstanceOf` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-212 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-canvas-compute/src/shapes/Template.tsx:9:1`

This imports `toJsonSchema` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-213 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:10:1`

This imports `type Mutable` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-214 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-form/src/components/Form/FormField/fields/ArrayField/ArrayField.stories.tsx:10:1`

This imports `FormLayoutAnnotation, FormOrderedAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-215 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:9:1`

This imports `DEFAULT_LAYOUT_NAME, FormLayoutAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-216 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-form/src/components/ObjectProperties/ObjectProperties.stories.tsx:12:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-217 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx:12:1`

This imports `type Mutable` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-218 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-form/src/components/ViewEditor/ViewEditor.test.tsx:10:1`

This imports `instanceOf as isInstanceOf` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-219 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-table/src/model/table-model.ts:10:1`

This imports `type JsonSchema as JsonSchemaType, toEffectSchema` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# WARN 4e94ddb1-220 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-table/src/model/table-model.ts:11:1`

This imports `type Mutable, getSnapshot` as named members directly from `@dxos/echo/Obj`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Obj from '@dxos/echo/Obj'` (or `import { Obj } from` the package barrel) and reference the members as `Obj.<Member>`.

# WARN 4e94ddb1-221 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-table/src/types/Table.ts:12:1`

This imports `FormInputAnnotation, LabelAnnotation` as named members directly from `@dxos/echo/Annotation`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as Annotation from '@dxos/echo/Annotation'` (or `import { Annotation } from` the package barrel) and reference the members as `Annotation.<Member>`.

# WARN 4e94ddb1-222 import-as-namespace-is-all-or-nothing `packages/ui/react-ui-table/src/types/Table.ts:13:1`

This imports `type JsonSchema as JsonSchemaType` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.

# ERROR 4e94ddb1-223 no-casts `packages/ui/react-ui/src/components/Accordion/Accordion.tsx:46:72`

`defaultGetId`'s `(item as any)?.id` casts the generic `item` to `any` to read `.id` off it, even though `AccordionItemRecord` (the constraint on `T`) already exists to describe this shape. Per `no-casts`, fix `AccordionItemRecord` itself (see the `AccordionContext.ts` finding below) so it constrains an optional `id`, instead of casting per call site.

# ERROR 4e94ddb1-224 no-casts `packages/ui/react-ui/src/components/Accordion/AccordionContext.ts:10:33`

`export type AccordionItemRecord = any;` is a widened `any` type alias — the very type meant to constrain every `T extends AccordionItemRecord` in this compound component ends up constraining nothing. Per `no-casts`, give it a real shape (e.g. `{ id?: string }` plus an index signature for caller-defined fields) instead of `any`, which is also what removes the need for the `as any` cast in `Accordion.tsx`'s `defaultGetId`.

# ERROR 4e94ddb1-225 no-casts `packages/ui/react-ui/src/components/Accordion/AccordionContext.ts:25:87`

`createContext<AccordionContext<any>>(...)` instantiates the context's generic item type with `any`. Per `no-casts`, once `AccordionItemRecord` (line 10) has a real type, this can drop to `createContext<AccordionContext<AccordionItemRecord>>(...)` instead of explicit `any`.

# ERROR 4e94ddb1-226 no-casts `packages/ui/react-ui/src/components/Accordion/AccordionContext.ts:27:37`

`createContext<AccordionItemContext<any>>(...)` repeats the same explicit `any` instantiation for the item-context provider. Per `no-casts`, instantiate it with the real `AccordionItemRecord` type instead of `any`, same as the fix for line 25.

# WARN 4e94ddb1-227 no-trivial-wrappers-over-official-apis `packages/ui/ui-editor/src/extensions/language/xml/extended-markdown.test.ts:30:9`

`createEditorState` wraps a single call to `EditorState.create({ doc, extensions: [...] })` and is used at 14 call sites across this file. Per the rule, forward the call directly at each site (`EditorState.create({ doc, extensions: [extendedMarkdown({ registry: registry ?? testRegistry })] })`) so the CodeMirror API under test stays visible in the assertion's own scope instead of behind a same-file rename.

# ERROR 4e94ddb1-228 no-casts `packages/ui/ui-editor/src/extensions/language/xml/xml-tags.ts:151:15`

`matchStreamingTail`'s destructured parameter widens both `context: any` and `widgetStateMap: Record<string, any>` to `any` in one signature. Per `no-casts`, use the real `WidgetMatchContext`/`WidgetStateMap` types this module already imports from `widgets.ts` for the other matcher functions in this file, instead of re-widening them here.

# WARN 4e94ddb1-229 no-trivial-wrappers-over-official-apis `packages/ui/ui-editor/src/extensions/structure/blocks/selection.test.ts:13:7`

`create` is a one-line local helper whose entire body is a single call to CodeMirror's own `EditorState.create({ doc, extensions })`, used at six call sites in this file (`create('A\n\nB\n\nC')`, etc.). Per the rule, this only renames the API a reader must jump to the definition to see what `EditorState.create` was actually passed; inline `EditorState.create({ doc, extensions })` at each call site instead, since the call being made is itself part of what these tests exercise.

# WARN 4e94ddb1-230 no-trivial-wrappers-over-official-apis `packages/ui/ui-editor/src/extensions/structure/outliner/dnd.test.ts:29:7`

`makeState` is a zero-argument helper whose body is only `EditorState.create({ doc: DOC, extensions })`, called at seven sites in this file. This is the trivial-wrapper pattern the rule flags: it adds no branching, error handling, or derived value over the official CodeMirror API, so it should be inlined at each call site rather than kept as an indirection layer.

# ERROR 4e94ddb1-231 no-casts `packages/ui/ui-editor/src/extensions/widgets/link-widgets.ts:66:38`

`export type LinkWidgetProps<TContext = any> = ...` gives the widget-context generic parameter a default of `any`. Per `no-casts`, default it to `unknown` (forcing callers to narrow) instead of `any`.

# ERROR 4e94ddb1-232 no-casts `packages/ui/ui-editor/src/extensions/widgets/object-links.ts:15:38`

`export type ObjectLinkProps<TContext = any> = ...` repeats the same `any` default as `LinkWidgetProps` in `link-widgets.ts`. Per `no-casts`, default `TContext` to `unknown` instead of `any`, consistent with the fix recommended there.

# ERROR 4e94ddb1-233 no-casts `packages/ui/ui-editor/src/extensions/widgets/stub.ts:28:34`

`updated(id: string, widgetState: any): void;` widens the widget-state parameter of this interface method to `any`. Per `no-casts`, type it with the real widget props/state shape (`WidgetState`'s `props`, once that is itself typed — see `widgets.ts:129`) instead of `any`.

# ERROR 4e94ddb1-234 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:66:39`

`export type WidgetEventHandler<TEvent = any> = ...` defaults the event-handler's event type parameter to `any`. Per `no-casts`, default it to `unknown` instead of `any`, so a caller that doesn't supply `TEvent` is forced to narrow before using the event.

# ERROR 4e94ddb1-235 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:71:32`

`export type WidgetProps<TProps = any, TContext = any> = ...` defaults both of this core type's generic parameters to `any`, so every widget built on it (and the `WidgetMatchContext`/`stub.ts`/`xml-tags.ts` findings elsewhere in this review) inherits an unchecked `props`/`context`. Per `no-casts`, default both to `unknown` instead of `any` — this is the root type worth fixing first, since several other widened-`any` findings in this file and in `link-widgets.ts`/`object-links.ts` flow from it.

# ERROR 4e94ddb1-236 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:75:12`

`children?: any[]` widens the widget props' `children` field to an array of `any`. Per `no-casts`, type it as `ReactNode[]` (or whatever this widget system's real child type is) instead of `any[]`.

# ERROR 4e94ddb1-237 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:129:8`

`WidgetState.props: any;` widens the mounted widget's props to `any`. Per `no-casts`, type it as `WidgetProps` (the type this same file defines) instead of `any`.

# ERROR 4e94ddb1-238 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:142:54`

`StateEffect.define<any>()` for `widgetContextEffect` widens the effect's payload type to `any`. Per `no-casts`, give it the real context type (see `WidgetMatchContext.context`) instead of `any`.

# ERROR 4e94ddb1-239 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:158:73`

`StateEffect.define<{ id: string; value: any }>()` widens `widgetUpdateEffect`'s `value` field to `any`. Per `no-casts`, type `value` as `WidgetProps` (matching `WidgetState.props`) instead of `any`.

# ERROR 4e94ddb1-240 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:164:36`

`type WidgetStateMap = Record<string, any>;` widens the per-widget state map's value type to `any`. Per `no-casts`, type the values as `WidgetState` (or its `props`) instead of `any`.

# ERROR 4e94ddb1-241 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:169:10`

`WidgetMatchContext.context: any;` widens the matcher context field to `any`, and is the type this review's `xml-tags.ts:151` finding re-declares locally instead of importing. Per `no-casts`, give it a real host-context type instead of `any`.

# ERROR 4e94ddb1-242 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:293:50`

`StateField.define<any>({...})` widens `widgetContextStateField`'s value type to `any`. Per `no-casts`, give it the real context type (matching `WidgetMatchContext.context` once typed) instead of `any`.

# ERROR 4e94ddb1-243 no-casts `packages/ui/ui-editor/src/extensions/widgets/widgets.ts:363:38`

`updated: (id: string, widgetState: any) => {...}` is the concrete implementation matching the `any`-typed interface method flagged in `stub.ts:28`. Per `no-casts`, fix the type at its source in the `WidgetStateManager`/`updated` interface declaration and this implementation will follow, instead of widening the parameter here too.

# WARN 4e94ddb1-244 import-as-namespace-is-all-or-nothing `packages/ui/ui-template/src/react/Template.stories.tsx:10:1`

This imports `toJsonSchema` as named members directly from `@dxos/echo/JsonSchema`, a namespace module carrying `// @import-as-namespace` — per the namespace-export rule, consumers must import the whole namespace and reach members through it, never pull a member out directly. Fix: replace this with `import * as JsonSchema from '@dxos/echo/JsonSchema'` (or `import { JsonSchema } from` the package barrel) and reference the members as `JsonSchema.<Member>`.
