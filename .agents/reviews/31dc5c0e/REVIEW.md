---
branch: dm/peaceful-cannon-ewucwm
commit: 31dc5c0e4c54c2725f7a7e1fed5018a82712f413
base: 36f4894cc7f413abf8c3988738f77cbd4286df58
mode: fast
createdAt: 2026-10-12T06:48:55.769Z
isFinalized: true
groups: 108
rules: [effect-fn-not-hand-wrapped-gen, error-messages-carry-context, lifecycle-owned-by-its-resource, no-casts, no-mixed-promise-effect-lifecycle]
reviewId: 31dc5c0e
---

_5 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 31dc5c0e-1 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:213
- 31dc5c0e-2 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:1159
- 31dc5c0e-3 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/make-object.ts:75
- 31dc5c0e-4 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/make-object.ts:99
- 31dc5c0e-5 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299
- 31dc5c0e-6 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516
- 31dc5c0e-7 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:280
- 31dc5c0e-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:280
- 31dc5c0e-9 - ignored - lifecycle-owned-by-its-resource - packages/plugins/plugin-routine/src/capabilities/registry-sync.ts:61
- 31dc5c0e-10 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354
- 31dc5c0e-11 - resolved - no-mixed-promise-effect-lifecycle - packages/sdk/observability/src/extensions/posthog/extension.ts:238

## Issues

# ERROR 31dc5c0e-1 no-casts `packages/core/compute/compute/src/Operation.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 213-259 (`export type Props<I, O> = Omit<Definition<I, O>, DefinitionTypeId | 'pipe' | ...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc5c0e-2 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:1159`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 1159-1201 (`export class Service extends Context.Service<Service, OperationService>()('@d...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc5c0e-3 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/make-object.ts:75`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 75-86 (`throw new Error('Schema is required for reactive objects. Use Atom for untype...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc5c0e-4 no-casts `packages/core/echo/echo/src/internal/common/proxy/make-object.ts:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 99-110 (`const metaProxy = (obj as any)[MetaId];`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc5c0e-5 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:299`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 299-323 (`if (descriptor.configurable) {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc5c0e-6 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:516`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 516-539 (`const echoRoot = getEchoRoot(target);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc5c0e-7 no-casts `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc5c0e-8 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc5c0e-9 lifecycle-owned-by-its-resource `packages/plugins/plugin-routine/src/capabilities/registry-sync.ts:61`

System One judges this a likely violation of `lifecycle-owned-by-its-resource` (Create and register cleanup once, in the owning layer), p=0.83. The likeliest place is lines 61-72 (`const operationHandlersAtom = yield* Capability.atom(Capabilities.OperationHa...`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 31dc5c0e-10 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 354-365 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 31dc5c0e-11 no-mixed-promise-effect-lifecycle `packages/sdk/observability/src/extensions/posthog/extension.ts:238`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 238-249 (`return undefined;`, location confidence 0.44). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `36f4894cc7f413abf8c3988738f77cbd4286df58`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 132 uncertain, 678 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 357 (82 verdicts re-asked with context the model requested)
estimated input tokens: 3848555
billed input tokens: 3645249 (cost $0.1531)
measured chars per token: 3.17
```
