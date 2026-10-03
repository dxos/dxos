---
branch: claude/echo-local-database-integration-ah4pda
commit: 9763967751607157bbfbd7754c9fce5d3e4dda68
base: 20f6dccdf036309899bf86f47293e49732ff7a03
mode: fast
createdAt: 2026-10-03T10:44:19.006Z
isFinalized: true
groups: 152
rules: [consistent-private-field-convention, error-messages-carry-context, errors-extend-base-error, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-env-vars-in-low-level-modules, no-mixed-promise-effect-lifecycle, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 97639677
---

_9 error(s), 14 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 97639677-1 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/echo-client.ts:360
- 97639677-2 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:248
- 97639677-3 - ignored - no-casts - packages/core/echo/echo-client/src/client/index-query-source-provider.ts:296
- 97639677-4 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:799
- 97639677-5 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1000
- 97639677-6 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:515
- 97639677-7 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- 97639677-8 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:995
- 97639677-9 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1283
- 97639677-10 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1787
- 97639677-11 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:383
- 97639677-12 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:383
- 97639677-13 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:620
- 97639677-14 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:644
- 97639677-15 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:812
- 97639677-16 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:884
- 97639677-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-sqlite/src/database.ts:210
- 97639677-18 - ignored - errors-extend-base-error - packages/core/echo/echo-sqlite/src/errors.ts:9
- 97639677-19 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-sqlite/src/index.ts:1
- 97639677-20 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-sqlite/src/record.ts:26
- 97639677-21 - ignored - no-env-vars-in-low-level-modules - packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188
- 97639677-22 - ignored - no-casts - packages/sdk/client/src/client/client.ts:309
- 97639677-23 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:573

## Issues

# WARN 97639677-1 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/echo-client.ts:360`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 360-371 (`private _waitForObjectLink(db: DatabaseImpl, objectId: string): Promise<strin...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-2 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:248`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 248-271 (`const start = Date.now();`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-3 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:296`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 296-319 (`if (stalled.length > 0) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-4 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:799`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 799-822 (`root.change((draft: DatabaseDirectory) => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-5 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1000`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1000-1028 (`const seededMeta = (obj as any)[MetaId] as EntityMeta | undefined;`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-6 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:515`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 515-536 (`const compactMeta = (meta: EntityMeta): Partial<EntityMeta> => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-7 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-8 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:995`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 995-1018 (`if (initialValue instanceof Uint8Array) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-9 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1283`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1283-1306 (`const handle = this._repo.getHandle(documentId as any);`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-10 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1787`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 1787-1810 (`}, REPLICATION_LEASE_TIMEOUT);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-11 no-casts `packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:383`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 383-391 (`export const createEchoPeerMetadata = (): PeerMetadata =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-12 namespace-brand-key-prefixing `packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:383`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 383-391 (`export const createEchoPeerMetadata = (): PeerMetadata =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-13 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:620`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 620-643 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-14 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:644`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.84. The likeliest place is lines 644-667 (`private _plan: QueryPlan.Plan;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-15 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:812`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 812-835 (`this._trace = trace;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-16 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:884`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.90. The likeliest place is lines 884-907 (`break;`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-17 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-sqlite/src/database.ts:210`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 210-233 (`async close(): Promise<void> {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-18 errors-extend-base-error `packages/core/echo/echo-sqlite/src/errors.ts:9`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 9-18 (`export class UnsupportedOperationError extends Error {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-19 namespace-export-with-internal-hiding `packages/core/echo/echo-sqlite/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-11 (`export * from './database.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-20 namespace-brand-key-prefixing `packages/core/echo/echo-sqlite/src/record.ts:26`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 26-30 (`const SYSTEM_KEYS = new Set(['id', '@type', '@uri', '@parent', '@relationSour...`, location confidence 0.97). Judged with added `package` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-21 no-env-vars-in-low-level-modules `packages/sdk/client-services/src/internal/spaces/spaces-service.ts:188`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.91. The likeliest place is lines 188-199 (`async () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97639677-22 no-casts `packages/sdk/client/src/client/client.ts:309`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 309-332 (`async diagnostics(options: JsonKeyOptions = {}): Promise<any> {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97639677-23 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:573`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.87. The likeliest place is lines 573-596 (`this._fatalErrorUpdate.emit(null);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `20f6dccdf036309899bf86f47293e49732ff7a03`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 23 violations written to fragments, 229 uncertain, 983 clean, 0 unanswered
- left for an agentic reviewer: 59 batch(es)

```text
requests: 630 (127 verdicts re-asked with context the model requested)
estimated input tokens: 8584738
billed input tokens: 8486057 (cost $0.3564)
measured chars per token: 3.03
```
