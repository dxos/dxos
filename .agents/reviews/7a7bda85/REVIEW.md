---
branch: dm/trusting-cerf-3j4egh
commit: 7a7bda85180c33e6b442bc4bdb3393316ebc97ab
base: f299590426e4b317c83757b4bf83c0051f27b0a7
mode: fast
createdAt: 2026-10-25T11:31:08.633Z
isFinalized: true
groups: 282
rules: [consistent-private-field-convention, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, keep-parallel-apis-structurally-aligned, minimal-precise-tests, named-durations-and-budgets, namespace-brand-key-prefixing, no-casts, no-module-level-object-caches, no-retries-or-skips-for-flaky-tests, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, per-test-mutable-fixtures, ref-collections-via-query, schema-declare-and-brand, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 7a7bda85
---

_27 error(s), 31 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7a7bda85-1 - ignored - minimal-precise-tests - packages/core/echo/echo-client-e2e/src/query.test.ts:418
- 7a7bda85-2 - ignored - named-durations-and-budgets - packages/core/echo/echo-client-e2e/src/query.test.ts:418
- 7a7bda85-3 - ignored - no-sleep-in-test - packages/core/echo/echo-client-e2e/src/query.test.ts:1341
- 7a7bda85-4 - ignored - ref-collections-via-query - packages/core/echo/echo-client-e2e/src/query.test.ts:2253
- 7a7bda85-5 - ignored - no-casts - packages/core/echo/echo-client-e2e/src/query.test.ts:3289
- 7a7bda85-6 - ignored - structured-logging-not-console - packages/core/echo/echo-client-e2e/src/query.test.ts:3483
- 7a7bda85-7 - ignored - no-retries-or-skips-for-flaky-tests - packages/core/echo/echo-client-e2e/src/query.test.ts:3555
- 7a7bda85-8 - ignored - no-module-level-object-caches - packages/core/echo/echo-client/src/core-db/object-core.ts:44
- 7a7bda85-9 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/object-core.ts:425
- 7a7bda85-10 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:958
- 7a7bda85-11 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1145
- 7a7bda85-12 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:146
- 7a7bda85-13 - ignored - no-module-level-object-caches - packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:272
- 7a7bda85-14 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/subscription.test.ts:361
- 7a7bda85-15 - ignored - no-module-level-object-caches - packages/core/echo/echo-host/src/query/query-executor.ts:179
- 7a7bda85-16 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/query/query-executor.ts:246
- 7a7bda85-17 - ignored - no-casts - packages/core/echo/echo-host/src/query/query-executor.ts:1114
- 7a7bda85-18 - ignored - consistent-private-field-convention - packages/core/echo/echo-host/src/query/query-executor.ts:1546
- 7a7bda85-19 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-host/src/query/query-executor.ts:1738
- 7a7bda85-20 - ignored - structured-logging-not-console - packages/core/echo/echo-host/src/query/query-executor.ts:2636
- 7a7bda85-21 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-query/src/filter/match-filter.ts:168
- 7a7bda85-22 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-sqlite/src/database.test.ts:52
- 7a7bda85-23 - ignored - no-sleep-in-test - packages/core/echo/echo-sqlite/src/database.test.ts:52
- 7a7bda85-24 - ignored - no-casts - packages/core/echo/echo-sqlite/src/database.test.ts:122
- 7a7bda85-25 - ignored - no-casts - packages/core/echo/echo/src/Entity.ts:74
- 7a7bda85-26 - resolved - per-test-mutable-fixtures - packages/core/echo/echo/src/internal/common/proxy/change.test.ts:14
- 7a7bda85-27 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/change.test.ts:57
- 7a7bda85-28 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo/src/internal/common/proxy/json-serializer.ts:13
- 7a7bda85-29 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/json-serializer.ts:26
- 7a7bda85-30 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/ownership.ts:47
- 7a7bda85-31 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:46
- 7a7bda85-32 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:26
- 7a7bda85-33 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:163
- 7a7bda85-34 - ignored - no-casts - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:182
- 7a7bda85-35 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:535
- 7a7bda85-36 - ignored - no-casts - packages/core/echo/echo/src/internal/common/types/meta.ts:135
- 7a7bda85-37 - ignored - no-casts - packages/core/echo/echo/src/internal/Filter/match.ts:98
- 7a7bda85-38 - ignored - no-module-level-object-caches - packages/core/echo/echo/src/internal/Filter/match.ts:129
- 7a7bda85-39 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Filter/match.ts:341
- 7a7bda85-40 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo/src/internal/Filter/match.ts:384
- 7a7bda85-41 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/internal/Obj/atoms.ts:33
- 7a7bda85-42 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/atoms.ts:47
- 7a7bda85-43 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/json-serializer.test.ts:70
- 7a7bda85-44 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/json-serializer.ts:219
- 7a7bda85-45 - ignored - no-casts - packages/core/echo/echo/src/Obj.test.ts:598
- 7a7bda85-46 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:280
- 7a7bda85-47 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:317
- 7a7bda85-48 - ignored - schema-declare-and-brand - packages/core/echo/echo/src/Relation.ts:64
- 7a7bda85-49 - ignored - error-messages-carry-context - packages/core/echo/echo/src/Relation.ts:157
- 7a7bda85-50 - ignored - no-casts - packages/core/echo/echo/src/Relation.ts:181
- 7a7bda85-51 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:695
- 7a7bda85-52 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-space/src/operations/testing.ts:52
- 7a7bda85-53 - ignored - no-casts - packages/ui/react-ui-form/src/components/meta-tags.test.ts:37
- 7a7bda85-54 - ignored - ref-collections-via-query - packages/ui/react-ui-form/src/components/meta-tags.ts:84
- 7a7bda85-55 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm.tsx:53
- 7a7bda85-56 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:694
- 7a7bda85-57 - ignored - named-durations-and-budgets - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1140
- 7a7bda85-58 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1991

## Issues

# WARN 7a7bda85-1 minimal-precise-tests `packages/core/echo/echo-client-e2e/src/query.test.ts:418`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.82. The likeliest place is lines 418-441 (`await waitForCondition({ condition: () => total(rows) > before, timeout: 5000...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-2 named-durations-and-budgets `packages/core/echo/echo-client-e2e/src/query.test.ts:418`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.81. The likeliest place is lines 418-441 (`await waitForCondition({ condition: () => total(rows) > before, timeout: 5000...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-3 no-sleep-in-test `packages/core/echo/echo-client-e2e/src/query.test.ts:1341`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 1341-1364 (`const secondAfterFlush = Math.floor(Date.now() / 1000) + 1;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-4 ref-collections-via-query `packages/core/echo/echo-client-e2e/src/query.test.ts:2253`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.82. The likeliest place is lines 2253-2276 (`expect(result[i]).to.eq(objects[i]);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-5 no-casts `packages/core/echo/echo-client-e2e/src/query.test.ts:3289`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 3289-3312 (`}`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-6 structured-logging-not-console `packages/core/echo/echo-client-e2e/src/query.test.ts:3483`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 3483-3506 (`test('fires only once when objects are removed', async () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-7 no-retries-or-skips-for-flaky-tests `packages/core/echo/echo-client-e2e/src/query.test.ts:3555`

System One judges this a likely violation of `no-retries-or-skips-for-flaky-tests` (Fix a flaky test's cause; don't add retries, CI skips, or lean on quarantine), p=0.93. The likeliest place is lines 3555-3578 (`test('multiple queries do not influence each other', async () => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-8 no-module-level-object-caches `packages/core/echo/echo-client/src/core-db/object-core.ts:44`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.89. The likeliest place is lines 44-64 (`export interface IDatabaseBinding {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-9 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:425`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 425-448 (`this.#writeAndRefresh(() => handle.change(changeFn, options));`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-10 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.test.ts:958`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 958-981 (`const obj = (await db.query(Filter.id(id)).first()) as TestSchema.Example;`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-11 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-handler.ts:1145`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1145-1171 (`const validateInitialProps = (target: any, seen: Set<object> = new Set()) => {`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-12 no-casts `packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 146-162 (`export const getReified = (target: ProxyTarget): any => {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-13 no-module-level-object-caches `packages/core/echo/echo-client/src/echo-handler/echo-prototypes.ts:272`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 272-285 (`export const resolveStrongDep = (core: ObjectCore, ref: EncodedReference): an...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-14 no-casts `packages/core/echo/echo-client/src/echo-handler/subscription.test.ts:361`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 361-369 (`const createUpdateCounter = (object: any) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-15 no-module-level-object-caches `packages/core/echo/echo-host/src/query/query-executor.ts:179`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.86. The likeliest place is lines 179-197 (`const parseIndexedAnnotations = (meta: EntityMeta): Readonly<Record<string, u...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-16 error-messages-carry-context `packages/core/echo/echo-host/src/query/query-executor.ts:246`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 246-269 (`}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-17 no-casts `packages/core/echo/echo-host/src/query/query-executor.ts:1114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1114-1137 (`case 'FilterStep':`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-18 consistent-private-field-convention `packages/core/echo/echo-host/src/query/query-executor.ts:1546`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.83. The likeliest place is lines 1546-1569 (`private _resolveInQuerySet(`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-19 no-try-catch-in-effect-code `packages/core/echo/echo-host/src/query/query-executor.ts:1738`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 1738-1761 (`const ref = QueryItem.getProperty(item, property);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-20 structured-logging-not-console `packages/core/echo/echo-host/src/query/query-executor.ts:2636`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 2636-2659 (`private async _filterUnresolvableStrongDeps(workingSet: QueryItem[]): Promise...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-21 no-try-catch-in-effect-code `packages/core/echo/echo-query/src/filter/match-filter.ts:168`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 168-183 (`const metaTags = (object: Entity.Unknown): string[] => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-22 use-context-scoped-cancellation `packages/core/echo/echo-sqlite/src/database.test.ts:52`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 52-73 (`const session = <A>(body: (db: SqliteDatabase) => Promise<A>, options: OpenOp...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-23 no-sleep-in-test `packages/core/echo/echo-sqlite/src/database.test.ts:52`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 52-73 (`const session = <A>(body: (db: SqliteDatabase) => Promise<A>, options: OpenOp...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-24 no-casts `packages/core/echo/echo-sqlite/src/database.test.ts:122`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 122-145 (`);`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-25 no-casts `packages/core/echo/echo/src/Entity.ts:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 74-81 (`export const Unknown: Schema.Codec<Unknown> = Schema.StructWithRest(Schema.St...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-26 per-test-mutable-fixtures `packages/core/echo/echo/src/internal/common/proxy/change.test.ts:14`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 14-18 (`const tag = (label: string): Tag.Tag => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-27 no-casts `packages/core/echo/echo/src/internal/common/proxy/change.test.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-68 (`expect(() => Obj.addTag(obj, tag('tag'))).toThrow(/outside of Obj.update/);`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-28 namespace-brand-key-prefixing `packages/core/echo/echo/src/internal/common/proxy/json-serializer.ts:13`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 13-25 (`ATTR_SELF_URI,`, location confidence 0.73). Judged with added `imports` context after a first pass of 0.57. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-29 no-casts `packages/core/echo/echo/src/internal/common/proxy/json-serializer.ts:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 26-37 (`export const attachTypedJsonSerializer = (obj: any) => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-30 no-casts `packages/core/echo/echo/src/internal/common/proxy/ownership.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-55 (`export const getOwner = (value: object | null | undefined): object | undefine...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-31 no-casts `packages/core/echo/echo/src/internal/common/proxy/proxy-utils.ts:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 46-52 (`export const isProxy = (value: unknown): boolean =>`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-32 no-try-catch-in-effect-code `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:26`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 26-37 (`export const assertsWithDetail = (schema: Schema.Top, value: unknown): void => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-33 no-casts `packages/core/echo/echo/src/internal/common/proxy/schema-validator.ts:163`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 163-174 (`public static isOptionalProperty(target: any, prop: string | symbol): boolean {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-34 no-casts `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:182`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 182-205 (`const copyHiddenProperties = (source: any, target: any): void => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-35 error-messages-carry-context `packages/core/echo/echo/src/internal/common/proxy/typed-handler.ts:535`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 535-558 (`const echoRoot = getEchoRoot(target);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-36 no-casts `packages/core/echo/echo/src/internal/common/types/meta.ts:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 135-151 (`export const getMeta = (obj: AnyProperties): EntityMeta => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-37 no-casts `packages/core/echo/echo/src/internal/Filter/match.ts:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 98-109 (`const structuralMatch = (filterObj: any, targetObj: any, strict = true): bool...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-38 no-module-level-object-caches `packages/core/echo/echo/src/internal/Filter/match.ts:129`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.83. The likeliest place is lines 129-140 (`const _normalizeInValue = (value: unknown): unknown =>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-39 error-messages-carry-context `packages/core/echo/echo/src/internal/Filter/match.ts:341`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 341-352 (`throw new Error('Timestamp filters must be handled at the index level, not in...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-40 no-try-catch-in-effect-code `packages/core/echo/echo/src/internal/Filter/match.ts:384`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 384-395 (`const entityAccessor: FilterRecordAccessor<AnyEntity> = {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-41 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/internal/Obj/atoms.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 33-46 (`const getReactiveOption = <T extends Obj.Unknown>(snapshot: Obj.Snapshot<T>):...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-42 no-casts `packages/core/echo/echo/src/internal/Obj/atoms.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 47-58 (`const objectFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<O...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-43 no-casts `packages/core/echo/echo/src/internal/Obj/json-serializer.test.ts:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 70-81 (`expect((contactFromJson as any)[KindId]).toBe(EntityKind.Object);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-44 no-casts `packages/core/echo/echo/src/internal/Obj/json-serializer.ts:219`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 219-231 (`const normalizeMeta = (meta: any): any => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-45 no-casts `packages/core/echo/echo/src/Obj.test.ts:598`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 598-621 (`test('an unobserved atom is released by its registry', async ({ expect }) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-46 no-casts `packages/core/echo/echo/src/Obj.ts:280`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 280-316 (`export const getSnapshot: <T extends Unknown>(obj: T) => Snapshot<T> = objInt...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-47 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:317`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 317-354 (`export const getReactiveOption = <T extends Unknown>(snapshot: Snapshot<T>): ...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-48 schema-declare-and-brand `packages/core/echo/echo/src/Relation.ts:64`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.85. The likeliest place is lines 64-81 (`export const Unknown: internal.UnknownTypeSchema<Unknown, typeof Entity.Kind....`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-49 error-messages-carry-context `packages/core/echo/echo/src/Relation.ts:157`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.80. The likeliest place is lines 157-180 (`export const make = <T extends Type.AnyRelation>(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-50 no-casts `packages/core/echo/echo/src/Relation.ts:181`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 181-202 (`return internal.makeObject(schema as any, props as any, meta, type as any) as...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-51 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:695`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 695-718 (`] as [PresetName, ObjectGenerator<any>][],`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-52 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-space/src/operations/testing.ts:52`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.85. The likeliest place is lines 52-59 (`export const decodeTypeRow = Schema.decodeUnknownSync(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-53 no-casts `packages/ui/react-ui-form/src/components/meta-tags.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 37-48 (`expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-54 ref-collections-via-query `packages/ui/react-ui-form/src/components/meta-tags.ts:84`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.84. The likeliest place is lines 84-89 (`export const resolveMetaTags = (refs: readonly Ref.Ref<Tag.Tag>[]): Tag.Tag[] =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-55 no-casts `packages/ui/react-ui-form/src/components/ObjectForm.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 53-64 (`const useObjectFormModel = ({ object, snapshot, db }: ObjectFormModelOptions)...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-56 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:694`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 694-717 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7a7bda85-57 named-durations-and-budgets `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1140`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.81. The likeliest place is lines 1140-1163 (`export const TestArtifactPreviews: Story = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7a7bda85-58 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1991`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1991-2017 (`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f299590426e4b317c83757b4bf83c0051f27b0a7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 58 violations written to fragments, 464 uncertain, 1772 clean, 0 unanswered
- left for an agentic reviewer: 116 batch(es)

```text
requests: 1078 (277 verdicts re-asked with context the model requested)
estimated input tokens: 15074777
billed input tokens: 14941827 (cost $0.6276)
measured chars per token: 3.03
```
