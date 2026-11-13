---
branch: dm/magical-pascal-sf4365
commit: e610d6e359b95cf4159296ebef07b392b9a157f6
base: b0f8d0f075bd294c86f51f4370832d97dbfca105
mode: fast
createdAt: 2026-10-26T13:31:34.218Z
isFinalized: true
groups: 78
rules: [effect-fn-not-hand-wrapped-gen, namespace-brand-key-prefixing]
reviewId: e610d6e3
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e610d6e3-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/query/sql/compile.test.ts:135
- e610d6e3-2 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-host/src/query/sql/compile.test.ts:472
- e610d6e3-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/query/sql/explain.test.ts:27

## Issues

# WARN e610d6e3-1 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/query/sql/compile.test.ts:135`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 135-165 (`const run = (fixture: Fixture, query: Query.Any) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN e610d6e3-2 namespace-brand-key-prefixing `packages/core/echo/echo-host/src/query/sql/compile.test.ts:472`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 472-495 (`expect(yield* orderedBy({ kind: 'annotation', key: 'test.rank', direction: 'a...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN e610d6e3-3 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/query/sql/explain.test.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 27-41 (`const explain = (query: Query.Any) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b0f8d0f075bd294c86f51f4370832d97dbfca105`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 91 uncertain, 61 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 124 (63 verdicts re-asked with context the model requested)
estimated input tokens: 1963523
billed input tokens: 1963169 (cost $0.0825)
measured chars per token: 3.00
```
