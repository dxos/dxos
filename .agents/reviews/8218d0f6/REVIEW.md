---
branch: dm/laughing-maxwell-4s80xw
commit: 8218d0f6b2c53b65e2ef6ebb1a65c54b0587f92d
base: 794c28cec40211423329d1c5c3448974792b1c49
mode: fast
createdAt: 2026-11-25T17:19:42.773Z
isFinalized: true
groups: 98
rules: [bounded-live-state, call-effect-api-not-promise-bridge, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, flat-layer-composition, mutate-echo-arrays-with-splice, no-casts, per-test-mutable-fixtures]
reviewId: 8218d0f6
---

_4 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8218d0f6-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:65
- 8218d0f6-2 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:206
- 8218d0f6-3 - ignored - error-messages-carry-context - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:751
- 8218d0f6-4 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessHandle.ts:429
- 8218d0f6-5 - ignored - effect-requirement-type-not-erased - packages/core/compute/compute-runtime/src/ProcessHandle.ts:429
- 8218d0f6-6 - ignored - per-test-mutable-fixtures - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:126
- 8218d0f6-7 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:525
- 8218d0f6-8 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1012
- 8218d0f6-9 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1672
- 8218d0f6-10 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:175
- 8218d0f6-11 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:442
- 8218d0f6-12 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.ts:1228
- 8218d0f6-13 - ignored - mutate-echo-arrays-with-splice - packages/core/compute/compute/src/Agent.ts:202
- 8218d0f6-14 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Agent.ts:313
- 8218d0f6-15 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Process.ts:615

## Issues

# WARN 8218d0f6-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:65`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 65-90 (`export const bindSession = (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-2 declare-optional-services-with-noop-layers `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:206`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.93. The likeliest place is lines 206-229 (`export const layer = (opts?: Options): Layer.Layer<Agent.Service, never, Proc...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-3 error-messages-carry-context `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:751`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 751-768 (`currentThread: Effect.die(new Error('Agent.currentThread is not implemented.')),`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8218d0f6-4 no-casts `packages/core/compute/compute-runtime/src/ProcessHandle.ts:429`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 429-452 (`redeliver(event: PersistedEvent, definition: Operation.Durable<I, O, any, any...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-5 effect-requirement-type-not-erased `packages/core/compute/compute-runtime/src/ProcessHandle.ts:429`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.81. The likeliest place is lines 429-452 (`redeliver(event: PersistedEvent, definition: Operation.Durable<I, O, any, any...`, location confidence 0.46). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-6 per-test-mutable-fixtures `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:126`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.84. The likeliest place is lines 126-142 (`const SlowChildGate = {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8218d0f6-7 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:525`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 525-548 (`Effect.fn(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-8 call-effect-api-not-promise-bridge `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1012`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.85. The likeliest place is lines 1012-1035 (`);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-9 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1672`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 1672-1695 (`);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8218d0f6-10 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:175`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 175-196 (`const EMPTY_RPC_CLIENT: RpcClient.RpcClient<any> = Effect.runSync(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8218d0f6-11 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:442`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 442-465 (`}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-12 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.ts:1228`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 1228-1250 (`export const layer = (opts?: {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-13 mutate-echo-arrays-with-splice `packages/core/compute/compute/src/Agent.ts:202`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.90. The likeliest place is lines 202-224 (`}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-14 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Agent.ts:313`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 313-329 (`export const loadTasks = (session: Session): Effect.Effect<Task.Task[], never...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8218d0f6-15 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Process.ts:615`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 615-633 (`export const spawn = <I, O, Rpcs extends Rpc.Any = never>(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `794c28cec40211423329d1c5c3448974792b1c49`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 15 violations written to fragments, 308 uncertain, 100 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 307 (172 verdicts re-asked with context the model requested)
estimated input tokens: 5486082
billed input tokens: 5265436 (cost $0.2211)
measured chars per token: 3.13
```
