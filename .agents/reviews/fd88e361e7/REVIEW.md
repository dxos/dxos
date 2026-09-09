---
branch: claude/protobuf-js-audit-w6v5mg
commit: fd88e361e717cb7321d8ce760018e6c59ab666ec
base: cff33b775564e74d1d6e1de4cbcf9ca68bd284a9
mode: pr-only
createdAt: 2026-09-09T13:35:57.369Z
isFinalized: true
groups: 20
rules: [declare-optional-services-with-noop-layers, inline-obj-parent, namespace-service-layers, no-casts, no-sleep-in-test, no-trivial-wrappers-over-official-apis, operations-take-refs-not-ids]
reviewId: fd88e361e7
---

_65 error(s), 64 warning(s)._

# WARN fd88e361e7-1 no-trivial-wrappers-over-official-apis `packages/apps/composer-app/src/util/config.ts:84`

`composerBuildVersion` is a one-line local helper whose body is a single call — `config.get('runtime.app.build.version')` — with no branching, derived value, or non-trivial default, and it renames that call at its one call site (line 113). Per `no-trivial-wrappers-over-official-apis`, inline it: `release: config.get('runtime.app.build.version')`.

# WARN fd88e361e7-2 namespace-service-layers `packages/common/graph/src/GraphModel.test.ts:16:20`

`GraphNode.GraphNode.mapFields(...)` repeats the namespace as `Name.Name.member` in a value position — `GraphNode.ts` is marked `@import-as-namespace`, so this should read `GraphNode.mapFields(...)` per the `namespace-service-layers` rule (the member should be reachable directly off the namespace, not doubled).

# WARN fd88e361e7-3 no-trivial-wrappers-over-official-apis `packages/core/compute/agent-runtime/src/agent-service/agent-process.ts:170`

`now` is a local helper whose body is a single call — `clock.currentTimeMillisUnsafe()` — with no branching or derived value, called at 2 sites in this generator. Per `no-trivial-wrappers-over-official-apis`, call `clock.currentTimeMillisUnsafe()` directly at each site rather than through the renamed local wrapper.

# WARN fd88e361e7-4 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/sync-refresh.test.ts:56`

`readerCopy` retries a query in a `for` loop with `await new Promise((resolve) => setTimeout(resolve, 10))` between attempts — a busy-poll loop synchronizing with async replication. Per `no-sleep-in-test`, replace with a `Trigger`/`waitForCondition` (e.g. `waitForCondition({ condition: () => ... })`) or an ECHO query subscription instead of fixed-interval polling.

# WARN fd88e361e7-5 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/sync-refresh.test.ts:70:71`

`propagate` busy-polls up to 2,000 times with `await new Promise((resolve) => setTimeout(resolve, 0))` to wait for a subscription notification. Use a `Trigger` woken from the `Obj.subscribe` callback instead of spinning on macrotasks.

# WARN fd88e361e7-6 no-sleep-in-test `packages/core/echo/echo-client/src/client/index-query-source-provider.test.ts:171`

`await new Promise((resolve) => setTimeout(resolve, 10))` is used to let a reactive query settle before asserting no remote call happened. This is a fixed-delay synchronization wait; prefer `waitForCondition`/a subscription trigger (the same test already uses `expect.poll` a few lines below for the positive case — use the same pattern here, or an explicit signal from `source`).

# ERROR fd88e361e7-7 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:544`

`(this.getRaw([SYSTEM_NAMESPACE, 'kind']) as any) ?? EntityKind.Object` uses `as any` to bypass the return type of `getRaw`, per `no-casts`. Type `getRaw` (or add a typed overload for this system-namespace key) so `getKind` returns `EntityKind` without the cast.

# ERROR fd88e361e7-8 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:243`

`(target as any)[key] !== value` casts `target` to `any` to allow indexing by an arbitrary `key`, per `no-casts`. Use an index-signature-typed local (e.g. `Record<string, unknown>`) or a typed accessor helper instead of widening to `any`.

# ERROR fd88e361e7-9 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:249`

`delete (target as any)[key]` repeats the `any` cast to delete a dynamic property, per `no-casts`. Fix at the source with a properly typed dynamic-property helper rather than casting to `any` at each call site.

# ERROR fd88e361e7-10 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:341`

`const previous = (target as any)[key]` casts `target` to `any` for dynamic indexing, per `no-casts`. Same fix as the other occurrences in this file: type the dynamic-access helper once instead of casting at each use.

# ERROR fd88e361e7-11 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:343`

`(record as any)[key]` widens `record` to `any` to read a dynamic property, per `no-casts`. Replace with a typed index signature or a small typed accessor.

# ERROR fd88e361e7-12 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:345`

`delete (target as any)[key]` is another `any`-cast dynamic delete, per `no-casts`. Consolidate these dynamic-property reads/writes/deletes behind one typed helper instead of repeated `as any` casts.

# WARN fd88e361e7-13 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction-policy.test.ts:80`

`await sleep(NEGATIVE_ASSERTION_DELAY_MS)` before asserting a state did NOT change is a fixed-delay synchronization wait (recurs at lines 365, 426, 507, 858, 867, 911, 918, 969, 1012, 1045, 1085). Per `no-sleep-in-test`, prefer waiting on an observable signal (e.g. `waitForQueryState`/`findInStates`, which this file already has) with a bounded timeout, rather than a blind delay before a negative assertion.

# WARN fd88e361e7-14 no-trivial-wrappers-over-official-apis `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:46`

`withSpace` is a describe/module-local helper whose body is a single forwarding call — `q.from([{ _tag: 'space', spaceId: SPACE_ID }])` — reused at 15 call sites in this test file. Per `no-trivial-wrappers-over-official-apis`, this hides which `Query` API is under test behind an ad-hoc name; inline `q.from([{ _tag: 'space' as const, spaceId: SPACE_ID }])` at each call site (or, if the repetition is truly desired, keep a single shared query builder rather than a bare forwarding wrapper).

