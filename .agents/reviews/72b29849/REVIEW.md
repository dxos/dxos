---
branch: claude/gracious-planck-jwtdgr
commit: 72b298498567f105df006f5caf5ddcccfe057d0b
base: 106d38af7e739f4cd14778372427e4e509a9aee4
mode: default
createdAt: 2026-08-31T02:03:32.843Z
isFinalized: true
groups: 20
rules: [no-casts, no-sleep-in-test, no-trivial-wrappers-over-official-apis]
reviewId: 72b29849
---

_41 error(s), 87 warning(s)._

# WARN 72b29849-1 no-trivial-wrappers-over-official-apis `packages/common/graph/src/GraphBuilder.ts:617`

`edgeId` is a module-local helper whose body is a single call `GraphEdge.createId({ source, target, relation })` that just repackages its own destructured argument — no branching, error handling, or derived value — used at two call sites inside `modelStore`. Per `no-trivial-wrappers-over-official-apis`, inline `GraphEdge.createId(edge)` (or the destructured object) at each call site and remove the helper.

# WARN 72b29849-2 no-trivial-wrappers-over-official-apis `packages/common/graph/src/GraphBuilder.ts:854`

`connectorKey` is a module-local helper that does nothing but forward its two arguments unchanged to `primaryKey(id, relation)` — no branching, transformation, or added value — yet is called at three sites in the file. Per `no-trivial-wrappers-over-official-apis`, call `primaryKey(id, relation)` directly at each site and delete `connectorKey`.

# WARN 72b29849-3 no-trivial-wrappers-over-official-apis `packages/common/graph/src/GraphModel.test.ts:17`

`createRegistry` is a local, zero-arg helper whose body is a single call `Registry.make()` with nothing else — no branching, error handling, or derived values — used across the file only to obscure that every test just calls `Registry.make()`. Per the `no-trivial-wrappers-over-official-apis` rule, inline `Registry.make()` at each of the ~8 call sites and delete the helper.

# WARN 72b29849-4 no-trivial-wrappers-over-official-apis `packages/core/compute/ai/src/testing/model-fixture/match-invariance.test.ts:22`

`normalize = (prompt) => __testing.normalizeForMatching(prompt, DEFAULT_DYNAMIC_VALUE_PATTERNS)` forwards its single parameter into one call to the very function this test file is verifying (`normalizeForMatching`). This is the case the rule flags as "most acute in tests, where the call being made IS the thing under test" — inline `__testing.normalizeForMatching(prompt, DEFAULT_DYNAMIC_VALUE_PATTERNS)` at each call site.

# WARN 72b29849-5 no-trivial-wrappers-over-official-apis `packages/core/compute/assistant/src/util/execution-graph.test.ts:16`

`createTestId = () => EntityId.random()` is a zero-arg wrapper around a single call, used at ~25 call sites throughout the file purely to rename `EntityId.random()`. Per `no-trivial-wrappers-over-official-apis`, call `EntityId.random()` directly at each site instead of maintaining this indirection.

# WARN 72b29849-6 no-trivial-wrappers-over-official-apis `packages/core/compute/compute/src/Operation.test.ts:15`

Module-level `makeOp = () => Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY, name: 'Test Op' } })` is a single-call wrapper with no branching or derived logic, used repeatedly in the surrounding describe block. This is the exact anti-pattern `no-trivial-wrappers-over-official-apis` calls out — inline the `Operation.make({...})` literal at each call site so the API under test stays visible in the assertion.

# WARN 72b29849-7 no-trivial-wrappers-over-official-apis `packages/core/compute/conductor/src/workflow/workflow.test.ts:183`

`makeInput = (input: any) => ValueBag.make({ input })` matches the rule's own textbook example (`makeBody`) — a one-line helper that forwards its single argument into one call and is used at 5 call sites in this file, always with the same literal input. Per `no-trivial-wrappers-over-official-apis`, inline `ValueBag.make({ input: {...} })` at each call site.

# WARN 72b29849-8 no-trivial-wrappers-over-official-apis `packages/core/compute/extractor-lib/src/identity.test.ts:412`

`alice` is a describe-local zero-arg helper whose entire body is `Person.make({ fullName: 'Alice', emails: [...] })`, used at multiple call sites in the same describe block. This just renames `Person.make` per `no-trivial-wrappers-over-official-apis`; inline the `Person.make(...)` literal at each call site instead.

# WARN 72b29849-9 no-trivial-wrappers-over-official-apis `packages/core/compute/extractor-lib/src/identity.test.ts:413`

Same issue as `alice` immediately above: `bob` is a zero-arg wrapper whose body is a single `Person.make({...})` call with no branching or derived values, violating `no-trivial-wrappers-over-official-apis`. Inline `Person.make({ fullName: 'Bob', ... })` at its call sites.

# WARN 72b29849-10 no-trivial-wrappers-over-official-apis `packages/core/compute/mcp-server/src/internal/input.test.ts:31`

`record = () => Operation.serialize(CreateTask)` is a zero-arg helper whose body is one call to `Operation.serialize`, used at the two call sites in this file. Per `no-trivial-wrappers-over-official-apis`, inline `Operation.serialize(CreateTask)` directly at each use instead of hiding the API behind a name.

# WARN 72b29849-11 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/query.test.ts:647`

`makeMessage = (threadId, sentAt) => Obj.make(TestSchema.Expando, { threadId, sentAt })` is a test-local wrapper whose body is one call, forwarding both parameters unchanged, called 5 times in this same test. Per `no-trivial-wrappers-over-official-apis`, inline `Obj.make(TestSchema.Expando, { threadId, sentAt })` at each call site.

# WARN 72b29849-12 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/query.test.ts:674`

Same pattern as the `makeMessage` above: a test-local single-call wrapper around `Obj.make(TestSchema.Expando, { threadId, sentAt })` re-declared and reused within this test, violating `no-trivial-wrappers-over-official-apis`. Inline the `Obj.make(...)` call at each of the 5 use sites.

# WARN 72b29849-13 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/query.test.ts:707`

