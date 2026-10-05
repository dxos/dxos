---
branch: claude/echo-local-database-integration-ah4pda
commit: 49f71392ecd44e6cd031e68f7c4ddd1435a8f392
base: 5536da7ac72658fa599921cb8ddd18672767ea3e
mode: fast
createdAt: 2026-10-03T08:49:51.863Z
isFinalized: true
groups: 65
rules: [error-messages-carry-context, errors-extend-base-error, inline-obj-parent, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle]
reviewId: 49f71392
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 49f71392-1 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:515
- 49f71392-2 - resolved - inline-obj-parent - packages/core/echo/echo-client/src/local-database-graph.test.ts:280
- 49f71392-3 - resolved - errors-extend-base-error - packages/core/echo/echo-client/src/query/federated-query-source.ts:38
- 49f71392-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-sqlite/src/database.ts:170
- 49f71392-5 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-sqlite/src/index.ts:1
- 49f71392-6 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-sqlite/src/record.ts:26
- 49f71392-7 - resolved - error-messages-carry-context - packages/core/echo/echo-sqlite/src/remote.ts:53

## Issues

# ERROR 49f71392-1 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:515`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 515-536 (`const compactMeta = (meta: EntityMeta): Partial<EntityMeta> => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49f71392-2 inline-obj-parent `packages/core/echo/echo-client/src/local-database-graph.test.ts:280`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 280-291 (`});`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49f71392-3 errors-extend-base-error `packages/core/echo/echo-client/src/query/federated-query-source.ts:38`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 38-49 (`export class FederatedQueryError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49f71392-4 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-sqlite/src/database.ts:170`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 170-193 (`}),`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49f71392-5 namespace-export-with-internal-hiding `packages/core/echo/echo-sqlite/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.90. The likeliest place is lines 1-14 (`export * from './database.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49f71392-6 namespace-brand-key-prefixing `packages/core/echo/echo-sqlite/src/record.ts:26`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 26-30 (`const SYSTEM_KEYS = new Set(['id', '@type', '@uri', '@parent', '@relationSour...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49f71392-7 error-messages-carry-context `packages/core/echo/echo-sqlite/src/remote.ts:53`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.93. The likeliest place is lines 53-64 (`return driver.explain(call.compiled);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5536da7ac72658fa599921cb8ddd18672767ea3e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 251 uncertain, 243 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 299 (149 verdicts re-asked with context the model requested)
estimated input tokens: 3104577
billed input tokens: 3045456 (cost $0.1279)
measured chars per token: 3.06
```