# ERROR fd88e361e7-15 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:23`

`catch (err: any)` widens the caught error to `any`, per `no-casts`. Catch as `unknown` and narrow (`err instanceof Error`) before use.

# ERROR fd88e361e7-16 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:36`

`const obj: any = Obj.make(Sheet, {})` widens `obj` to `any`, per `no-casts`, defeating type checking for every later use of `obj` in this test. Let `Obj.make` infer the `Sheet`-typed object instead of annotating `any`.

# ERROR fd88e361e7-17 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:37`

`Obj.update(obj, (obj: any) => {` re-widens the callback parameter to `any`, per `no-casts`. Let it infer from `Obj.update`'s signature instead of annotating `any`.

# ERROR fd88e361e7-18 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:47`

`const obj: any = Obj.make(Sheet, {})` — same `any` widening as line 36, per `no-casts`.

# ERROR fd88e361e7-19 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:48`

`Obj.update(obj, (obj: any) => {` — same `any`-widened callback parameter as line 37, per `no-casts`.

# ERROR fd88e361e7-20 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:57`

`const obj: any = Obj.make(Sheet, {})` — same `any` widening as line 36, per `no-casts`.

# ERROR fd88e361e7-21 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:58`

`Obj.update(obj, (obj: any) => {` — same `any`-widened callback parameter as line 37, per `no-casts`.

# ERROR fd88e361e7-22 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:67`

`const obj: any = Obj.make(Sheet, { rec: { list: ['x'] } })` widens `obj` to `any`, per `no-casts`. Same fix: drop the annotation and let it infer.

# ERROR fd88e361e7-23 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:73`

`const obj: any = Obj.make(Sheet, {})` — same `any` widening as line 36, per `no-casts`.

# ERROR fd88e361e7-24 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:74`

`Obj.update(obj, (obj: any) => {` — same `any`-widened callback parameter as line 37, per `no-casts`.

# ERROR fd88e361e7-25 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:80`

`Obj.update(obj, (obj: any) => {` — same `any`-widened callback parameter as line 37, per `no-casts`.

# ERROR fd88e361e7-26 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:95`

`const obj: any = Obj.make(Sheet, {})` — same `any` widening as line 36, per `no-casts`.

# ERROR fd88e361e7-27 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:99`

`const writeThrough = (target: any) => {` widens the parameter to `any`, per `no-casts`. Type `target` as the actual raw-target/`Sheet` shape it receives.

# ERROR fd88e361e7-28 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:107`

`Obj.update(obj, (obj: any) => {` — same `any`-widened callback parameter as line 37, per `no-casts`.

# ERROR fd88e361e7-29 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:115`

`const obj: any = Obj.make(Sheet, { rec: { list: ['x'] } })` — same `any` widening as line 67, per `no-casts`.

# ERROR fd88e361e7-30 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:117`

`Obj.update(obj, (obj: any) => {` — same `any`-widened callback parameter as line 37, per `no-casts`.

# ERROR fd88e361e7-31 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:126`

`const obj: any = Obj.make(Sheet, { rec: { list: ['x'] } })` — same `any` widening as line 67, per `no-casts`.

# ERROR fd88e361e7-32 no-casts `packages/core/echo/echo/src/internal/common/proxy/nested-array-gate.test.ts:129`

`Obj.update(obj, (obj: any) => {` — same `any`-widened callback parameter as line 37, per `no-casts`.

# ERROR fd88e361e7-33 no-casts `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:46`

`(value as any)[symbolProxy] === value` casts to `any` to read a symbol-keyed property, per `no-casts`. Declare the symbol's property on a typed interface (or use a typed `Record<symbol, unknown>`) instead of casting through `any`.

# ERROR fd88e361e7-34 no-casts `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:90`

`setProxyHandler = <T extends object>(proxy: any, handler: ReactiveHandler<T>)` takes a widened `any` parameter, per `no-casts`. Type `proxy` as the generic `T` (or the target/proxy type this module already uses elsewhere) rather than `any`.

# WARN fd88e361e7-35 no-trivial-wrappers-over-official-apis `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:144`

`writeHandlerOf` is a module-local helper whose body is a single call — `Reflect.get(target, symbolReactiveHandler)` — with no branching or derived value, called at 6 sites in this file. Per `no-trivial-wrappers-over-official-apis`, inline `Reflect.get(target, symbolReactiveHandler)` at each call site rather than renaming the API through a wrapper.

# ERROR fd88e361e7-36 no-casts `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:169`

`(value as any)[symbolMutableProxy] === value` casts to `any` to read a symbol-keyed property, per `no-casts`. Same fix as line 46: type the symbol property rather than casting through `any`.

# ERROR fd88e361e7-37 no-casts `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:177`

`canonicalOf = (value: any): any =>` both parameter and return type are widened `any`, per `no-casts`. Give this function a real generic/parameter type (e.g. `<T>(value: T): T` or `unknown`/typed union) instead of `any` on both sides.

# ERROR fd88e361e7-38 no-casts `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:190`

`normalizeForStorage = (value: any, seen = new Set<object>()): any =>` widens both the parameter and return type to `any`, per `no-casts`. Fix the type at its source (e.g. `unknown` with narrowing, or a proper recursive type) rather than `any`.

# ERROR fd88e361e7-39 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:140`

`let parent: any = getRawTarget(target)` declares `parent` as `any`, silencing checks on every subsequent `parent[key]` access in the loop, per `no-casts`. Type `parent` as `object`/`Record<string | number, unknown>` and narrow as needed instead.

# ERROR fd88e361e7-40 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:373`

`const value = (target as any)[key]` casts `target` to `any` for dynamic indexing, per `no-casts`. Use a typed dynamic-property accessor instead of `as any`.

# ERROR fd88e361e7-41 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:375`

`(target as any)[key] = createProxy(value, this)` is another `any`-cast dynamic write, per `no-casts`. Consolidate with the read on line 373 behind one typed helper rather than repeated `as any` casts.