Same pattern again: `makeMessage` re-declares the identical one-line `Obj.make(TestSchema.Expando, { threadId, sentAt })` wrapper in this test. Inline it per `no-trivial-wrappers-over-official-apis` instead of re-introducing the helper in every test.

# WARN 72b29849-14 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/query.test.ts:730`

Same pattern again: another local `makeMessage` that only forwards to `Obj.make(TestSchema.Expando, { threadId, sentAt })`. Per `no-trivial-wrappers-over-official-apis`, inline the `Obj.make(...)` call at its use sites rather than repeating this wrapper.

# WARN 72b29849-15 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client-e2e/src/query.test.ts:4015`

`query = () => Query.select(Filter.type(TestSchema.Expando, { value: 100 }))` is a zero-arg wrapper standing in for the exact query-construction idiom used unwrapped everywhere else in this file (e.g. lines 4005, 4027); it exists only so `query()` can be called twice to compare query identity. Per `no-trivial-wrappers-over-official-apis`, construct `Query.select(Filter.type(...))` directly at each call site.

# WARN 72b29849-16 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:410`

`createTextObject` is a module-local one-liner whose body is a single call, `Obj.make(TestSchema.Expando, { content })`, called at over a dozen sites in this file with the same shape of argument. Per `no-trivial-wrappers-over-official-apis`, this only renames `Obj.make` — inline `Obj.make(TestSchema.Expando, { content: '...' })` at each call site so the API under test stays visible.

# WARN 72b29849-17 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client/src/proxy-db/database.test.ts:756:1`

`newTask` is a module-local one-liner whose body is a single call to `Obj.make(TestSchema.Task, { subTasks: [] })`. Per `no-trivial-wrappers-over-official-apis`, inline the `Obj.make` call at its six call sites instead of hiding it behind a helper name.

# WARN 72b29849-18 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-client/src/query/working-set-executor.test.ts:511:1`

`makeNoIndexPlanner` is a module-local one-liner whose body is a single call to `new QueryPlanner({ defaultTextSearchKind: 'full-text', noIndexes: true })`, used at six call sites. Per `no-trivial-wrappers-over-official-apis`, inline the `new QueryPlanner(...)` call at each site instead of renaming it.

# WARN 72b29849-19 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-host/src/automerge/echo-data-monitor.test.ts:50:3`

`createMonitor` (line 50) and `tick` (line 52) are describe-local one-liners: `createMonitor` just forwards to `new EchoDataMonitor()` and `tick` just forwards to `monitor.tick(1000)`, each used at three-plus call sites. Per `no-trivial-wrappers-over-official-apis`, inline `new EchoDataMonitor()` and `monitor.tick(1000)` at their call sites instead of wrapping them in renamed helpers.

# WARN 72b29849-20 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-panproto/src/lens/mapping.ts:81:5`

`identifier` is a block-local one-liner whose body is a pure forwarding call to `SchemaAST.getIdentifierAnnotation(ast)` with no transformation, used twice immediately below its definition. Per `no-trivial-wrappers-over-official-apis`, inline `SchemaAST.getIdentifierAnnotation(source.type)` / `(target.type)` directly rather than renaming the API call.

# WARN 72b29849-21 no-trivial-wrappers-over-official-apis `packages/core/echo/echo/src/Feed.test.ts:180:1`

`message` is a module-local one-liner whose body is a single call to `Obj.make(TestSchema.Task, { title })`, used at dozens of call sites in this file. This is the exact pattern called out by `no-trivial-wrappers-over-official-apis`: inline `Obj.make(TestSchema.Task, { title: 'm1' })` etc. at each assertion so the factory call under test stays visible.

# WARN 72b29849-22 no-trivial-wrappers-over-official-apis `packages/core/echo/echo/src/internal/common/proxy/entity-hash.test.ts:126:1`

`makePerson` is a module-local one-liner whose body is a single call to `Obj.make(TestSchema.Person, { name })`, used at over a dozen call sites. Per `no-trivial-wrappers-over-official-apis`, inline `Obj.make(TestSchema.Person, { name: 'Alice' })` at each call site instead of renaming the factory call.

# WARN 72b29849-23 no-trivial-wrappers-over-official-apis `packages/core/echo/feed/src/feed-store.ts:898:1`

`encodeCursor` is a module-local one-liner whose body is a single call to `FeedCursor.make(...)`, wrapping its arguments in a template string, used at three call sites. Per `no-trivial-wrappers-over-official-apis`, inline `FeedCursor.make(\`${token}|${insertionId}\`)` at each call site so the cursor-construction call stays visible.

# WARN 72b29849-24 no-trivial-wrappers-over-official-apis `packages/core/halo/credentials/src/state-machine/invitation-state-machine.test.ts:166:1`

`createStateMachine` is a module-local one-liner whose body is a single call to `new InvitationStateMachine()`, used at nine call sites. Per `no-trivial-wrappers-over-official-apis`, inline `new InvitationStateMachine()` at each call site instead of renaming the constructor call.

# WARN 72b29849-25 no-trivial-wrappers-over-official-apis `packages/core/halo/credentials/src/state-machine/member-state-machine.test.ts:565:3`

`createStateMachine` is a describe-local one-liner whose body is a single call to `new MemberStateMachine(spaceKey)`, used at ten call sites. Per `no-trivial-wrappers-over-official-apis`, inline `new MemberStateMachine(spaceKey)` at each call site instead of renaming the constructor call.

# WARN 72b29849-26 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:42`

`await sleep(20)` is used after `peer.proxy.open()` to let the mocked open-failure propagate before asserting `isOpen` is falsy, per `no-sleep-in-test`. The file already has the right primitive in scope — `handleChannelErrors`/`errors.expectErrorRaised()` is awaited right after, so drop the sleep and rely on that (or a `Trigger`/`closed.waitForCount(1)`) to know the proxy has actually closed before asserting.

# WARN 72b29849-27 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:53`

