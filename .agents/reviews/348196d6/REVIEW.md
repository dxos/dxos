---
branch: dm/gifted-carson-5pytxh
commit: 348196d6cbe4db2560d2b6d03588ffd6e935fb52
base: e7462b0cccf5ee191d2b690e291d652d64ae49a4
mode: fast
createdAt: 2026-09-27T04:38:35.126Z
isFinalized: true
groups: 148
rules: [consistent-private-field-convention, error-messages-carry-context, inject-dependencies-via-constructor, name-for-general-behavior, no-casts, no-mixed-promise-effect-lifecycle, scope-multi-tenant-queries-by-space, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 348196d6
---

_15 error(s), 11 warning(s)._

# ERROR 348196d6-1 no-casts `packages/core/echo/echo-client/src/automerge/doc-handle-proxy.ts:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 132-143 (`super();`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-2 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:589`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 589-612 (`};`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-3 use-context-scoped-cancellation `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:248`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 248-271 (`const start = Date.now();`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-4 no-casts `packages/core/echo/echo-client/src/client/index-query-source-provider.ts:296`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 296-319 (`if (stalled.length > 0) {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-5 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:822`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 822-845 (`delete draft.branches![id];`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-6 error-messages-carry-context `packages/core/echo/echo-client/src/core-db/object-core.ts:343`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 343-366 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-7 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:583`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 583-606 (`getDecoded(path: Doc.KeyPath): DecodedAutomergePrimaryValue {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-8 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:905`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 905-928 (`export const createObject = <T extends AnyProperties>(obj: T): CreateObjectRe...`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-9 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:150`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 150-166 (`export const getReified = (target: ProxyTarget): any => {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-10 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:245`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 245-256 (`async update(ctx: Context, updates: DataService.DocumentUpdate[]): Promise<vo...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-11 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:40`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 40-51 (`updateIndexes: () => Promise<void>;`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-12 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:623`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 623-646 (`const serializeItemGroupKey = (item: QueryItem): string => GroupBy.serializeG...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-13 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:647`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 647-670 (`private _plan: QueryPlan.Plan;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-14 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:815`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 815-838 (`this._trace = trace;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-15 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:1683`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 1683-1706 (`const results = await this._loadDocumentsAfterSqlQuery(allMetas);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-16 no-casts `packages/core/echo/echo-host/src/query/query-planner.ts:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 255-278 (`default:`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-17 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 190-207 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-18 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:97`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 97-120 (`const deepCopy = <T>(value: T, visited = new Map<object, object>()): T => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-19 inject-dependencies-via-constructor `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:213`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.82. The likeliest place is lines 213-233 (`const unboundDeviceAnnotations = new WeakMap<object, Map<string, unknown>>();`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-20 name-for-general-behavior `packages/core/echo/echo/src/internal/common/types/model-symbols.ts:1`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.82. The likeliest place is lines 1-12 (`//`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-21 no-casts `packages/core/echo/echo/src/internal/Filter/match.ts:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 99-110 (`const structuralMatch = (filterObj: any, targetObj: any, strict = true): bool...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-22 error-messages-carry-context `packages/core/echo/echo/src/internal/Filter/match.ts:342`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 342-353 (`throw new Error('Timestamp filters must be handled at the index level, not in...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-23 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:365`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 365-377 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-24 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:643`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.91. The likeliest place is lines 643-666 (`get hint(): RefHint | undefined {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 348196d6-25 no-casts `packages/core/echo/echo/src/Ref.ts:68`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 68-73 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 348196d6-26 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/device-annotation-store.ts:87`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.84. The likeliest place is lines 87-98 (`(documentIds: readonly string[]): Effect.Effect<readonly DeviceAnnotationRow[...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.