# ERROR fd88e361e7-42 no-casts `packages/core/echo/echo/src/internal/JsonSchema/json-schema.ts:780`

`const result: any = { ...inlined }` declares `result` as `any`, silencing type checking on every subsequent assignment to `result[key]`, per `no-casts`. Give `result` the same (or a mutable variant of the) type as `inlined` instead of widening to `any`.

# WARN fd88e361e7-43 no-trivial-wrappers-over-official-apis `packages/core/halo/credentials/src/processor/device-state-machine.ts:32`

`emptyDeviceProfile` is a module-local helper whose body is a single call — `create(DeviceProfileDocumentSchema, {})` — with no branching, called at 2 sites. Per `no-trivial-wrappers-over-official-apis`, inline `create(DeviceProfileDocumentSchema, {})` at each call site instead of forwarding through a renamed helper.

# WARN fd88e361e7-44 no-trivial-wrappers-over-official-apis `packages/core/mesh/messaging/src/signal-manager/edge-signal-manager.test.ts:23:7`

`payload` is a one-line local helper whose body is a single call to `create(AnySchema, { typeUrl: 'dxos.compute.TraceMessage', value: ... })`. Inline the `create(...)` call at its call sites instead of forwarding through a renamed local wrapper, per `no-trivial-wrappers-over-official-apis`.

# WARN fd88e361e7-45 no-trivial-wrappers-over-official-apis `packages/core/mesh/messaging/src/signal-manager/edge-signal-manager.ts:422:7`

`createMessageSource` is a one-line module-local helper whose body is a single call to `create(PeerSchema, { ...peerInfo, swarmKey: topic.toHex() })`, used at three call sites. Per `no-trivial-wrappers-over-official-apis`, inline the `create(...)` call at each site rather than forwarding through a renamed wrapper.

# WARN fd88e361e7-46 no-trivial-wrappers-over-official-apis `packages/core/mesh/messaging/src/signal-manager/memory-signal-manager.test.ts:21:7`

`payload`, `randomPeer` (line 23), and `message` (line 26) are one-line local helpers whose bodies are each a single call to `create(Schema, {...})` — exactly the pattern `no-trivial-wrappers-over-official-apis` targets. Per the rule, this is most acute in tests, where the call being made IS the thing under test: inlining `create(AnySchema, { typeUrl: ..., value: ... })`, `create(PeerSchema, { peerKey: ..., identityDid: ... })`, and `create(MessageSchema, init)` at each call site keeps the buf API being exercised visible in the assertion's own scope instead of hidden behind a renamed local wrapper.

# WARN fd88e361e7-47 no-sleep-in-test `packages/core/mesh/messaging/src/signal-manager/memory-signal-manager.test.ts:102`

`await sleep(20)` before asserting a message was NOT delivered (also lines 149, 203) is a fixed-delay synchronization wait. Prefer `waitForCondition` with a timeout, or restructure to assert on a `Trigger`/counter after the actual delivery it depends on is confirmed via an event rather than a blind delay.

# WARN fd88e361e7-48 no-trivial-wrappers-over-official-apis `packages/core/mesh/messaging/src/signal-manager/memory-signal-manager.ts:256:7`

`joinRequest` and `leaveRequest` (line 259) are one-line module-local helpers whose bodies are each a single call to `create(JoinRequestSchema, {...})` / `create(LeaveRequestSchema, {...})`. Per `no-trivial-wrappers-over-official-apis`, inline the `create(...)` calls at their call sites instead of forwarding through renamed wrappers.

# WARN fd88e361e7-49 no-trivial-wrappers-over-official-apis `packages/core/mesh/network-manager/src/signal/swarm-messenger.ts:229:7`

`messageData` is a one-line module-local helper whose body is a single call to `create(MessageDataSchema, { payload })`, used at four call sites in this file. Per `no-trivial-wrappers-over-official-apis`, this only renames the `create` API — inline `create(MessageDataSchema, { payload: ... })` at each call site.

# WARN fd88e361e7-50 no-sleep-in-test `packages/core/mesh/network-manager/src/swarm/connection.test.ts:87`

`await sleep(200)` between opening the fast connection and initiating the slow one is a fixed-delay synchronization wait standing in for an actual "connection is ready" signal. Use a `Trigger`/`waitForCondition` on the connection's state instead.

# ERROR fd88e361e7-51 no-casts `packages/core/mesh/network-manager/src/tests/basic-test-suite.ts:168`

`peer2._networkManager.getSwarm(topic)!._peers.get(...)` uses a non-null assertion (`!`) on the result of `getSwarm`, per `no-casts`. Handle the `undefined` case explicitly (e.g. optional chaining plus a defined assertion in the `expect.poll` predicate, or narrow before use) instead of asserting non-null.

# WARN fd88e361e7-52 no-sleep-in-test `packages/core/mesh/network-manager/src/transport/webrtc/rtc-transport-proxy.test.ts:185`

`await sleep(20)` after `close()` to let "the underlying pipe teardown settle" (also line 204/208, waiting for a stray post-close write not to arrive) are fixed-delay synchronizations with async teardown. Prefer waiting on an explicit close/teardown-complete signal (`Trigger`) rather than a timed guess, even though this `describe.skip` block is currently not run.

# WARN fd88e361e7-53 no-sleep-in-test `packages/core/mesh/rpc/src/rpc.test.ts:77`

`await sleep(5)` between `alice.open()` and constructing `bob` is used to sequence the two peers' opens rather than waiting on an observable condition (recurs at lines 118 and 179, also sequencing with a fixed delay before flipping `portOpen`/closing). The same file's `'open hangs on half-open streams'` test (line 125-131) shows the preferred pattern — a `Trigger` woken on an actual observed event instead of an arbitrary delay.

# WARN fd88e361e7-54 no-trivial-wrappers-over-official-apis `packages/core/mesh/teleport-extension-replicator/src/replicator-extension.ts:52:7`

