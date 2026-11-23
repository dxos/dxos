---
branch: dm/laughing-albattani-jlj352
commit: 965b6456457c4b3264f0a0d5139a025ad807605f
base: 4510d8c374824d88d8c784e03bae5af319e6a4f3
mode: fast
createdAt: 2026-10-27T13:29:22.593Z
isFinalized: true
groups: 360
rules: [bounded-live-state, consistent-private-field-convention, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, log-fire-and-forget-rejections, mutate-echo-arrays-with-splice, name-for-general-behavior, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-try-catch-in-effect-code, operations-resolve-database-from-service, options-object-with-defaults, retries-via-schedule-with-evidence, schema-declare-and-brand, store-events-not-projections, story-for-new-ui-component, structured-logging-not-console, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: 965b6456
---

_13 error(s), 31 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 965b6456-1 - ignored - store-events-not-projections - packages/core/echo/echo-client/src/feed/feed-handle.ts:511
- 965b6456-2 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/feed/feed-handle.ts:511
- 965b6456-3 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/feed/feed-handle.ts:583
- 965b6456-4 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:823
- 965b6456-5 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/feed/feed-handle.ts:970
- 965b6456-6 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed-object-core.ts:415
- 965b6456-7 - ignored - operations-resolve-database-from-service - packages/core/echo/echo-client/src/proxy-db/database.ts:982
- 965b6456-8 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/convergence-key-merge.test.ts:490
- 965b6456-9 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/db-host/convergence-key-merge.test.ts:670
- 965b6456-10 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-host/src/db-host/echo-host.ts:1324
- 965b6456-11 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/db-host/feed-data-source.ts:302
- 965b6456-12 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/local-feed-service.ts:110
- 965b6456-13 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:189
- 965b6456-14 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:817
- 965b6456-15 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:1156
- 965b6456-16 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:1778
- 965b6456-17 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:2138
- 965b6456-18 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:3269
- 965b6456-19 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-planner.ts:1304
- 965b6456-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/query/sql/explain.test.ts:27
- 965b6456-21 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-protocol/src/echo-feed-codec.ts:10
- 965b6456-22 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-sqlite/src/database.ts:258
- 965b6456-23 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-sqlite/src/database.ts:594
- 965b6456-24 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Database.ts:528
- 965b6456-25 - ignored - no-casts - packages/core/echo/echo/src/Database.ts:608
- 965b6456-26 - ignored - no-casts - packages/core/echo/echo/src/Filter.ts:188
- 965b6456-27 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Filter.ts:673
- 965b6456-28 - ignored - name-for-general-behavior - packages/core/echo/echo/src/internal/common/types/model-symbols.ts:1
- 965b6456-29 - ignored - no-casts - packages/core/echo/echo/src/internal/Entity/api.ts:93
- 965b6456-30 - ignored - bounded-live-state - packages/core/echo/feed/src/feed-store.ts:293
- 965b6456-31 - ignored - options-object-with-defaults - packages/core/echo/feed/src/feed-store.ts:533
- 965b6456-32 - ignored - store-events-not-projections - packages/core/echo/feed/src/feed-store.ts:701
- 965b6456-33 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:1040
- 965b6456-34 - ignored - no-casts - packages/core/protocols/src/FeedProtocol.ts:499
- 965b6456-35 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:115
- 965b6456-36 - ignored - story-for-new-ui-component - packages/plugins/plugin-code/src/components/QuestionPanel/SpecQuestionCard.tsx:37
- 965b6456-37 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:188
- 965b6456-38 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:440
- 965b6456-39 - resolved - errors-extend-base-error - packages/plugins/plugin-code/src/containers/SpecArticle/useGitHubText.ts:1
- 965b6456-40 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-messenger/src/types/Notifications.ts:147
- 965b6456-41 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55
- 965b6456-42 - ignored - log-fire-and-forget-rejections - packages/sdk/client-services/src/SqliteStorage.ts:274
- 965b6456-43 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/SqliteStorage.ts:353
- 965b6456-44 - ignored - no-casts - packages/sdk/client-services/src/SqliteStorage.ts:389

## Issues

# WARN 965b6456-1 store-events-not-projections `packages/core/echo/echo-client/src/feed/feed-handle.ts:511`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.81. The likeliest place is lines 511-534 (`if (this.#appendRetry || this._ctx.disposed) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-2 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/feed/feed-handle.ts:511`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.83. The likeliest place is lines 511-534 (`if (this.#appendRetry || this._ctx.disposed) {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-3 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/feed/feed-handle.ts:583`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.90. The likeliest place is lines 583-606 (`async waitForPendingWrites(): Promise<void> {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-4 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:823`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.91. The likeliest place is lines 823-846 (`}),`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-5 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/feed/feed-handle.ts:970`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 970-985 (`const parseObjects = (encoded: readonly string[] | undefined): ObjectJSON[] =>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-6 no-casts `packages/core/echo/echo-client/src/feed/feed-object-core.ts:415`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 415-426 (`const mutable = target as unknown as Record<string, unknown>;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-7 operations-resolve-database-from-service `packages/core/echo/echo-client/src/proxy-db/database.ts:982`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.87. The likeliest place is lines 982-1029 (`const [first] = steps.values();`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-8 no-casts `packages/core/echo/echo-host/src/db-host/convergence-key-merge.test.ts:490`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 490-501 (`expect((referrer?.data.items as unknown[])[0]).toEqual(localRef(ID_A));`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-9 error-messages-carry-context `packages/core/echo/echo-host/src/db-host/convergence-key-merge.test.ts:670`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 670-681 (`const merger = new ConvergenceKeyMerger({`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-10 deferred-callback-owns-its-context `packages/core/echo/echo-host/src/db-host/echo-host.ts:1324`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 1324-1347 (`#scheduleReclaim(spaceId: SpaceId, departed: DocumentId[], retiredRoot?: Docu...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-11 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/db-host/feed-data-source.ts:302`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.94. The likeliest place is lines 302-313 (`}`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-12 no-casts `packages/core/echo/echo-host/src/db-host/local-feed-service.ts:110`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 110-121 (`async #queryFeedImpl(request: FeedService.QueryFeedRequest): Promise<FeedServ...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-13 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:189`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.87. The likeliest place is lines 189-209 (`paths?: readonly (readonly QueryService.PathEdge[])[];`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-14 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:817`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 817-840 (`export class QueryExecutor extends Resource {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-15 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:1156`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 1156-1179 (`trace.sql = trace.children.find((child) => child.sql !== undefined)?.sql;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-16 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:1778`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1778-1801 (`data: snapshot as Obj.JSON,`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-17 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:2138`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 2138-2161 (`return [];`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-18 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:3269`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 3269-3292 (`const extractQueueWindow = (step: QueryPlan.SelectStep): QueueWindow | undefi...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-19 no-casts `packages/core/echo/echo-host/src/query/query-planner.ts:1304`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1304-1327 (`if (selectStepIndex !== -1) {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-20 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/query/sql/explain.test.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 27-41 (`const explain = (query: Query.Any) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-21 namespace-brand-key-prefixing `packages/core/echo/echo-protocol/src/echo-feed-codec.ts:10`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 10-15 (`const ATTR_META = '@meta';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-22 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-sqlite/src/database.ts:258`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 258-281 (`async addType<T extends Type.AnyEntity>(type: T): Promise<T> {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-23 no-try-catch-in-effect-code `packages/core/echo/echo-sqlite/src/database.ts:594`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 594-617 (`}`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-24 schema-declare-and-brand `packages/core/echo/echo/src/Database.ts:528`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.92. The likeliest place is lines 528-543 (`export const Database: Schema.Codec<Database> = Schema.Any.pipe(Schema.refine...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-25 no-casts `packages/core/echo/echo/src/Database.ts:608`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 608-631 (`Effect.gen(function* () {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-26 no-casts `packages/core/echo/echo/src/Filter.ts:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 188-211 (`): Filter<Schema.Schema.Type<S>>;`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-27 error-messages-carry-context `packages/core/echo/echo/src/Filter.ts:673`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 673-694 (`return {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-28 name-for-general-behavior `packages/core/echo/echo/src/internal/common/types/model-symbols.ts:1`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.87. The likeliest place is lines 1-12 (`//`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-29 no-casts `packages/core/echo/echo/src/internal/Entity/api.ts:93`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 93-102 (`export const getDatabase = (entity: AnyEntity): any | undefined => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-30 bounded-live-state `packages/core/echo/feed/src/feed-store.ts:293`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 293-316 (`readonly #heads = new Map<string, number>();`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-31 options-object-with-defaults `packages/core/echo/feed/src/feed-store.ts:533`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.80. The likeliest place is lines 533-556 (`(request: QueryRequest): Effect.Effect<QueryResponse, SqlError.SqlError | Cyp...`, location confidence 0.49). Judged with added `importers, public-api` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-32 store-events-not-projections `packages/core/echo/feed/src/feed-store.ts:701`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.81. The likeliest place is lines 701-724 (`return {`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-33 no-casts `packages/core/echo/feed/src/feed-store.ts:1040`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1040-1063 (`: request.blocks.map((block) => ({ data: block.data, encryptionKeyId: null, i...`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-34 no-casts `packages/core/protocols/src/FeedProtocol.ts:499`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 499-508 (`export const isWellKnownNamespace = (namespace: string) =>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-35 toolbars-are-menu-actions `packages/plugins/plugin-code/src/components/CodeView/CodeView.tsx:115`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 115-126 (`data-testid='code-view.open-external'`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-36 story-for-new-ui-component `packages/plugins/plugin-code/src/components/QuestionPanel/SpecQuestionCard.tsx:37`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.80. The likeliest place is lines 37-48 (`export const SpecQuestionCard = ({ question, onReveal, onSelectDecision }: Sp...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-37 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:188`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 188-199 (`const related = useMemo(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-38 toolbars-are-menu-actions `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx:440`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 440-451 (`<ToggleGroup.Item`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-39 errors-extend-base-error `packages/plugins/plugin-code/src/containers/SpecArticle/useGitHubText.ts:1`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 1-18 (`import * as Data from 'effect/Data';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-40 mutate-echo-arrays-with-splice `packages/plugins/plugin-messenger/src/types/Notifications.ts:147`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.90. The likeliest place is lines 147-157 (`const removeReadKeys = (containers: readonly Notifications[], keys: ReadonlyS...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-41 effect-fn-not-hand-wrapped-gen `packages/sdk/client-services/src/internal/identity/delete-identity.test.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 55-66 (`const countRows = async (tables: readonly string[]): Promise<Record<string, n...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-42 log-fire-and-forget-rejections `packages/sdk/client-services/src/SqliteStorage.ts:274`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.84. The likeliest place is lines 274-285 (`this.#saving = saving.catch(() => {});`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 965b6456-43 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/SqliteStorage.ts:353`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 353-364 (`export class SqliteStorage implements Storage {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 965b6456-44 no-casts `packages/sdk/client-services/src/SqliteStorage.ts:389`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 389-400 (`const getOrCreateFile = (path: string, filename: string): File => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4510d8c374824d88d8c784e03bae5af319e6a4f3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 44 violations written to fragments, 672 uncertain, 2486 clean, 0 unanswered
- left for an agentic reviewer: 125 batch(es)

```text
requests: 1513 (380 verdicts re-asked with context the model requested)
estimated input tokens: 18784806
billed input tokens: 18402303 (cost $0.7729)
measured chars per token: 3.06
```
