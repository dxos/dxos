---
branch: dm/peaceful-cannon-ewucwm
commit: 4451cf8f051559cde520f1faa5365a2c2f6d27df
base: 36f4894cc7f413abf8c3988738f77cbd4286df58
mode: fast
createdAt: 2026-10-12T18:28:48.888Z
isFinalized: true
groups: 353
rules: [declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, lifecycle-owned-by-its-resource, no-casts, no-mixed-promise-effect-lifecycle, use-context-scoped-cancellation]
reviewId: 4451cf8f
---

_8 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4451cf8f-1 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:178
- 4451cf8f-2 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1159
- 4451cf8f-3 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/make-object.ts:75
- 4451cf8f-4 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/make-object.ts:99
- 4451cf8f-5 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:95
- 4451cf8f-6 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- 4451cf8f-7 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:280
- 4451cf8f-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:280
- 4451cf8f-9 - resolved - declare-optional-services-with-noop-layers - packages/plugins/plugin-code/src/capabilities/app-graph-builder.ts:37
- 4451cf8f-10 - ignored - no-casts - packages/plugins/plugin-devtools/src/capabilities/index.ts:36
- 4451cf8f-11 - ignored - lifecycle-owned-by-its-resource - packages/plugins/plugin-routine/src/capabilities/registry-sync.ts:37
- 4451cf8f-12 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354
- 4451cf8f-13 - ignored - no-casts - packages/sdk/client/src/client/client.ts:310
- 4451cf8f-14 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:574
- 4451cf8f-15 - ignored - no-casts - packages/sdk/client/src/services/dedicated/dedicated-worker-client-services.test.ts:102
- 4451cf8f-16 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/observability/src/extensions/posthog/extension.ts:238

## Issues

# ERROR 4451cf8f-1 no-casts `packages/core/compute/compute/src/Operation.ts:178`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 178-212 (`export const lazyHandler: {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-2 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1159`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 1159-1201 (`export class Service extends Context.Service<Service, OperationService>()('@d...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-3 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/make-object.ts:75`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 75-86 (`throw new Error('Schema is required for reactive objects. Use Atom for untype...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4451cf8f-4 no-casts `packages/core/echo/echo/src/internal/common/proxy/make-object.ts:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 99-110 (`const metaProxy = (obj as any)[MetaId];`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4451cf8f-5 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:95`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 95-118 (`const deepCopy = <T>(value: T, visited = new Map<object, object>()): T => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-6 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4451cf8f-7 no-casts `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-8 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-9 declare-optional-services-with-noop-layers `packages/plugins/plugin-code/src/capabilities/app-graph-builder.ts:37`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 37-48 (`const pluginAssetsAtom = yield* Capability.atom(AppCapabilities.PluginAsset);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4451cf8f-10 no-casts `packages/plugins/plugin-devtools/src/capabilities/index.ts:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 36-47 (`const setupDevtools = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-11 lifecycle-owned-by-its-resource `packages/plugins/plugin-routine/src/capabilities/registry-sync.ts:37`

System One judges this a likely violation of `lifecycle-owned-by-its-resource` (Create and register cleanup once, in the owning layer), p=0.82. The likeliest place is lines 37-48 (`const skillDefinitionsAtom = yield* Capability.atom(AppCapabilities.SkillDefi...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4451cf8f-12 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 354-365 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4451cf8f-13 no-casts `packages/sdk/client/src/client/client.ts:310`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 310-333 (`async diagnostics(options: JsonKeyOptions = {}): Promise<any> {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-14 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:574`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 574-597 (`this._fatalErrorUpdate.emit(null);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 4451cf8f-15 no-casts `packages/sdk/client/src/services/dedicated/dedicated-worker-client-services.test.ts:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 102-113 (`await expect.poll(() => client2.spaces.get(space.id), { timeout: 3_000 }).toB...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 4451cf8f-16 no-mixed-promise-effect-lifecycle `packages/sdk/observability/src/extensions/posthog/extension.ts:238`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 238-249 (`uploadLogs: async () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `36f4894cc7f413abf8c3988738f77cbd4286df58`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 16 violations written to fragments, 284 uncertain, 3652 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 1393 (163 verdicts re-asked with context the model requested)
estimated input tokens: 9380311
billed input tokens: 8621605 (cost $0.3621)
measured chars per token: 3.26
```