`fromFeedReplication` is a one-line module-local helper whose body is a single call to `create(FeedInfoSchema, { ...info, feedKey: fromPublicKey(info.feedKey) })`. Per `no-trivial-wrappers-over-official-apis`, inline the `create(...)` call at its two call sites rather than forwarding through a renamed wrapper.

# ERROR fd88e361e7-55 no-casts `packages/core/mesh/teleport-extension-replicator/src/replicator-extension.ts:82`

`this._rpc!.rpc.ReplicatorService.updateFeeds(...)` uses a non-null assertion on `this._rpc`, per `no-casts`. Guard on `this._rpc` being set (or type the field so it is guaranteed non-null at this point, e.g. via a readiness check) instead of asserting with `!`.

# ERROR fd88e361e7-56 no-casts `packages/core/mesh/teleport-extension-replicator/src/replicator-extension.ts:227`

`this._rpc!.rpc.ReplicatorService.startReplication(...)` is another non-null assertion on `this._rpc`, per `no-casts`. Same fix as line 82 — guard or type the field instead of `!`.

# WARN fd88e361e7-57 no-trivial-wrappers-over-official-apis `packages/devtools/devtools/src/panels/echo/SpaceInfoPanel/SpaceProperties.tsx:32:11`

`unpackEpoch` is a component-local helper whose body is a single call to `anyUnpack(assertion, EpochSchema)` with a trivial existence guard. Per `no-trivial-wrappers-over-official-apis`, inline `assertion && anyUnpack(assertion, EpochSchema)` at its two call sites rather than forwarding through a renamed local wrapper.

# WARN fd88e361e7-58 no-trivial-wrappers-over-official-apis `packages/e2e/blade-runner/src/redis/redis.node.test.ts:199:7`

`createPayload` is a one-line local helper whose body is a single call to `create(AnySchema, {...})`, matched exactly by the rule's own example (`makeBody`). It renames the API rather than removing duplication, hiding what `create`/`AnySchema` are called with behind a name the reader must jump to. Per `no-trivial-wrappers-over-official-apis`, inline it at each of the four call sites (lines 51, 57, 64, 65), e.g. `create(AnySchema, { typeUrl: 'dxos.test', value: Buffer.from('response') })`.

# ERROR fd88e361e7-59 no-casts `packages/e2e/blade-runner/src/redis/rpc-codec.test.ts:11`

`const roundTrip = (value: any): any => rpcCodec.decode(rpcCodec.encode(value))` widens both the parameter and return type to `any`, per `no-casts`. Type `roundTrip` generically (`<T>(value: T): T`) or against the actual encodable value union instead.

# ERROR fd88e361e7-60 no-casts `packages/e2e/blade-runner/src/redis/rpc-codec.ts:86`

`encode: (value: any): Any =>` widens the `value` parameter to `any`, per `no-casts`. Type it against the actual encodable-value union this codec supports instead of `any`.

# ERROR fd88e361e7-61 no-casts `packages/e2e/blade-runner/src/redis/rpc-codec.ts:91`

`decode: (value: Any): any => decodeValue(...)` widens the return type to `any`, per `no-casts`. Give `decode` the real decoded-value union type instead of `any`.

# ERROR fd88e361e7-62 no-casts `packages/e2e/blade-runner/src/replicants/client-replicant.ts:276`

`client.services.services.EdgeAgentService!.createAgent(...)` uses a non-null assertion on `EdgeAgentService`, per `no-casts`. Check for its presence (e.g. throw/log a clear error if the service is missing) instead of asserting with `!`.

# WARN fd88e361e7-63 no-trivial-wrappers-over-official-apis `packages/plugins/plugin-assistant/src/hooks/useSkillRegistry.test.tsx:22:7`

`makeSpaceSkill` is a describe-local helper whose body is a single call to `Obj.make(Skill.Skill, {...})` with no branching or derived values beyond the `name` parameter — the same shape the rule flags. It obscures what `Obj.make` is actually constructed with at its three call sites (lines 38, 62, 63). Per `no-trivial-wrappers-over-official-apis`, inline `Obj.make(Skill.Skill, { name: 'Local', instructions: Template.make(), tools: [] })` etc. at each call site instead.

# WARN fd88e361e7-64 declare-optional-services-with-noop-layers `packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:29`

`Plugin.Service` is read via `Effect.serviceOption` to conditionally activate lazy modules, rather than declared as a requirement backed by a `layerNoop` on hosts without a plugin manager (e.g. an agent caller). Per the rule, declare the tag and provide a noop layer so the dependency is visible in the layer graph instead of silently resolving to nothing when absent.

# WARN fd88e361e7-65 inline-obj-parent `packages/plugins/plugin-github/src/operations/sync.ts:326:5`

`milestone` is created a few lines above via `Milestone.make(...)` inside the same scope where `taskSet` is already known, then immediately parented with `Obj.setParent(milestone, taskSet)`. Per `inline-obj-parent`, pass `[Obj.Parent]: taskSet` inline on the `Milestone.make` call instead of the separate `Obj.setParent` (guard it for the `existing` branch if reparenting a reused object is still needed there).

# WARN fd88e361e7-66 no-sleep-in-test `packages/plugins/plugin-google/src/operations/mail/sync/sync-e2e.test.ts:311`

The `while (true) { … await sleep(1_000); }` loop busy-polls the invocation trace feed to detect new invocations. Per `no-sleep-in-test`, use a query subscription/`waitForCondition` instead of a fixed 1s poll interval.

# WARN fd88e361e7-67 inline-obj-parent `packages/plugins/plugin-ibkr/src/sync.ts:61:3`

When `operation` is not supplied, `op` is a brand-new object from `db.add(Operation.serialize(...))` with `portfolio` already in scope, immediately followed by `Obj.setParent(op, portfolio)` — while the `trigger` created two lines below correctly inlines `[Obj.Parent]: portfolio` on `Trigger.make`. Per `inline-obj-parent`, thread the parent into the operation's construction (e.g. extend `Operation.serialize`/wrap its result with `[Obj.Parent]: portfolio`) instead of the trailing `Obj.setParent` call.