After `mockTransport.transport.errors.raise(new Error())`, the test does `await sleep(20)` before checking `peer.proxy.isOpen`, an arbitrary-delay wait for the error to propagate rather than awaiting a completion signal. Per `no-sleep-in-test`, replace with `peer.proxy.closed.waitForCount(1)` (as `closeAndWaitProxy` already does elsewhere in this file) or await `errors.expectErrorRaised()` before the assertion.

# WARN 72b29849-28 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:80`

`mockTransport.transport.connected.emit()` is followed by `await sleep(20)` to give the (closed) proxy time to not react, instead of a deterministic wait. Per `no-sleep-in-test`, since `connected.on` handlers run synchronously off `emit()`, the sleep can be dropped entirely (or replaced with a single microtask flush) rather than padding with a fixed delay.

# WARN 72b29849-29 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:93`

`await sleep(20)` after `mockTransport.transport.errors.raise(new Error())` is used to wait for the proxy to close before checking `isOpen`, instead of the event-based wait already used elsewhere in the file (`closed.waitForCount(1)`). Fix per `no-sleep-in-test` by awaiting that trigger (or `errors.expectErrorRaised()`, called right after) instead of a fixed delay.

# WARN 72b29849-30 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:103`

In "transport error raised after close is ignored", `await sleep(20)` is used twice as a settle buffer — once before `closeAndWaitProxy`, and again after `mockTransport.transport.errors.raise(new Error())` to confirm the error is ignored. Per `no-sleep-in-test`, replace the fixed delays with the file's own `closed`/`connected` triggers, or an explicit `errors.assertNoUnhandledErrors()` check driven off an awaited event rather than a timed gap.

# WARN 72b29849-31 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:128`

`await failed.wait()` already gives a deterministic signal that the signal send failed, but the test then still does `await sleep(20)` before asserting `isOpen`/`assertNoUnhandledErrors()`. Per `no-sleep-in-test`, this padding sleep should be dropped — the prior `Trigger` wait is the correct synchronization primitive and the fixed delay adds nothing but flakiness/slowness.

# WARN 72b29849-32 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:152`

Same pattern as above inside "error raised when fails to send an offer/answer": `await failed.wait()` is followed by an extra `await sleep(20)` before `errors.expectErrorRaised()`. Per `no-sleep-in-test`, remove the sleep — the `Trigger` already synchronizes with the async work.

# WARN 72b29849-33 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:173`

Same pattern in "error raised when transport fails to handle a signal": `await failed.wait()` is followed by a redundant `await sleep(20)` before `errors.expectErrorRaised()`. Per `no-sleep-in-test`, drop the sleep and rely on the trigger that already signals completion.

# WARN 72b29849-34 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:204`

"transport data push after proxy close is ignored" uses three separate `await sleep(20)` calls to let data pushed through the mock stream/pipe settle before each `assertReceivedAsync` check and before/after `proxy.close()`. Per `no-sleep-in-test`, these fixed delays should be replaced with an event/Trigger-based wait for the stream to flush (e.g. awaiting a `data`/drain event or a `Trigger` set by the write callback) instead of guessing a timeout.

# WARN 72b29849-35 no-trivial-wrappers-over-official-apis `packages/core/mesh/rpc/src/service-buf.test.ts:68:1`

`legacyService` and `legacyStreamService` (lines 68 and 70) are module-local one-liners that just forward to `schema.getService(SERVICE)` / `schema.getService(STREAM_SERVICE)`, each used at several call sites. Per `no-trivial-wrappers-over-official-apis`, inline the `schema.getService(...)` calls instead of renaming them.

# WARN 72b29849-36 no-sleep-in-test `packages/core/mesh/teleport/src/muxing/muxer.test.ts:70`

In "rpc calls on 1 port", `client.open()` and the RPC call are wrapped in a bare `setTimeout(async () => { ... })` to defer execution until after both peers' ports are created in the loop above — using a zero-delay `setTimeout` as a scheduling hack to synchronize with the other peer's async setup, which `no-sleep-in-test` flags. This isn't a cross-runtime macrotask-turn exception: it can be restructured by creating both `client`s first and only then `await`ing/`Promise.all`-ing their `open()` calls, with `latch`/`inc` still used to know when both RPC calls complete.

# WARN 72b29849-37 no-sleep-in-test `packages/core/mesh/teleport/src/muxing/muxer.test.ts:102`

In "two concurrent rpc ports", both the rpc1 and rpc2 clients wrap `client.open()` in a bare `setTimeout(async () => { ... })` to defer opening until port creation for both peers has finished — the same setTimeout-as-scheduler anti-pattern flagged by `no-sleep-in-test`. Restructure to build all clients first, then `Promise.all` their `open()` calls (or otherwise sequence via awaited promises), rather than relying on a macrotask deferral.

# ERROR 72b29849-38 no-casts `packages/core/protocols/src/buf/service.ts:34:19`

`MethodCodecs.request` is typed `CompatCodec<any>`, discarding the request payload's type. `compatCodec<T>` only calls `encode(value: T, …)`/`decode(...): T` against values already handled as `unknown` at the call sites (`#methodStub`'s `value: unknown`, `Any.value` bytes), so `CompatCodec<unknown>` type-checks the same call sites without the `any` escape hatch — fix the type at its source per the no-casts rule.

# ERROR 72b29849-39 no-casts `packages/core/protocols/src/buf/service.ts:35:20`

`MethodCodecs.response` is typed `CompatCodec<any>`, same issue as the `request` field above — `unknown` covers every existing use (`codecs.response.decode(...)` result flows back out as `unknown`/`Any`), so this is a widened `any` in a type signature that should be tightened rather than left open.

# ERROR 72b29849-40 no-casts `packages/core/protocols/src/buf/service.ts:82:35`

`data.value!` is a non-null assertion, but `Any.value` (`@dxos/codec-protobuf`) is declared as `value: Uint8Array` — not optional — so the assertion is asserting away a type that is never `undefined`/`null` in the first place; per the no-casts rule this should simply be `data.value` with no `!`.

# ERROR 72b29849-41 no-casts `packages/core/protocols/src/buf/service.ts:89:30`

