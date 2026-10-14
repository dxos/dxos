---
branch: dm/awesome-hawking-5110zl
commit: c53b30f45b4639b29c3a48728b4349c7b4266eaa
base: 42cff2098f24c66a2866899a3825feab14517886
mode: fast
createdAt: 2026-10-05T08:40:42.205Z
isFinalized: true
groups: 138
rules: [effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts]
reviewId: c53b30f4
---

_5 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c53b30f4-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/common/diagram/src/dsl/compile.ts:15
- c53b30f4-2 - ignored - namespace-export-with-internal-hiding - packages/common/diagram/src/index.ts:1
- c53b30f4-3 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:13
- c53b30f4-4 - ignored - no-casts - packages/common/diagram/src/mermaid-engine.test.ts:64
- c53b30f4-5 - ignored - no-casts - packages/common/diagram/src/mermaid.test.ts:84
- c53b30f4-6 - ignored - no-casts - packages/common/diagram/src/uml-grid.ts:411
- c53b30f4-7 - ignored - no-casts - packages/common/diagram/src/uml.test.ts:98
- c53b30f4-8 - ignored - no-casts - packages/common/diagram/src/uml.ts:144

## Issues

# WARN c53b30f4-1 effect-fn-not-hand-wrapped-gen `packages/common/diagram/src/dsl/compile.ts:15`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 15-25 (`export const compile = (text: string): Effect.Effect<ParseResult> =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c53b30f4-2 namespace-export-with-internal-hiding `packages/common/diagram/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-12 (`export * from './content.ts';`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN c53b30f4-3 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 13-24 (`export * as Layout from './layout.ts';`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c53b30f4-4 no-casts `packages/common/diagram/src/mermaid-engine.test.ts:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 64-75 (`expect(nodes).toHaveLength(6);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c53b30f4-5 no-casts `packages/common/diagram/src/mermaid.test.ts:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 84-95 (`const frame = objects.find((object) => object.id === 'CORE')!.elements[0];`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c53b30f4-6 no-casts `packages/common/diagram/src/uml-grid.ts:411`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 411-422 (`const to = rects.get(relation.to)!;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c53b30f4-7 no-casts `packages/common/diagram/src/uml.test.ts:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 98-109 (`const y = (id: string) => objects.find((object) => object.id === id)!.origin!.y;`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c53b30f4-8 no-casts `packages/common/diagram/src/uml.ts:144`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 144-155 (`continue;`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `42cff2098f24c66a2866899a3825feab14517886`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 141 uncertain, 980 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 479 (88 verdicts re-asked with context the model requested)
estimated input tokens: 4768983
billed input tokens: 4616137 (cost $0.1939)
measured chars per token: 3.10
```

## Dispositions

- c53b30f4-1: `Dsl.compile` now uses `Effect.fn`.
- c53b30f4-2, c53b30f4-3: the new `Semantic*` modules follow `@dxos/diagram`'s existing barrel convention (lowercase files re-exported with `export * as`); changing it is a package-wide refactor outside this PR.
- c53b30f4-4 to c53b30f4-8: the flagged `!` assertions predate this PR (blame: 6653b790) and are not in its diff.