# WARN fd88e361e7-68 inline-obj-parent `packages/plugins/plugin-linear/src/operations/sync.ts:238:5`

Same pattern as the analogous GitHub sync: `milestone` is freshly created via `Milestone.make(...)` with `taskSet` already in scope, then parented via a separate `Obj.setParent(milestone, taskSet)` right after. Inline the parent as `[Obj.Parent]: taskSet` on the `Milestone.make` call per `inline-obj-parent`.

# WARN fd88e361e7-69 inline-obj-parent `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:82:3`

`instructions` is created via `Instructions.make(...)` with `project` already known, then parented via a trailing `Obj.setParent(instructions, project)` — contrast with the `Task.make({ [Obj.Parent]: taskSet, ... })` calls just below in the same function. Per `inline-obj-parent`, set `[Obj.Parent]: project` inline on the `Instructions.make` call.

# WARN fd88e361e7-70 inline-obj-parent `packages/plugins/plugin-projects/src/operations/delete-project.test.ts:52:5`

`instructions` is created via `Instructions.make(...)` with `project` already in scope, then parented with a separate `Obj.setParent(instructions, project)` call. Per `inline-obj-parent`, pass `[Obj.Parent]: project` inline on the `Instructions.make` call instead.

# WARN fd88e361e7-71 namespace-service-layers `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.stories.tsx:39:14`

`History.History.pipe(Schema.optional)` repeats the namespace as `Name.Name.member` in a value position, the same doubled-namespace issue as `model.test.ts` — `History` is `@import-as-namespace`, so the story should reference the schema without repeating the namespace.

# WARN fd88e361e7-72 declare-optional-services-with-noop-layers `packages/plugins/plugin-space/src/operations/add-type.ts:41`

`Plugin.Service` and `Capability.Service` (line 46) are read via `Effect.serviceOption` with a comment explicitly justifying it as avoiding "a declared service would resolve eagerly and die there" on headless hosts — exactly the alternative the rule rejects. Declare both tags in the handler's requirements and satisfy headless hosts (edge, `dx mcp serve`) with a documented `layerNoop` instead, so the requirement is visible in the graph and failures at the point of use are loud rather than the feature silently disappearing.

# WARN fd88e361e7-73 operations-take-refs-not-ids `packages/plugins/plugin-space/src/types/SpaceOperation.ts:135:5`

`WaitForObject`'s input field `id: Schema.optional(Schema.String)` names the ECHO object to wait for by a bare string id, violating `operations-take-refs-not-ids`. It should be `id: Schema.optional(Ref.Ref(Obj.Unknown))` so the caller supplies a typed, self-resolving reference instead of an opaque id the handler must re-derive meaning from.

# ERROR fd88e361e7-74 no-casts `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:34:6`

The story builds a fake `Observability.Observability` via `as unknown as Observability.Observability`, the double-cast escape hatch banned by the no-casts rule. Fix by constructing an object that actually satisfies the interface's shape (or a minimal subset accepted through a proper test-double type), instead of casting through `unknown`.

# ERROR fd88e361e7-75 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:14:3`

`observabilityWith` builds its return value with `as unknown as Observability.Observability`, the double-cast escape hatch. Construct a real test double honoring the type, or narrow the parameter/return type so no cast is needed, per the no-casts rule.

# ERROR fd88e361e7-76 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:50:5`

`fetchMock.mock.calls[0] as unknown as [string, RequestInit]` is a double-cast escape hatch banned by the no-casts rule. Type `fetchMock` with `vi.fn<typeof fetch>()` (or an equivalent explicit signature) so `mock.calls[0]` is already `[string, RequestInit]` without casting.

# ERROR fd88e361e7-77 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:135:5`

Same issue as line 50: `fetchMock.mock.calls[0] as unknown as [string, RequestInit]` casts around a loosely-typed mock instead of typing `fetchMock` correctly, violating the no-casts rule.

# ERROR fd88e361e7-78 no-casts `packages/sdk/client-e2e/src/client-services.test.ts:262:11`

The newly-rewritten assertion uses `client1.halo.identity.get()!.identityKey`, a non-null assertion banned by the no-casts rule. Narrow via an explicit check/`invariant(identity)` before dereferencing, or restructure the comparison so a possibly-undefined identity is handled instead of asserted away.

# ERROR fd88e361e7-79 no-casts `packages/sdk/client-e2e/src/contact-book.test.ts:157:56`

`client.halo.identity.get()!.identityKey` is a new non-null assertion introduced by this change, violating the no-casts rule. Guard with an explicit presence check (e.g. `invariant`) instead of asserting.

# ERROR fd88e361e7-80 no-casts `packages/sdk/client-e2e/src/lazy-space-loading.test.ts:87:60`

`client2.halo.identity.get()!.identityKey` is a newly added non-null assertion, banned by the no-casts rule. Replace with an explicit invariant/guard on `identity.get()` before accessing `.identityKey`.

# ERROR fd88e361e7-81 no-casts `packages/sdk/client-e2e/src/space-member-management.test.ts:136:32`

`target.halo.identity.get()!.identityKey` is a new non-null assertion added by this change. Per the no-casts rule, guard the possibly-undefined identity explicitly rather than asserting it away.

# ERROR fd88e361e7-82 no-casts `packages/sdk/client-e2e/src/space-member-management.test.ts:148:56`

`client.halo.identity.get()!.identityKey` is another newly added non-null assertion in the same file, violating the no-casts rule; add an explicit check instead.

# WARN fd88e361e7-83 no-sleep-in-test `packages/sdk/client-e2e/src/spaces-invitations-subduction.test.ts:96`

`await sleep(20)` is inserted before `fredInvitations.waitEmpty()`, which is itself an event-driven wait — the preceding sleep is a fixed-delay synchronization guess papering over a race rather than relying on the tracker's own wait. Drop the sleep and let `waitEmpty()` do the synchronizing (add a condition to the tracker if the race is real).

