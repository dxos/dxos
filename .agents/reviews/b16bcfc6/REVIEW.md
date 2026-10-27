---
branch: worktree-agent-a8be83f8b3c0a742a
commit: b16bcfc61c928681d16362151581796232736f17
base: ea4ccaf841e10662c345a5f90d84cd64de03c325
mode: fast
createdAt: 2026-10-09T03:33:20.331Z
isFinalized: true
groups: 59
rules: [effect-requirement-type-not-erased, no-casts]
reviewId: b16bcfc6
---

_3 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b16bcfc6-1 - unresolved - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- b16bcfc6-2 - unresolved - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:894
- b16bcfc6-3 - unresolved - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:311
- b16bcfc6-4 - unresolved - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:311

## Issues

# ERROR b16bcfc6-1 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 762-809 (`provides: [ServiceB],`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b16bcfc6-2 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:894`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 894-917 (`withDefaultTracer(this.#services),`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b16bcfc6-3 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:311`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 311-322 (`runPromise: (effect, options) => managedRuntime.runPromise(effect as Effect.E...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b16bcfc6-4 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:311`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.85. The likeliest place is lines 311-322 (`runPromise: (effect, options) => managedRuntime.runPromise(effect as Effect.E...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ea4ccaf841e10662c345a5f90d84cd64de03c325`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 152 uncertain, 98 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 181 (107 verdicts re-asked with context the model requested)
estimated input tokens: 2406915
billed input tokens: 2301179 (cost $0.0966)
measured chars per token: 3.14
```
