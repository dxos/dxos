---
branch: claude/new-session-txg12e
commit: c77fb7ade26136a0627454cf2a7d22e070fd398d
base: 311d611727a4fade688949af1b3296b5684024e0
mode: fast
createdAt: 2026-10-13T05:19:01.001Z
isFinalized: true
groups: 63
rules: [barrel-imports-not-internal-paths, canonical-api-surface, declare-optional-services-with-noop-layers, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, no-casts, test-asserts-real-behavior]
reviewId: c77fb7ad
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c77fb7ad-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- c77fb7ad-2 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- c77fb7ad-3 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:491
- c77fb7ad-4 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/proxy-db/database.ts:554
- c77fb7ad-5 - ignored - test-asserts-real-behavior - packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:42
- c77fb7ad-6 - ignored - no-casts - packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:114
- c77fb7ad-7 - resolved - barrel-imports-not-internal-paths - packages/plugins/plugin-space/src/operations/add-type.ts:1
- c77fb7ad-8 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-space/src/operations/add-type.ts:40

## Issues

# WARN c77fb7ad-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c77fb7ad-2 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.80. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c77fb7ad-3 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:491`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 491-502 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c77fb7ad-4 error-messages-carry-context `packages/core/echo/echo-client/src/proxy-db/database.ts:554`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 554-577 (`this.prototype.query = this.prototype._query;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c77fb7ad-5 test-asserts-real-behavior `packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:42`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.88. The likeliest place is lines 42-53 (`test.skip('set EchoSchema as echo object field', async () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c77fb7ad-6 no-casts `packages/core/echo/echo-client/src/proxy-db/mutable-schema.test.ts:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 114-125 (`expect(Type.getSchema(Obj.getType(object)!).ast).to.deep.eq(Type.getSchema(sc...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN c77fb7ad-7 barrel-imports-not-internal-paths `packages/plugins/plugin-space/src/operations/add-type.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.84. The likeliest place is lines 1-15 (`import * as Effect from 'effect/Effect';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c77fb7ad-8 declare-optional-services-with-noop-layers `packages/plugins/plugin-space/src/operations/add-type.ts:40`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 40-51 (`const plugins = yield* Effect.serviceOption(Plugin.Service);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `311d611727a4fade688949af1b3296b5684024e0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 190 uncertain, 119 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 208 (121 verdicts re-asked with context the model requested)
estimated input tokens: 2407736
billed input tokens: 2356849 (cost $0.0990)
measured chars per token: 3.06
```