# WARN fd88e361e7-84 no-sleep-in-test `packages/sdk/client-e2e/src/spaces-invitations.test.ts:85`

Same pattern as `spaces-invitations-subduction.test.ts`: `await sleep(20)` precedes `fredInvitations.waitEmpty()`, an event-driven wait that should synchronize on its own. Remove the fixed delay.

# WARN fd88e361e7-85 no-trivial-wrappers-over-official-apis `packages/sdk/client-protocol/src/bridge-rpc.ts:47:7`

`const empty = (): Empty => create(EmptySchema, {});` is a one-line helper whose body is a single call to `create`, adding no branching or derived values, matching the `no-trivial-wrappers-over-official-apis` rule's example almost exactly. Inline `create(EmptySchema, {})` at its three call sites (`sendSignal`, `sendData`, `close`) instead — that keeps the `create` call (the actual API being exercised) visible at each site rather than hidden behind a locally-invented name.

# WARN fd88e361e7-86 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/packlets/agents/edge-agent-manager.ts:223`

`EdgeAgentManagerLayer` declares its type as `Layer.Layer<EdgeAgentManagerService, never, DataSpaceManagerService | IdentityProviderService>`, omitting `EdgeHttpClientService`, then reads it via `Effect.serviceOption` inside the layer body. Add `EdgeHttpClientService` to the layer's requirements and supply a documented `layerNoop` on hosts without a real edge client, rather than an invisible optional read.

# WARN fd88e361e7-87 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/packlets/identity/identity-manager.ts:598`

`IdentityManagerLayer`'s declared type (`Layer.Layer<IdentityManagerService, never, IMetadataStoreService | KeyringApiService | FeedStoreService | SpaceManagerService>`) does not include `EdgeConnectionService`, yet the layer body reads it via `Effect.serviceOption`. Declare `EdgeConnectionService` in the requirements and back non-edge hosts with a `layerNoop`, per the rule.

# WARN fd88e361e7-88 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/packlets/identity/identity-recovery-manager.ts:360`

`EdgeIdentityRecoveryManagerLayer` declares `Layer.Layer<EdgeIdentityRecoveryManagerService, never, KeyringApiService | IdentityManagerService>`, excluding `EdgeHttpClientService`, which is then read with `Effect.serviceOption`. Declare the tag as a requirement and provide a `layerNoop` for hosts lacking a real edge HTTP client instead of the invisible optional read.

# WARN fd88e361e7-89 no-sleep-in-test `packages/sdk/client-services/src/packlets/invitations/invitations-handler.test.ts:83`

`await sleep(200)` between `guest.sink.waitFor(READY_FOR_AUTHENTICATION)` and `host.sink.waitFor(CONNECTING)` is a fixed-delay synchronization wait standing in for the state transition it's supposed to wait for.

# WARN fd88e361e7-90 no-sleep-in-test `packages/sdk/client-services/src/packlets/invitations/invitations-handler.test.ts:87`

`await sleep(10)` before asserting `ctx.disposed` is `false` (also line 106) is a fixed-delay wait used to let disposal settle before a negative assertion. Prefer `waitForCondition`/a `Trigger` on the context's dispose event.

# ERROR fd88e361e7-91 no-casts `packages/sdk/client-services/src/packlets/invitations/invitations-handler.test.ts:151:24`

The reindented call `codeInput.wake(invitation.authCode!)` retains/reintroduces a non-null assertion on `invitation.authCode` on a line this change touched. Per the no-casts rule, confirm presence with an explicit check (or type `authCode` as required where it is always set) instead of asserting.

# WARN fd88e361e7-92 no-sleep-in-test `packages/sdk/client-services/src/packlets/invitations/invitations-handler.test.ts:186`

`while (!guest.ctx.disposed) { await failCodeInput(...); await sleep(10); }` is a busy-poll loop with a fixed 10ms delay between iterations to synchronize with async disposal. Use `waitForCondition` (already used elsewhere in this file, e.g. `failCodeInput` itself) instead of hand-rolling the poll with a sleep.

# WARN fd88e361e7-93 no-sleep-in-test `packages/sdk/client-services/src/packlets/invitations/invitations-handler.test.ts:258`

`await sleep(40)` after `waitForCondition` finds the first successful guest, before asserting exactly one succeeded, is a fixed-delay wait relying on timing rather than an observable "no more will succeed" signal.

# WARN fd88e361e7-94 no-sleep-in-test `packages/sdk/client-services/src/packlets/invitations/invitations-handler.test.ts:334`

`createNewHost` does `await performAuth(...); await sleep(30); await hostInvitation(...)` — a fixed-delay wait sequencing host creation with the prior auth rather than an observable condition.

# WARN fd88e361e7-95 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/packlets/invitations/invitations-handler.ts:622`

`InvitationsHandlerLayer` is typed `Layer.Layer<InvitationsHandlerService, never, SwarmNetworkManagerService>`, leaving `EdgeHttpClientService` out of its requirements while reading it via `Effect.serviceOption` in the body. Add the tag to the layer's requirements and satisfy it with a documented `layerNoop` on hosts without edge connectivity.

# WARN fd88e361e7-96 no-trivial-wrappers-over-official-apis `packages/sdk/client-services/src/packlets/metadata/metadata-store.ts:92:7`

`const emptyLargeSpaceMetadata = (): LargeSpaceMetadata => create(LargeSpaceMetadataSchema, {});` is a single-call forward to `create` with no branching, error handling, or derived values — per `no-trivial-wrappers-over-official-apis`, inline `create(LargeSpaceMetadataSchema, {})` at its two call sites instead of naming this trivial redirection.

# WARN fd88e361e7-97 no-trivial-wrappers-over-official-apis `packages/sdk/client-services/src/packlets/metadata/sqlite-metadata-store.ts:53:7`

Same issue as `metadata-store.ts`: `const emptyLargeSpaceMetadata = (): LargeSpaceMetadata => create(LargeSpaceMetadataSchema, {});` only forwards to `create(LargeSpaceMetadataSchema, {})` with no added logic. Per `no-trivial-wrappers-over-official-apis`, inline the `create` call at its two call sites rather than renaming it.