`response.value!` — same redundant non-null assertion as above; `Any.value` is non-optional, so drop the `!`.

# ERROR 72b29849-42 no-casts `packages/core/protocols/src/buf/service.ts:97:39`

`compatCodec<any>(method.input)` and `compatCodec<any>(method.output)` both instantiate the generic with `any`; per the fix for `MethodCodecs` above, `compatCodec<unknown>(...)` is sufficient here and avoids the widened `any`.

# ERROR 72b29849-43 no-casts `packages/core/protocols/src/buf/service.ts:119:60`

`request.value!` — same redundant non-null assertion; `Any.value` is non-optional, so drop the `!`.

# ERROR 72b29849-44 no-casts `packages/core/protocols/src/buf/service.ts:131:47`

`request.value!` — same redundant non-null assertion; `Any.value` is non-optional, so drop the `!`.

# ERROR 72b29849-45 no-casts `packages/core/protocols/src/buf/service.ts:146:13`

`(handler as any).bind(service)` casts away the type system to call `.bind`. `handler` is already typed as `Service[keyof Service]` narrowed by the `invariant` above; bind it through a typed intermediate (e.g. `(handler as (...args: unknown[]) => unknown).bind(service)` or restructure `#handler`'s return type) instead of `as any`.

# WARN 72b29849-46 no-trivial-wrappers-over-official-apis `packages/devtools/cli/src/commands/mcp/watch.ts:93:5`

`toChild`, `toClient`, and `note` (lines 93-95) are function-local one-liners whose entire body is a single call to `child.stdin.write` / `process.stdout.write` / `process.stderr.write` respectively, each just wrapping the argument in a template literal. Per `no-trivial-wrappers-over-official-apis`, inline the write call (with its template literal) at each of the many call sites instead of hiding which stream API is being invoked behind a local name.

# WARN 72b29849-47 no-trivial-wrappers-over-official-apis `packages/devtools/cli/src/commands/plugin-install.test.ts:217:1`

`pluginsFile` and `installDir` (lines 217-218) are module-local one-liners whose bodies are single `path.join(...)` calls with hardcoded segments. Per `no-trivial-wrappers-over-official-apis`, inline the `path.join` calls at their call sites instead of wrapping them in a renamed local helper.

# WARN 72b29849-48 no-trivial-wrappers-over-official-apis `packages/devtools/cli/src/commands/plugin.test.ts:146:1`

`pluginsFile` is a module-local one-liner whose body is a single call to `path.join(...)` with hardcoded segments. Per `no-trivial-wrappers-over-official-apis`, inline `path.join(home, '.config', 'dx', 'plugins', 'default.yml')` at the three call sites rather than renaming the API.

# ERROR 72b29849-49 no-casts `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatActions.stories.tsx:34:15`

`component: ChatActions as any` casts away a real mismatch between `ChatActions`'s prop type and `DefaultStory`'s (the `Meta<typeof DefaultStory>` this object satisfies). Fix the type at its source — e.g. give `DefaultStory` the same prop shape `ChatActions` expects, or type `meta` against `ChatActions` directly — rather than silencing the checker with `as any`.

# WARN 72b29849-50 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-assistant/src/execution-graph/execution-graph.test.ts:29:7`

`const ids = (commits: Commit[]) => commits.map((commit) => commit.id);` is a module-local helper whose body is a single forwarding call to `Array.prototype.map` with no branching, error handling, or non-trivial default — it renames `.map` rather than removing duplication. Per the rule, inline `commits.map((commit) => commit.id)` at the three call sites (lines 152, 160, 169) instead.

# WARN 72b29849-51 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-assistant/src/execution-graph/execution-graph.ts:512:7`

`const shouldShimmerInProgressCommit = (event, toolCallContext) => isPendingToolCallEvent(event, toolCallContext);` is a module-local wrapper whose entire body is one call to `isPendingToolCallEvent` with the same arguments in the same order, used at a single call site (line 795) — it adds no branching, error handling, or derived value, only a new name for the same call. Per the rule, call `isPendingToolCallEvent(event, toolCallContext)` directly at the call site (and fold the doc comment into `isPendingToolCallEvent` if the shimmer-specific framing is worth keeping).

# WARN 72b29849-52 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-client/src/containers/UsageContainer/UsageView.tsx:69:1`

`const formatAmount = (amount: number): string => amount.toLocaleString();` is a module-local helper whose body is a single forwarding call to `Number.prototype.toLocaleString`, used at three call sites (lines 108, 116) — it adds no branching, error handling, or derived value, only a new name for the same call. Per the rule, call `amount.toLocaleString()` directly at each site.

# WARN 72b29849-53 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-connector/src/Binding.test.ts:1015:1`

`const makeTarget = () => Obj.make(Expando.Expando, { name: 'Inbox' });` is a module-local helper whose body is a single call to `Obj.make` with a fixed literal — the canonical case the rule calls out — used at eight call sites (lines 60, 65, 70, 75, 76, 199, 210, 219). Per the rule, inline `Obj.make(Expando.Expando, { name: 'Inbox' })` at each call site so the object being created stays visible where it's asserted on.

# WARN 72b29849-54 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-crm/src/skills/crm/skill.ts:66:1`

`const make = () => makeCrmSkill();` is a module-local wrapper whose entire body is one zero-argument call to `makeCrmSkill`, used once (line 70) to populate the `Skill.Definition.make` field — it adds no branching, error handling, or derived value. Per the rule, assign `make: makeCrmSkill` directly in the `skill` object instead of defining the intermediate `make`.

# ERROR 72b29849-55 no-casts `packages/plugins/plugin-debug/src/containers/index.ts:10:34`

The new `DebugPortStatus` export is typed `ComponentType<any>`, a widened `any` in the export's signature. `packages/plugins/plugin-space/src/containers/index.ts` shows the fix applied in this same change set — `ComponentType<ObjectMasonryArticleProps>` — so `DebugPortStatus` should likewise be typed with its real props instead of `any`.

# ERROR 72b29849-56 no-casts `packages/plugins/plugin-debug/src/operations/snapshot.ts:24:20`

`translator: { t: (...args: any[]) => string } | undefined` widens the translator's `t` signature to `any[]` args. Type the parameters against i18next's actual `TFunction` (or the narrower tuple `[key: string, options?: unknown]` this call site actually passes) instead of `any[]`.

# WARN 72b29849-57 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-deck/src/capabilities/url-handler.ts:100:5`

`const getState = () => registry.get(stateAtom);` is a closure-local helper whose body is a single forwarding call to `registry.get` with the same fixed atom, used at four call sites (lines 104, 112, 231, 415) — it adds no branching, error handling, or derived value. Per the rule, call `registry.get(stateAtom)` directly at each site.

# WARN 72b29849-58 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-devtools/src/containers/CliPanel/CliPanel.stories.tsx:59:5`

`const keyboard = (text: string) => userEvent.keyboard(text);` is a describe-local helper whose body is a single forwarding call to `userEvent.keyboard` with the same single argument — it adds no branching, error handling, or derived value, only a new name for the same call, and is then passed by reference to `runCommand` three times. Per the rule, pass `userEvent.keyboard` itself as the `runCommand` argument instead of defining `keyboard`.

# WARN 72b29849-59 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-freeq/src/capabilities/channel-backend.ts:30`

`toMessageFromRest` is a module-local one-liner whose body is a single, unmodified forward to `toMessage(rest)` (its only call site is `byId.set(rest.id, toMessageFromRest(rest))` a few lines below) — it adds no branching, error handling, or derived value, and it only renames `toMessage` under a type that is structurally identical to `IncomingMessage`. Per `no-trivial-wrappers-over-official-apis`, inline it as `toMessage(rest)` at the call site so the reader sees the real function (already exported above) being invoked directly.

# ERROR 72b29849-60 no-casts `packages/plugins/plugin-illustrator/src/model/ui.test.ts:147:32`

`command.object.origin!.x` — non-null assertion on `origin`, which is evidently an optional field on the compiled object. Narrow it with a proper guard (e.g. `expect(command.object.origin).toBeDefined()` first, or an `if (!command.object.origin) throw …`) instead of asserting past the optionality with `!`.

# ERROR 72b29849-61 no-casts `packages/plugins/plugin-illustrator/src/model/ui.test.ts:148:32`

`command.object.origin!.y` — same non-null assertion issue as line 147.

# ERROR 72b29849-62 no-casts `packages/plugins/plugin-illustrator/src/model/ui.test.ts:172:24`

`command.object.origin!.x` — same non-null assertion issue as line 147.

# ERROR 72b29849-63 no-casts `packages/plugins/plugin-illustrator/src/model/ui.test.ts:173:24`

`command.object.origin!.y` — same non-null assertion issue as line 147.

# WARN 72b29849-64 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-inbox/src/operations/precondition.test.ts:10`

`failWith` is a describe/module-local helper whose body is one expression forwarding straight to `Cause.fail(error)`, used at nine call sites across the file's `it` blocks with no branching, error handling, or derived value added. Per `no-trivial-wrappers-over-official-apis`, inline `Cause.fail(...)` at each assertion site — this is the exact pattern the rule calls out for tests, since the reader has to jump to the top of the file to learn which Effect API is under test.

# WARN 72b29849-65 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-lametric/src/render/pixels.test.ts:37`

`const at = (offset: number) => toPixels({ text: 'ABCDEFGHIJKL' }, offset);` is a describe-local helper whose body is a single call to `toPixels` — the function under test — with the first argument fixed. Per the rule, inline it at both call sites (`at(0)`, `at(4)` a few lines below): `toPixels({ text: 'ABCDEFGHIJKL' }, 0)` and `toPixels({ text: 'ABCDEFGHIJKL' }, 4)`, so the assertion shows what is actually being exercised instead of hiding it behind a renamed local.

# WARN 72b29849-66 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-lingo/src/extensions/segments.ts:143`

`const hoverMark = (kind: string) => Decoration.mark({ class: \`cm-segment cm-segment-hover cm-segment-${kind}\` });` is a module-local single-expression forward to `Decoration.mark`, used once (`push(hoveredSegment, hoverMark(hoveredSegment.kind), 1)`). Per the rule, inline `Decoration.mark({ class: \`cm-segment cm-segment-hover cm-segment-${hoveredSegment.kind}\` })` at that call site.

# WARN 72b29849-67 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-lingo/src/extensions/segments.ts:145`

`const selectedMark = (kind: string) => Decoration.mark({ class: \`cm-segment cm-segment-selected cm-segment-${kind}\` });` is the same pattern as `hoverMark` immediately above it — a one-line forward to `Decoration.mark`, used once. Per the rule, inline the call at its single use site instead of keeping the renamed wrapper.

# WARN 72b29849-68 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-lingo/src/types/Word.test.ts:9`

`const at = (iso: string) => new Date(iso);` is a module-local one-line forward to `new Date(...)` with no branching or derived value, used at three call sites (`NOW` and two `at('2100-...')` calls). Per the rule, inline `new Date(iso)` at each call site instead of maintaining a same-named local that only renames the constructor call.

# WARN 72b29849-69 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-magazine/src/operations/extraction/article.test.ts:9`

`const parse = (html: string): Document => new DOMParser().parseFromString(html, 'text/html');` is a module-local single-expression wrapper around `DOMParser().parseFromString`, called at two sites. Per the rule, inline `new DOMParser().parseFromString(html, 'text/html')` at each call site rather than keeping a helper that only renames the API.

# WARN 72b29849-70 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-magazine/src/operations/util.test.ts:13`

`const makePost = (props: { title: string; published?: string }): Subscription.Post => Obj.make(Subscription.Post, { title: props.title, published: props.published });` is a module-local helper that only forwards its argument's fields straight through to `Obj.make`, with no branching, error handling, or derived values — this is the rule's canonical example almost verbatim, and it is used at 15 call sites in this file (`makePost({ title: 'A', published: '...' })`, etc.). Per the rule, inline `Obj.make(Subscription.Post, { title: '...', published: '...' })` at each call site so the object under test is visible in the assertion's own scope.

# WARN 72b29849-71 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-mermaid/src/extensions/mermaid.stories.tsx:20`

`const str = (...lines: string[]) => lines.join('\n');` is a module-local helper whose body is a single call to `Array.prototype.join`, used at two call sites (`str(...)` in the story args below). Per the rule, inline `lines.join('\n')` (or write the multi-line template directly) at each call site rather than keeping a locally-invented name for `.join`.

# WARN 72b29849-72 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:32`

`const makeRootChild = (id: string, disposition: string, label: string, icon: string) => AppGraphNode.make({ id, type: 'story-item', data: null, properties: { label, icon, disposition } });` is a module-local single-expression forward to `AppGraphNode.make`, used at 3 call sites just below. Per the rule, inline the `AppGraphNode.make({ id, type: 'story-item', data: null, properties: { label, icon, disposition } })` call at each of the three sites instead of keeping the renamed indirection.

# WARN 72b29849-73 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-onboarding/scripts/build-exemplar-space.ts:1210`

`const localDxn = (obj: Obj.Unknown) => EID.make({ entityId: obj.id });` is a function-local helper that only forwards to `EID.make` with a single field lifted from its argument, used at two call sites (`lnk`, `emb` just below). Per the rule, inline `EID.make({ entityId: obj.id })` at each of those two use sites instead of keeping the renamed indirection.

# WARN 72b29849-74 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-onboarding/scripts/build-exemplar-space.ts:1320`

`const make = (props: Obj.MakeProps<typeof RoastLog>): Obj.Any => Obj.make(type, props);` is a function-local helper whose body is a single forwarding call to `Obj.make`, matching the rule's canonical example almost exactly, and is used at 8 call sites below (`make({ title: ..., ... })`). Per the rule, inline `Obj.make(type, { title: ..., ... })` at each call site so the object being constructed is visible where it is asserted/used.

# WARN 72b29849-75 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-onboarding/src/credentials/header-codec.ts:96`

`const encodeBytes = (bytes: Uint8Array) => Buffer.from(bytes).toString(ENCODING);` is a module-local, single-call-site wrapper around `Buffer.from(...).toString(...)` with no branching or derived value. Per the rule, inline the call at its one use site in `_prepareForEncoding` (`encodeBytes(value)`) rather than keeping a same-named local that only renames the Buffer API.

# WARN 72b29849-76 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-onboarding/src/credentials/header-codec.ts:97`

`const decodeBytes = (bytes: string) => Buffer.from(bytes, ENCODING);` is a module-local, single-call-site wrapper around `Buffer.from(...)` with no branching or derived value. Per the rule, inline it at its one use site in `_decodeRecursive` (`decodeBytes(value.__b)`) instead of keeping the renamed indirection.

# ERROR 72b29849-77 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:12:41`

`ProjectChatsArticle: ComponentType<any>` widens the new export's props to `any`. Type it against `ProjectChatsArticle`'s real props (imported as a `type … Props` the way `ObjectMasonryArticleProps` is handled in `plugin-space/src/containers/index.ts`) instead of `any`.

# ERROR 72b29849-78 no-casts `packages/plugins/plugin-projects/src/containers/index.ts:16:44`

`ProjectArtifactsArticle: ComponentType<any>` — same widened-`any` issue as line 12; type it against the real props instead.

# ERROR 72b29849-79 no-casts `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:330:24`

`chat!.tasks` asserts non-null on the result of `chats.find(...)` even though the line above already calls `await expect(chat).toBeTruthy()`. Since `expect()` does not narrow `chat`'s type, use an explicit guard instead (e.g. `if (!chat) throw new Error(...)`) so the non-null is a real check rather than a `!` assertion.

# WARN 72b29849-80 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-space/src/util/object-form.test.ts:19`

`const tick = () => vi.advanceTimersByTimeAsync(0);` is a zero-parameter alias for a single call to vitest's own timer API, used unchanged at 5 call sites (`await tick()`). Per the rule, inline `await vi.advanceTimersByTimeAsync(0)` at each site so the timer API being exercised stays visible where it's used.

# WARN 72b29849-81 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-spacetime/src/engine/extrusion.test.ts:129`

`const makeCube = (): Manifold => { return ManifoldApi.cube([2, 2, 2], true); };` is a no-argument helper whose body is a single, unvarying call to the public `ManifoldApi.cube` API, used at roughly 18 call sites throughout the file. Inline `ManifoldApi.cube([2, 2, 2], true)` (or bind it once as a plain constant, since it never varies) instead of naming this one-line forward.

# WARN 72b29849-82 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/convert-to-task.test.ts:15`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-83 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/create-milestone.test.ts:14`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-84 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/create-task.test.ts:15`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-85 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/delete-milestone.test.ts:16`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-86 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/delete-task.test.ts:15`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-87 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/get-outline.test.ts:15`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-88 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/list-milestones.test.ts:18`

`testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites; inline it at each `Effect.provide(testLayer())` site. The file also defines a second such alias, `sessionLayer` (line 53), which forwards to `TestDatabaseLayer({ types: [...], spaceKey, storagePath })` and is used at two call sites (lines 62, 72) — inline that call too rather than naming it.

# WARN 72b29849-89 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/list-tasks.test.ts:18`

`testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites; inline it at each `Effect.provide(testLayer())` site. The file also defines a second such alias, `sessionLayer` (line 78), which forwards to `TestDatabaseLayer({ types: [...], spaceKey, storagePath })` and is used at two call sites (lines 92, 100) — inline that call too rather than naming it.

# WARN 72b29849-90 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/move-milestone.test.ts:14`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-91 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/move-task.test.ts:15`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-92 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/restore-tasks.test.ts:16`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-93 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/update-outline.test.ts:16`

Same pattern: `testLayer` only forwards to `TestDatabaseLayer({ types: [...] })` with no variation across its call sites. Inline the `TestDatabaseLayer(...)` call at each `Effect.provide(testLayer())` site instead of naming this one-line indirection.

# WARN 72b29849-94 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-tasks/src/operations/update-task.test.ts:15`

`const testLayer = () => TestDatabaseLayer({ types: [...] })` is a zero-parameter alias for a single call to the public `TestDatabaseLayer` test API, used unchanged at 8 call sites (`Effect.provide(testLayer())`). Per `no-trivial-wrappers-over-official-apis`, inline `TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] })` directly into each `Effect.provide(...)` call so the layer being provided stays visible at the call site.

# WARN 72b29849-95 no-trivial-wrappers-over-official-apis `packages/sdk/client-e2e/src/contact-book.test.ts:146:9`

`const expectNoContacts = (client: Client) => expect(client.halo.contacts.get().length).to.eq(0);` is a describe-local helper whose body is a single chai assertion call, used at exactly one call site (line 79). Per `no-trivial-wrappers-over-official-apis`, this hides the assertion that IS the thing under test behind a name the reader must jump to; inline it at the call site instead: `expect(client1.halo.contacts.get().length).to.eq(0);`.

# WARN 72b29849-96 no-trivial-wrappers-over-official-apis `packages/sdk/client-services/src/packlets/metadata/metadata-store.ts:426:7`

`const fromBytesInt32 = (buf: Buffer) => buf.readInt32LE(0)` is a module-local one-line forward to `Buffer#readInt32LE`, used at two call sites (lines 143–144) with no branching, error handling, or derived value — the canonical case the `no-trivial-wrappers-over-official-apis` rule flags. Inline `buf.readInt32LE(0)` at both call sites.

# WARN 72b29849-97 no-trivial-wrappers-over-official-apis `packages/sdk/client-services/src/packlets/spaces/edge-feed-replicator.test.ts:257:9`

`const appendMessage = (feed) => feed.append({ timeframe: new Timeframe() })` is a describe-local helper whose body is a single forwarding call to `feed.append` with a fixed argument, called at four sites (lines 61, 108, 172, 187) — per `no-trivial-wrappers-over-official-apis` this just renames the API being exercised. Inline `feed.append({ timeframe: new Timeframe() })` at each call site instead.

# WARN 72b29849-98 no-trivial-wrappers-over-official-apis `packages/sdk/types/src/testing/data.ts:25:7`

`const createDocument = (name, content) => Obj.make(TestSchema.DocumentType, { name, content })` does nothing but pass its two params straight through to `Obj.make`, and is called a dozen times below (lines 130–172) — matching the rule's own example almost verbatim. Inline `Obj.make(TestSchema.DocumentType, { name, content })` at each call site, or drop the helper since the props are already named the same as the args.

# ERROR 72b29849-99 no-casts `packages/stories/stories-assistant/src/stories/Chat.stories.tsx:783:29`

`storySpace!.db` asserts non-null on the module-level `let storySpace: Space | undefined`, even though the file already has the correct pattern nearby (`if (!storySpace) { … }` before use, around line 59). Add the same guard here instead of asserting with `!`.

# ERROR 72b29849-100 no-casts `packages/stories/stories-assistant/src/stories/Chat.stories.tsx:788:24`

`storySpace!.db` — same non-null assertion issue as line 783; use the existing guard pattern instead.

# ERROR 72b29849-101 no-casts `packages/ui/react-ui-assistant/src/renderer.test.ts:12:21`

`(blocks: any[])` widens the test helper's parameter to `any[]`. Type it against the actual block union `Message.make` expects (e.g. `Parameters<typeof Message.make>[0]['blocks']` or the exported block type from `@dxos/types`) instead of `any[]`.

# WARN 72b29849-102 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:12:7`

`preventDefault` is a module-local helper whose body is a single call to the DOM `Event.preventDefault()` API, with no branching or derived logic, used only at the one `onInteractOutside={preventDefault}` call site. Per `no-trivial-wrappers-over-official-apis`, inline it at the call site (`onInteractOutside={(event) => event.preventDefault()}`) so the API being invoked stays visible where it's used.

# WARN 72b29849-103 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-geo/src/components/Globe/Globe.tsx:250:9`

`canvasRef` is a local one-liner whose body is a single forwarding call to the `setCanvas` state setter (`(canvas) => setCanvas(canvas)`), adding no logic. Per `no-trivial-wrappers-over-official-apis`, drop the wrapper and pass `setCanvas` directly as the `ref` prop (`ref={setCanvas}`) since the signatures already match.

# WARN 72b29849-104 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-geo/src/hooks/useDrag.ts:83:7`

`cancelDrag` is a module-local one-liner whose entire body is a single call to d3's public `.on()` API (`node.on('.drag', null)`), with no branching, error handling, or derived value — it only renames the call for its one use site at line 74. Per `no-trivial-wrappers-over-official-apis`, inline it instead: `select(canvas).on('.drag', null)` at the call site keeps the d3 API being invoked visible without a jump to definition.

# ERROR 72b29849-105 no-casts `packages/ui/react-ui-list/src/hooks/useListSelection.test.ts:74:39`

`rowProps.onClick({} as any)` casts an empty object to bypass the click handler's real event-parameter type. Construct a minimal typed mock event (the file already does this for `onFocus` via the `focusEvent` helper a line above) instead of `{} as any`.

# ERROR 72b29849-106 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:291:70`

`canvasElement.querySelector<HTMLElement>(...)!` asserts non-null past `querySelector`'s nullable return. Use a guard/throw (as `Test: Story` a few hundred lines down in this same file does with `if (!row || !create) { throw new Error(...) }`) instead of `!`.

# ERROR 72b29849-107 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:292:78`

`pane.querySelector<HTMLInputElement>(...)!` — same non-null-assertion issue as line 291.

# ERROR 72b29849-108 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:325:47`

`first.querySelector('.truncate')!.textContent` — same non-null-assertion issue as line 291.

# ERROR 72b29849-109 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:343:44`

`description()!.querySelector(...)` — same non-null-assertion issue as line 291 (`description` itself returns `HTMLElement | null`).

# ERROR 72b29849-110 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:348:29`

`description()!.querySelector('.cm-line')!` — two non-null assertions on this one line, same issue as line 291.

# ERROR 72b29849-111 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:354:74`

`description()!.querySelector(...)` — same non-null-assertion issue as line 291.

# ERROR 72b29849-112 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:358:44`

`description()!.contains(...)` — same non-null-assertion issue as line 291.

# ERROR 72b29849-113 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:361:34`

`description()!.querySelector<HTMLElement>('.cm-content')!` — two non-null assertions on this one line, same issue as line 291.

# ERROR 72b29849-114 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:365:59`

`pane.querySelector<HTMLElement>(...)!` — same non-null-assertion issue as line 291.

# ERROR 72b29849-115 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:376:59`

`pane.querySelector<HTMLElement>(...)!` — same non-null-assertion issue as line 291.

# ERROR 72b29849-116 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:503:70`

`canvasElement.querySelector<HTMLElement>(...)!` — same non-null-assertion issue as line 291.

# ERROR 72b29849-117 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:504:34`

`create.querySelector('input')!.getBoundingClientRect()` — same non-null-assertion issue as line 291.

# WARN 72b29849-118 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-terminal/src/components/Terminal/Terminal.stories.tsx:96`

`const keyboard = (text: string) => userEvent.keyboard(text);` is a one-line forward to `userEvent.keyboard` with the same signature, then passed as a callback to `runCommand` four times in this play function. Per `no-trivial-wrappers-over-official-apis`, it renames the API without adding anything — pass `userEvent.keyboard` directly at each `runCommand(...)` call (or as the callback argument) instead of defining a local alias.

# WARN 72b29849-119 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-thread/src/Thread/Thread.tsx:46`

`const getMessageId = (message: MessageType.Message) => Obj.getURI(message);` is a single-expression forward to `Obj.getURI` with no branching, error handling, or derived value — it only renames the public API. Call `Obj.getURI(message)` directly at its one use site (line 300) instead of keeping the indirection.

# WARN 72b29849-120 no-trivial-wrappers-over-official-apis `packages/ui/react-ui/src/components/ScrollArea/ScrollAreaThumbs.test.ts:15`

`const at = (scrollOffset: number) => measure(scrollOffset, CONTENT, VIEWPORT, PADDING);` wraps `measure` — the function under test, imported specifically for this suite — fixing three of its four args. Per the rule this hides which API and arguments are exercised at each `at(...)` call site (three uses below), and the very first test in the same file already calls `measure(...)` directly, showing the wrapper isn't even used consistently. Inline `measure(scrollOffset, CONTENT, VIEWPORT, PADDING)` at each call site instead.

# WARN 72b29849-121 no-trivial-wrappers-over-official-apis `packages/ui/ui-editor/src/extensions/decoration/pos.test.ts:23`

`const make = (doc = 'hello world') => EditorState.create({ doc, extensions: [posAnalysisField] });` is a describe-local single-call wrapper around `EditorState.create`, used three times in this block. It obscures the extension under test at each call, and the sibling `describe('posDecorations', ...)` block below constructs `EditorState.create({ doc: text, extensions: [...] })` directly instead of through a helper — showing the wrapper adds indirection without removing real duplication. Call `EditorState.create({ doc, extensions: [posAnalysisField] })` directly at each call site (or accept `doc` as a plain default parameter without hiding the extensions list).

# ERROR 72b29849-122 no-casts `packages/ui/ui-template/src/model.ts:98:44`

`makePath`'s return type is declared `any`, so both `select<State>()` and `item<Item>()` — which are supposed to return the precisely-typed `Path<State>`/`Path<Item>` — get their real typing only via the outer cast at the call site while the proxy factory itself opts out entirely. Give `makePath` a real return type (it can still return the proxy via an internal narrower cast local to this function) instead of `any`.

# ERROR 72b29849-123 no-casts `packages/ui/ui-template/src/model.ts:102:14`

The proxy handler's `get: (target: any, key) => …` widens `target` to `any`. Since `target` is always `{ [PATH]: path }` here, type it as that literal shape instead of `any`.

# ERROR 72b29849-124 no-casts `packages/ui/ui-template/src/model.ts:112:57`

`(value as any)[PATH]` casts an arbitrary `unknown` to `any` purely to index by the `PATH` symbol. Use a narrower cast such as `(value as { [PATH]: readonly string[] })[PATH]` instead of `any`, which keeps the indexing without opting the whole value out of type-checking.

# ERROR 72b29849-125 no-casts `packages/ui/ui-template/src/model.ts:115:39`

`fromState = (path: Path<any>): Binding => …` hardcodes `Path<T>`'s type parameter to `any`, so this exported function accepts an unchecked path instead of the compile-time-checked path `Path<T>` exists to provide. `select`/`item` a few lines above show the fix: make `fromState` generic (`<T>(path: Path<T>): Binding`) instead of pinning `T` to `any`.

# ERROR 72b29849-126 no-casts `packages/ui/ui-template/src/model.ts:118:38`

`fromItem = (path: Path<any>): Binding => …` — same hardcoded-`any` type-parameter issue as line 115; make it generic instead.

# ERROR 72b29849-127 no-casts `packages/ui/ui-template/src/react/renderer.tsx:115:34`

`CreateRendererOptions<Schema.Codec<any, any>>` — same widened `Schema.Codec<any, any>` issue as `System.stories.tsx:351`; tighten both type arguments instead of `any`.

# ERROR 72b29849-128 no-casts `packages/ui/ui-template/src/react/System.stories.tsx:351:35`

`Registry<Db, Schema.Codec<any, any>>` widens both of `Schema.Codec`'s type parameters to `any`. Since this registry only ever stores schemas that get handed to `Form.Root`/decoded against `Record<string, unknown>` values, parameterize with the concrete codec type (or `Schema.Codec<unknown, unknown>`) instead of `any, any`.