# ERROR fd88e361e7-98 no-casts `packages/sdk/client-services/src/packlets/pipeline/pipeline.test.ts:51:27`

`pipeline.writer!.write(...)` uses a non-null assertion on a line modified by this change (to wrap the payload in `create(FeedMessage_PayloadSchema, {})`). Per the no-casts rule, assert presence via an explicit check (e.g. `invariant(pipeline.writer)`) rather than `!`.

# WARN fd88e361e7-99 no-sleep-in-test `packages/sdk/client-services/src/packlets/pipeline/pipeline.test.ts:133`

`await sleep(1000)` after `pipeline.start()` is a fixed-delay wait for the background consumer (started via `setTimeout` at line 125) to make progress before `pause()`/`setCursor()`/`unpause()` are called. Synchronize on the `processedEvent`/`processedSequenceNumbers` state instead (e.g. `waitForCondition`).

# WARN fd88e361e7-100 no-sleep-in-test `packages/sdk/client-services/src/packlets/services/feed-syncer.test.ts:298`

`await new Promise((resolve) => setTimeout(resolve, 250))` is a fixed-delay wait for server-to-client replication to complete before querying the client feed store. Replace with a condition-based wait (`waitForCondition`/subscription) on the expected block count.

# ERROR fd88e361e7-101 no-casts `packages/sdk/client-services/src/packlets/services/service-host.test.ts:63:31`

`services.SpacesService!.createSpace(...)` is a non-null assertion on a line this change rewrote (previously destructured differently). Per the no-casts rule, guard `SpacesService` explicitly instead of asserting it non-null.

# ERROR fd88e361e7-102 no-casts `packages/sdk/client-services/src/packlets/services/service-host.test.ts:65:29`

`services.SpacesService!.queryCredentials(...)` — same non-null assertion issue as line 63, on a line rewritten by this change. Guard explicitly rather than asserting.

# ERROR fd88e361e7-103 no-casts `packages/sdk/client-services/src/packlets/space/control-pipeline.test.ts:94:13`

`controlPipeline.pipeline.writer!.write(...)` is a non-null assertion on a line this change rewrote (splitting the write call across multiple lines). Per the no-casts rule, guard `writer` explicitly instead of asserting.

# ERROR fd88e361e7-104 no-casts `packages/sdk/client-services/src/packlets/space/control-pipeline.test.ts:117:13`

Same issue as line 94: `controlPipeline.pipeline.writer!.write(...)` non-null-asserts on a rewritten line. Guard explicitly instead.

# ERROR fd88e361e7-105 no-casts `packages/sdk/client-services/src/packlets/spaces/data-space-manager.test.ts:457:12`

`replayedInvitee![1].role` — the enum reference was updated (`SpaceMember.Role.EDITOR` → `SpaceMember_Role.EDITOR`) on this line, and it still carries a non-null assertion on `replayedInvitee`. Per the no-casts rule, check for presence explicitly (e.g. `invariant(replayedInvitee)`) instead of asserting.

# WARN fd88e361e7-106 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:1190`

`DataSpaceManagerLayer`'s declared requirements (`SpaceManagerService | IMetadataStoreService | KeyringApiService | SigningContextProviderService | FeedStoreService | EchoHostService | InvitationsManagerService`) omit `EdgeConnectionService`, `EdgeHttpClientService`, `MeshEchoReplicatorService`, and `EdgeAutomergeReplicatorService`, all four of which are then read via `Effect.serviceOption` on lines 1190-1193. Declare all four as requirements and back the hosts that lack real implementations with documented `layerNoop` layers, instead of reads invisible to the layer's own signature.

# WARN fd88e361e7-107 no-sleep-in-test `packages/sdk/client-services/src/packlets/spaces/edge-feed-replicator.test.ts:34`

`await sleep(50)` before asserting `sendSpy` was not called is a fixed-delay negative-assertion wait. The same test uses `expect.poll` afterward for the positive case — prefer that pattern (or a `Trigger`) instead of a blind delay.

# WARN fd88e361e7-108 no-sleep-in-test `packages/sdk/client-services/src/packlets/spaces/edge-feed-replicator.test.ts:156`

`await sleep(100)` between `updateIdentity` and `admitConnection.wake()` is a fixed-delay wait sequencing the identity update with connection admission rather than an observable signal that the update was processed.

# WARN fd88e361e7-109 no-sleep-in-test `packages/sdk/client-services/src/packlets/spaces/edge-feed-replicator.test.ts:169`

`await sleep(10)` (also line 174 `sleep(20)`, line 186 `sleep(10)`) interleaves connection reset/identity update/feed append with fixed delays instead of waiting on an observable state (e.g. `expect.poll`, already used later in the same tests for the actual assertion).

# WARN fd88e361e7-110 no-sleep-in-test `packages/sdk/client/test/e2e/edge-recovery.test.ts:72`

`await sleep(15_000)` after creating the edge agent, with no condition check, is a blind fixed-delay wait for "HALO feed sync" to finish. Use a condition-based wait (similar to the `waitForSync` helper already defined later in this file) instead of guessing a duration.

# WARN fd88e361e7-111 no-sleep-in-test `packages/sdk/client/test/e2e/edge-recovery.test.ts:89`

`await sleep(1_000)` immediately after `await waitForSync(spaceA.db)` (which already resolves on a real condition) is a redundant fixed-delay wait layered on top of a proper synchronization primitive.

# WARN fd88e361e7-112 no-sleep-in-test `packages/sdk/client/test/e2e/edge-recovery.test.ts:113`

`await sleep(5_000)` waiting for "spaces to appear after recovery" has no condition check at all. Poll `clientB.spaces.get()` with `waitForCondition` instead of a blind delay.

# WARN fd88e361e7-113 no-sleep-in-test `packages/sdk/observability/test/e2e/tracing-invitation.test.ts:120`

`await sleep(15_000)` waiting for "HALO feed sync" is a blind fixed-delay wait with no condition check (recurs at line 131, whose own comment says "Pragmatic sleep instead of polling getSyncState", and line 156 waiting for trailing frames). Per `no-sleep-in-test`, use a condition-based wait even in this e2e/tracing context — a `TestClock`-independent `waitForCondition` with a generous timeout is still preferable to a guessed duration.

# WARN fd88e361e7-114 no-trivial-wrappers-over-official-apis `packages/sdk/react-client/src/client/ClientProvider.test.tsx:36:9`

`const render = () => useClient();` is a one-line local helper whose body forwards a single call to `useClient()` with no branching or derived logic — it only renames the hook for the two `renderHook(render, …)` call sites. Per `no-trivial-wrappers-over-official-apis`, inline it: pass `useClient` directly to `renderHook` (it already takes no arguments), which keeps the hook under test visible at the assertion site instead of requiring a jump to the wrapper's definition.

# ERROR fd88e361e7-115 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:106:9`

The rewritten `recoverIdentity` call still builds `signature: Buffer.from((credential as any).response.signature)` — an `as any` cast newly reintroduced in this rewritten block. Type the `credential` (or its `response`) properly, e.g. as `PublicKeyCredential` with an `AuthenticatorAssertionResponse`, rather than casting to `any`.

# ERROR fd88e361e7-116 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:107:9`

Same rewritten block, `clientDataJson: Buffer.from((credential as any).response.clientDataJSON)` — another `as any` cast, violating the no-casts rule.

# ERROR fd88e361e7-117 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:108:9`

Same rewritten block, `authenticatorData: Buffer.from((credential as any).response.authenticatorData)` — another `as any` cast, violating the no-casts rule.

# ERROR fd88e361e7-118 no-casts `packages/sdk/schema/src/projection/projection.test.ts:810:7`

`mutable.jsonSchema.properties!.status = { type: 'string' }` is a non-null assertion on a line this change rewrote (renaming the callback parameter from `draft` to `mutable`). Per the no-casts rule, guard `properties` explicitly instead of asserting.

# WARN fd88e361e7-119 no-trivial-wrappers-over-official-apis `packages/sdk/types/src/types/Task.test.ts:364:7`

`const testLayer = () => TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task] });` is a module-local helper whose body is a single forwarding call to `TestDatabaseLayer`, matching the rule's own example (`makeBody`) almost exactly — renaming the API rather than removing duplication. Per `no-trivial-wrappers-over-official-apis`, inline `TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task] })` at each of the 14 `Effect.provide(...)` call sites so the layer construction under test stays visible in each test's own scope.

# WARN fd88e361e7-120 namespace-service-layers `packages/sdk/types/src/types/Task.ts:106:23`

`Actor.Actor.annotate({ title: 'Actor' })` repeats the namespace as `Name.Name.member` — `Actor.ts` is marked `@import-as-namespace`, so this should not require doubling `Actor.Actor`; expose the schema so callers can reference it as `Actor.<member>` directly.

# WARN fd88e361e7-121 namespace-service-layers `packages/sdk/types/src/types/Task.ts:200:24`

Same doubled-namespace issue as line 106: `Actor.Actor.annotate({ title: 'Assignee' })` repeats `Actor.Actor` at a call site instead of using a direct `Actor.<member>` accessor.

# WARN fd88e361e7-122 namespace-service-layers `packages/sdk/versioning/src/model.test.ts:22:14`

`History.History.pipe(Schema.optional)` repeats the namespace as `Name.Name.member` in a value position — `History.ts` is marked `@import-as-namespace`, so consumers should not have to spell `History.History`; the schema should be reachable directly (e.g. via a module-level accessor) so call sites read `History.pipe(...)`.

# WARN fd88e361e7-123 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:221`

`await sleep(200)` before asserting the failure-escalation counter stayed at 1 is a fixed-delay negative-assertion wait. Prefer waiting on an explicit signal (e.g. another `Trigger` fired on any further escalation attempt) with a timeout, rather than a blind delay.

# WARN fd88e361e7-124 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:252`

`await sleep(LOCK_OR_RPC_WAIT_TIMEOUT + 1_000)` is used to "outlive the lock/RPC budget" before asserting `follower.failures` is empty — a fixed-delay wait standing in for an observable "budget expired" signal. Where the budget itself is the thing under test a virtualized clock (`TestClock`) would avoid a real multi-second sleep.

# ERROR fd88e361e7-125 no-casts `packages/ui/react-ui-form/src/components/Form/FormField/FormFieldDispatch.tsx:154:41`

`SchemaEx.getDiscriminatedType(baseNode, value as any)` casts `value` to `any` to satisfy the call, violating the no-casts rule. Give `value` (or `getDiscriminatedType`'s parameter) its real type so the cast is unnecessary.

# ERROR fd88e361e7-126 no-casts `packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:72:20`

The component signature destructures `}: FormFieldsProps<any>)`, a widened `any` type parameter banned by the no-casts rule. Supply the concrete schema/value type argument instead of `any`.

# ERROR fd88e361e7-127 no-casts `packages/ui/react-ui-form/src/components/Form/FormFields/FormFields.tsx:140:3`

`FormFieldsProps<any>` is used again here (in a `memo`/`forwardRef` type annotation), another widened-`any` signature banned by the no-casts rule. Use the concrete type argument instead.

# ERROR fd88e361e7-128 no-casts `packages/ui/react-ui/src/components/Field/Field.stories.tsx:154:14`

`component: Field.Root as any` casts the story's `component` meta field to `any`, violating the no-casts rule. Type the Storybook `Meta` generic correctly against `Field.Root`'s props instead of casting.

# ERROR fd88e361e7-129 no-casts `packages/ui/react-ui/src/components/Field/Field.stories.tsx:364:5`

An `as any` cast appears in this story's args/render config, violating the no-casts rule. Type the value correctly instead of widening to `any`.
