# echo: evaluate queries in SQLite, behind a flag

Introduces a new query execution path that compiles ECHO queries into SQL and runs them against SQLite, gated behind a feature flag. This required normalizing id/path representations in the index layer (with accompanying migrations) so index data could be queried via SQL, plus wiring, tests, benchmarks and documentation for the new path.

## SQL compilation and execution engine

This is the core of the change: a compiler that turns a `QueryPlan.Plan` into a single SQLite statement, and the wiring that lets the query executor pick that path instead of the existing in-memory evaluator. The constraint is that the two paths must be interchangeable at the plan level, so tracing, scope analysis and reactivity keep working whichever one runs, and the compiled path must fall back cleanly when it cannot express a plan.

`compile.ts` adds `SqlPlanCompiler`, a single-pass compiler that walks a plan's steps and turns each into a CTE layered on the previous one. Every relation carries the same shape (`recordId`, `objectId`, `spaceId`, `rank`, `ord`, plus grouping columns once an `AggregateStep` has run), so any step can be composed after any other. Filters, traversals, unions, ordering, limiting and aggregation are each compiled to mirror the in-memory semantics exactly: JSON extraction is typed the way JS `===` is typed, deletion and strong-dependency checks walk recursive CTEs to the same depth bounds as the in-memory `DeletionResolver`, and index hints (`INDEXED BY`, `NOT INDEXED`) pin the plans SQLite would otherwise pick badly without `ANALYZE` statistics.

```diff file=packages/core/echo/echo-host/src/query/sql/compile.ts lines=1-1513
@@ -0,0 +1,1513 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+import * as Effect from 'effect/Effect';
+import * as SqlClient from 'effect/unstable/sql/SqlClient';
+import type * as SqlError from 'effect/unstable/sql/SqlError';
+import type * as Statement from 'effect/unstable/sql/Statement';
+
+import { EncodedReference, QueryAST, isEncodedReference } from '@dxos/echo-protocol';
+import { ATTR_META, matchMetaKey } from '@dxos/echo/internal';
+import {
+  EscapedPropPath,
+  type QueueRef,
+  type QueueWindow,
+  buildFtsCondition,
+  buildQueueWindow,
+  buildSourceCondition,
+  buildTypeDxnCondition,
+  normalizePropPath,
+  referenceIndexKey,
+} from '@dxos/index-core';
+import { DXN, EID, EntityId, type SpaceId } from '@dxos/keys';
+
+import { QueryError } from '../errors.ts';
+import { GroupBy } from '../group-by.ts';
+import { QueryPlan } from '../plan.ts';
+import { QueryPlanner } from '../query-planner.ts';
+
+/**
+ * Depth bounds shared with the in-memory executor and `DeletionResolver`, so a query and garbage
+ * collection agree on what counts as deleted or reachable.
+ */
+const MAX_DEPTH_FOR_DELETION_TRACING = 10;
+const MAX_DEPTH_FOR_CHILD_OF_TRACING = 10;
+const MAX_DEPTH_FOR_STRONG_DEP_TRACING = 10;
+
+/** Keeps union branches ordered after one another without renumbering their rows. */
+const UNION_BRANCH_STRIDE = 1_000_000_000;
+
+/**
+ * A working-set row's own metadata is a rowid lookup. `NOT INDEXED` keeps it one: given a `WHERE`
+ * on `queueId` the planner would otherwise drive from `objectMeta` through the queue-position index
+ * and probe the working set, a scan of every document instead of one seek per row.
+ *
+ * `objectMeta` indexes the joins below name explicitly. Without `ANALYZE` statistics SQLite rates an
+ * equality on `queueId` (the leading column of the queue-position index, true of every document
+ * row) as cheap as a seek on `(spaceId, objectId)`, and picks it; the traversal then scans every
+ * document per reference. The names are fixed by the entity-meta migrations.
+ */
+const INDEX_SPACE_OBJECT = 'idx_object_index_objectId';
+const INDEX_SPACE_TYPE = 'idx_object_index_typeDXN';
+const INDEX_SPACE_QUEUE_OBJECT = 'idx_object_index_queueObjectId';
+const INDEX_SPACE_PARENT = 'idx_object_index_parentId';
+const INDEX_SPACE_SOURCE = 'idx_object_index_sourceId';
+const INDEX_SPACE_TARGET = 'idx_object_index_targetId';
+
+/** One row of a compiled query's final projection. */
+export type CompiledRow = {
+  recordId: number;
+  objectId: EntityId;
+  spaceId: SpaceId;
+  documentId: string;
+  queueId: string;
+  queueNamespace: string;
+  rank: number;
+  createdAt: number | null;
+  updatedAt: number | null;
+  /** JSON text of the body; present for feed rows only, since the client re-loads documents. */
+  documentJson: string | null;
+  /** JSON text of the group key; present iff the plan aggregates. */
+  groupKey: string | null;
+  groupCount: number | null;
+  /**
+   * JSON text of the scalar aggregate values, present iff the row stands for a whole group: the
+   * query declared no `items` aggregate, so one member represents its group and `objectId` is the
+   * serialized key rather than an object.
+   */
+  aggregates: string | null;
+};
+
+export type CompiledQuery = {
+  statement: Statement.Statement<CompiledRow>;
+  /** The statement's SQL text with placeholders, for traces. */
+  sql: string;
+  /** The compiled plan: one `SqlStep` standing for every step the statement absorbed. */
+  plan: QueryPlan.Plan;
+};
+
+/**
+ * A working set as one CTE. Every relation carries the same columns so steps compose:
+ * `recordId`, `objectId`, `spaceId`, `rank`, `ord` (position), and after an `AggregateStep` also
+ * `groupKey`, `groupOrd`, `groupCount` plus one `agg_<name>` column per scalar aggregate.
+ */
+type Relation = {
+  name: string;
+  grouped?: GroupedShape;
+};
+
+type GroupedShape = {
+  /** Result field names of every non-`items` aggregate, orderable as group columns. */
+  aggregateNames: readonly string[];
+  /** One row per group, carrying its aggregates, because the query asked for no members. */
+  collapsed: boolean;
+};
+
+/** The start of every local day a store's timestamps can fall in, ascending, per IANA zone. */
+export type DayStarts = ReadonlyMap<string, readonly number[]>;
+
+const HOUR_MS = 3_600_000;
+const DAY_MS = 86_400_000;
+const UNTYPED_INDEX_TYPE = 'type';
+
+type Fragment = Statement.Fragment;
+
+/**
+ * Compiles a {@link QueryPlan.Plan} into one SQLite statement over the index tables.
+ *
+ * The compiler is a single pass over the plan's steps; each step becomes a CTE over the previous
+ * one, and the final `SELECT` projects the identity of each row. It holds no state beyond the
+ * CTE counter and the parameter-free fragments it builds, so one instance compiles one plan.
+ */
+export class SqlPlanCompiler {
+  readonly #sql: SqlClient.SqlClient;
+  readonly #ctes: Fragment[] = [];
+  #counter = 0;
+  /** Distinct `in-query` subqueries already compiled this plan, keyed as the executor caches them. */
+  readonly #subqueries = new Map<string, string>();
+  /** Resolved `metaVersion` literal sets, keyed by `key\0range`. */
+  readonly #metaVersions: Map<string, readonly string[]>;
+  /** Day boundaries for `timestamp` group keys in a named zone; SQLite has no zone tables of its own. */
+  readonly #dayStarts: DayStarts;
+  /** Whether any select in the plan scopes a space with its feeds, which lets a traversal reach feed items. */
+  #includeAllFeeds = false;
+
+  constructor(
+    sql: SqlClient.SqlClient,
+    metaVersions: Map<string, readonly string[]> = new Map(),
+    dayStarts: DayStarts = new Map(),
+  ) {
+    this.#sql = sql;
+    this.#metaVersions = metaVersions;
+    this.#dayStarts = dayStarts;
+  }
+
+  compile(plan: QueryPlan.Plan, options: CompileOptions = {}): CompiledQuery {
+    const sql = this.#sql;
+    this.#includeAllFeeds = planIncludesAllFeeds(plan);
+    let root = this.#compilePlan(plan, undefined);
+    if (options.strongDependencyFilter !== false) {
+      root = this.#compileStrongDependencyFilter(root);
+    }
+    const final = this.#final(root);
+    const withClause = sql.join(', ', false)(this.#ctes);
+    const statement = sql<CompiledRow>`WITH RECURSIVE ${withClause} ${final}`;
+    const [text, params] = statement.compile();
+    return {
+      statement,
+      sql: text,
+      plan: QueryPlan.Plan.make([{ _tag: 'SqlStep', sql: text, params, steps: plan.steps }]),
+    };
+  }
+
+  #fresh(prefix: string): string {
+    return `${prefix}${this.#counter++}`;
+  }
+
+  #define(prefix: string, body: Fragment, grouped?: GroupedShape): Relation {
+    const name = this.#fresh(prefix);
+    this.#ctes.push(this.#sql`${this.#sql.literal(name)} AS (${body})`);
+    return { name, grouped };
+  }
+
+  #ref(relation: Relation): Fragment {
+    return this.#sql.literal(relation.name);
+  }
+
+  #compilePlan(plan: QueryPlan.Plan, input: Relation | undefined): Relation {
+    const sql = this.#sql;
+    let current: Relation =
+      input ??
+      this.#define(
+        'empty',
+        sql`SELECT NULL AS recordId, NULL AS objectId, NULL AS spaceId, 1.0 AS rank, 0 AS ord WHERE 0`,
+      );
+    for (const step of plan.steps) {
+      current = this.#compileStep(step, current);
+    }
+    return current;
+  }
+
+  #compileStep(step: QueryPlan.Step, ws: Relation): Relation {
+    switch (step._tag) {
+      case 'ClearWorkingSetStep':
+        return this.#define('empty', this.#sql`SELECT * FROM ${this.#ref(ws)} WHERE 0`, ws.grouped);
+      case 'SelectStep':
+        return this.#compileSelect(step, ws);
+      case 'FilterStep':
+        return this.#compileFilter(step, ws);
+      case 'FilterDeletedStep':
+        return this.#compileFilterDeleted(step, ws);
+      case 'TraverseStep':
+        return this.#compileTraverse(step, ws);
+      case 'UnionStep':
+        return this.#compileUnion(step, ws);
+      case 'SetDifferenceStep':
+        return this.#compileSetDifference(step, ws);
+      case 'OrderStep':
+        return this.#compileOrder(step, ws);
+      case 'LimitStep':
+        return this.#compileLimitSkip(ws, { limit: step.limit });
+      case 'SkipStep':
+        return this.#compileLimitSkip(ws, { skip: step.skip });
+      case 'AggregateStep':
+        return this.#compileAggregate(step, ws);
+      default:
+        throw new QueryError({ message: `Unknown step type: ${(step as { _tag: string })._tag}`, context: {} });
+    }
+  }
+
+  //
+  // Select.
+  //
+
+  #compileSelect(step: QueryPlan.SelectStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    const spaceScopes = step.scope.filter((scope): scope is QueryAST.SpaceScope => scope._tag === 'space');
+    const spaces = spaceScopes.map((scope) => scope.spaceId as SpaceId);
+    const queues = step.scope.filter((scope): scope is QueryAST.FeedScope => scope._tag === 'feed');
+    const includeAllQueues = spaceScopes.some((scope) => scope.includeAllFeeds === true);
+    const queueRefs = extractQueueRefs(queues.map((scope) => String(scope.feedUri)));
+    const scope = buildSourceCondition(sql, spaces, includeAllQueues, queueRefs);
+    const window = buildQueueWindow(sql, extractQueueWindow(step));
+
+    let base: Fragment;
+    switch (step.selector._tag) {
+      case 'WildcardSelector':
+        base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope}${window}`;
+        break;
+      case 'TypeSelector': {
+        if (step.selector.typename.length === 0) {
+          base = step.selector.inverted
+            ? sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope}${window}`
+            : sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
+          break;
+        }
+        const typeCondition = buildTypeDxnCondition(sql, step.selector.typename);
+        // Pinned: the planner otherwise seeks `(spaceId, queueId)` and scans the space's documents
+        // for the type. An inverted select cannot seek the type index, so it is left free.
+        base = step.selector.inverted
+          ? sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope} AND NOT (${typeCondition})${window}`
+          : sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m INDEXED BY ${sql.literal(INDEX_SPACE_TYPE)} WHERE ${scope} AND (${typeCondition})${window}`;
+        break;
+      }
+      case 'IdSelector': {
+        const ids = step.selector.objectIds.filter((id) => EntityId.isValid(id));
+        base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope} AND m.objectId IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`;
+        break;
+      }
+      case 'TimestampSelector': {
+        const { updatedAfter, updatedBefore, createdAfter, createdBefore } = step.selector;
+        const conditions: Fragment[] = [scope];
+        if (updatedAfter != null) {
+          conditions.push(sql`m.updatedAt >= ${updatedAfter}`);
+        }
+        if (updatedBefore != null) {
+          conditions.push(sql`m.updatedAt <= ${updatedBefore}`);
+        }
+        if (createdAfter != null) {
+          conditions.push(sql`m.createdAt >= ${createdAfter}`);
+        }
+        if (createdBefore != null) {
+          conditions.push(sql`m.createdAt <= ${createdBefore}`);
+        }
+        base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${sql.and(conditions)}`;
+        break;
+      }
+      case 'IncomingReferenceSelector': {
+        const target = referenceIndexKey(step.selector.targetDXN);
+        if (target === undefined) {
+          base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
+          break;
+        }
+        const pathCondition = this.#propPathCondition(step.selector.property);
+        // The index is not scoped by space; the select's scope narrows the referrers, as the
+        // executor filtered them after the lookup.
+        const spaceCondition =
+          spaces.length > 0 ? sql`m.spaceId IN (SELECT value FROM json_each(${JSON.stringify(spaces)}))` : sql`1 = 1`;
+        base = sql`SELECT DISTINCT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM reverseRef r JOIN objectMeta m ON m.recordId = r.recordId WHERE r.targetDXN = ${target} AND ${pathCondition} AND ${spaceCondition}`;
+        break;
+      }
+      case 'TextSelector': {
+        if (step.selector.searchKind === 'vector') {
+          base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
+          break;
+        }
+        const fts = buildFtsCondition(sql, step.selector.text);
+        if (fts === undefined) {
+          base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
+          break;
+        }
+        const conditions: Fragment[] = [fts.condition, scope];
+        if (step.selector.typename !== null) {
+          conditions.push(
+            step.selector.typename.length > 0 ? sql`(${buildTypeDxnCondition(sql, step.selector.typename)})` : sql`0`,
+          );
+        }
+        const rank = fts.ranked ? sql`-bm25(ftsIndex)` : sql`1.0`;
+        base = sql`SELECT m.recordId, m.objectId, m.spaceId, ${rank} AS rank FROM ftsIndex f JOIN objectMeta m ON m.recordId = f.rowid WHERE ${sql.and(conditions)}`;
+        break;
+      }
+      default:
+        throw new QueryError({
+          message: `Unknown selector type: ${(step.selector as { _tag: string })._tag}`,
+          context: {},
+        });
+    }
+
+    // A select appends to the incoming working set. Every plan orders after its last set changer
+    // (`QueryPlanner._ensureOrderStep`), so the scan's own order only matters when the planner
+    // pushed a limit into this step: then the first rows in natural order (rank for a text search,
+    // id otherwise) are the ones kept, and numbering them costs a sort of the candidates.
+    const selected = this.#define('sel', base);
+    const orderNew = step.selector._tag === 'TextSelector' ? sql`s.rank DESC, s.objectId` : sql`s.objectId`;
+    const ord =
+      step.limit !== undefined ? sql`${UNION_BRANCH_STRIDE} + ROW_NUMBER() OVER (ORDER BY ${orderNew})` : sql`0`;
+    const appended = sql`
+      SELECT recordId, objectId, spaceId, rank, ord FROM ${this.#ref(ws)}
+      UNION ALL
+      SELECT s.recordId, s.objectId, s.spaceId, s.rank, ${ord} AS ord
+      FROM ${this.#ref(selected)} s`;
+    const union = this.#define('ws', appended);
+    if (step.limit === undefined) {
+      return union;
+    }
+    return this.#define('ws', sql`SELECT * FROM ${this.#ref(union)} ORDER BY ord LIMIT ${step.limit}`);
+  }
+
+  /** Reverse-reference rows at a property, matching the executor's index-vs-query path rule. */
+  #propPathCondition(property: string | null): Fragment {
+    const sql = this.#sql;
+    if (property === null) {
+      return sql`1 = 1`;
+    }
+    const normalized = EscapedPropPath.escape(normalizePropPath(EscapedPropPath.unescape(property)));
+    return sql`(r.propPathNormalized = ${normalized} OR r.propPath = ${property})`;
+  }
+
+  //
+  // Filter.
+  //
+
+  #compileFilter(step: QueryPlan.FilterStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    if (step.filter.type === 'child-of') {
+      return this.#compileChildOf(step.filter, ws);
+    }
+    const predicate = this.#compileRootPredicate(step.filter);
+    return this.#define(
+      'ws',
+      sql`SELECT w.* FROM ${this.#ref(ws)} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId WHERE ${predicate}`,
+      ws.grouped,
+    );
+  }
+
+  /**
+   * A filter at the root of a `FilterStep`, evaluated against the row `m`/`d`. Mirrors
+   * `makeFilterMatcher`: `object` checks type, id, props and meta; the rest are boolean
+   * composition or local predicates.
+   */
+  #compileRootPredicate(filter: QueryAST.Filter): Fragment {
+    const sql = this.#sql;
+    switch (filter.type) {
+      case 'object': {
+        const conditions: Fragment[] = [];
+        if (filter.typename !== null) {
+          conditions.push(sql`(${this.#typenameCondition(filter.typename)})`);
+        }
+        if (filter.id && filter.id.length > 0) {
+          conditions.push(sql`m.objectId IN (SELECT value FROM json_each(${JSON.stringify(filter.id)}))`);
+        }
+        for (const [key, valueFilter] of Object.entries(filter.props)) {
+          // `@`-prefixed keys address annotations, never data.
+          if (key.startsWith('@')) {
+            continue;
+          }
+          conditions.push(this.#compileValuePredicate(valueFilter, [key]));
+        }
+        if (filter.foreignKeys && filter.foreignKeys.length > 0) {
+          conditions.push(sql`EXISTS (
+            SELECT 1 FROM json_each(d.snapshot, ${jsonPathLiteral(sql, [ATTR_META, 'keys'])}) k, json_each(${JSON.stringify(filter.foreignKeys)}) f
+            WHERE json_extract(k.value, '$.source') = json_extract(f.value, '$.source') AND json_extract(k.value, '$.id') = json_extract(f.value, '$.id'))`);
+        }
+        if (filter.metaKey !== undefined) {
+          const keyPath = jsonPathLiteral(sql, [ATTR_META, 'key']);
+          conditions.push(sql`json_extract(d.snapshot, ${keyPath}) = ${filter.metaKey}`);
+          if (filter.metaVersion !== undefined) {
+            const versions = this.#metaVersions.get(metaVersionKey(filter.metaKey, filter.metaVersion));
+            if (versions === undefined) {
+              throw new QueryError({
+                message: 'metaVersion filter was not resolved before compilation',
+                context: { key: filter.metaKey },
+              });
+            }
+            const versionPath = jsonPathLiteral(sql, [ATTR_META, 'version']);
+            conditions.push(
+              sql`json_extract(d.snapshot, ${versionPath}) IN (SELECT value FROM json_each(${JSON.stringify(versions)}))`,
+            );
+          }
+        }
+        return conditions.length === 0 ? sql`1 = 1` : sql`(${sql.and(conditions)})`;
+      }
+      case 'tag': {
+        const tagsPath = jsonPathLiteral(sql, [ATTR_META, 'tags']);
+        const target = canonicalTag(filter.tag);
+        // A tag is an encoded reference or (legacy) a bare URI; both sides compare by entity id.
+        return sql`EXISTS (SELECT 1 FROM json_each(d.snapshot, ${tagsPath}) t
+          WHERE ${localIdOfUri(sql, sql`COALESCE(json_extract(t.value, '$."/"'), t.value)`)} = ${target})`;
+      }
+      case 'text-search':
+        // The executors behind an index resolve text search in the select; a residual node
+        // matches nothing, as the in-memory matcher's `noTextSearch` does.
+        return sql`0`;
+      case 'timestamp':
+        return this.#timestampCondition(filter);
+      case 'has-parent':
+        return filter.value ? sql`m.parent IS NOT NULL` : sql`m.parent IS NULL`;
+      case 'mnemonic':
+        return sql`upper(substr(m.objectId, -${EntityId.mnemonicLength})) = ${EntityId.normalizeMnemonic(filter.mnemonic)}`;
+      case 'not':
+        return sql`NOT (${this.#compileRootPredicate(filter.filter)})`;
+      case 'and':
+        return filter.filters.length === 0
+          ? sql`1 = 1`
+          : sql`(${sql.and(filter.filters.map((inner) => this.#compileRootPredicate(inner)))})`;
+      case 'or':
+        return filter.filters.length === 0
+          ? sql`0`
+          : sql`(${sql.or(filter.filters.map((inner) => this.#compileRootPredicate(inner)))})`;
+      case 'child-of':
+        throw new QueryError({ message: 'child-of must be the root of its filter step', context: {} });
+      case 'in-query':
+        throw new QueryError({ message: 'in-query is valid only inside an object filter', context: {} });
+      case 'feed-cursor':
+        throw new QueryError({ message: 'feed-cursor filters are lifted onto the select step', context: {} });
+      default:
+        // Property-level predicates at the root are rejected by the planner; matching nothing
+        // mirrors `makeFilterMatcher`'s default arm.
+        return sql`0`;
+    }
+  }
+
+  #timestampCondition(filter: QueryAST.FilterTimestamp): Fragment {
+    const sql = this.#sql;
+    const column = filter.field === 'updatedAt' ? sql`m.updatedAt` : sql`m.createdAt`;
+    // The index treats both bounds as inclusive, whichever operator the filter carries.
+    return filter.operator === 'gt' || filter.operator === 'gte'
+      ? sql`${column} >= ${filter.value}`
+      : sql`${column} <= ${filter.value}`;
+  }
+
+  /** `compareTypenameStrings` over the stored `typeDXN`: exact when versioned, every version otherwise. */
+  #typenameCondition(typename: string): Fragment {
+    const sql = this.#sql;
+    const forms: string[] = [typename];
+    const dxn = DXN.tryMake(typename);
+    if (dxn && DXN.getVersion(dxn) !== undefined) {
+      // A stored versionless type matches any expected version.
+      forms.push(DXN.make<string>(DXN.getName(dxn)));
+    }
+    return sql.or(forms.map((form) => sql`(${buildTypeDxnCondition(sql, [form])})`));
+  }
+
+  /**
+   * A predicate on one property value, mirroring `filterMatchValue`. Comparisons are typed: a
+   * value matches a string operand only when it is a string, a number operand only when a number.
+   */
+  #compileValuePredicate(filter: QueryAST.Filter, path: readonly string[]): Fragment {
+    const sql = this.#sql;
+    const at = jsonPathLiteral(sql, path);
+    const value = sql`json_extract(d.snapshot, ${at})`;
+    // Coalesced so a missing property yields a definite `false`, never SQL's NULL: `NOT` over a
+    // NULL is NULL, which would drop rows the matcher's `!==` keeps.
+    const type = sql`COALESCE(json_type(d.snapshot, ${at}), 'missing')`;
+    switch (filter.type) {
+      case 'compare': {
+        const operand = filter.value;
+        switch (filter.operator) {
+          case 'eq':
+            return this.#equalsOperand(path, operand);
+          case 'neq':
+            return sql`NOT ${this.#equalsOperand(path, operand)}`;
+          case 'gt':
+          case 'gte':
+          case 'lt':
+          case 'lte': {
+            const op = { gt: '>', gte: '>=', lt: '<', lte: '<=' }[filter.operator];
+            if (typeof operand === 'number') {
+              return sql`(${type} IN ('integer', 'real') AND ${value} ${sql.literal(op)} ${operand})`;
+            }
+            if (typeof operand === 'string') {
+              return sql`(${type} = 'text' AND ${value} ${sql.literal(op)} ${operand})`;
+            }
+            return sql`0`;
+          }
+          default:
+            return sql`0`;
+        }
+      }
+      case 'object': {
+        const nested: Fragment[] = [sql`${type} = 'object'`];
+        for (const [key, valueFilter] of Object.entries(filter.props ?? {})) {
+          nested.push(this.#compileValuePredicate(valueFilter, [...path, key]));
+        }
+        return sql`(${sql.and(nested)})`;
+      }
+      case 'in': {
+        const values = filter.values.map(normalizeInValue);
+        const strings = values.filter((candidate): candidate is string => typeof candidate === 'string');
+        const numbers = values.filter((candidate): candidate is number => typeof candidate === 'number');
+        const booleans = values.filter((candidate): candidate is boolean => typeof candidate === 'boolean');
+        const branches: Fragment[] = [];
+        const refOrValue = sql`COALESCE(json_extract(d.snapshot, ${jsonPathLiteral(sql, [...path, '/'])}), ${value})`;
+        if (strings.length > 0) {
+          branches.push(
+            sql`(${type} IN ('text', 'object') AND ${refOrValue} IN (SELECT value FROM json_each(${JSON.stringify(strings)})))`,
+          );
+        }
+        if (numbers.length > 0) {
+          branches.push(
+            sql`(${type} IN ('integer', 'real') AND ${value} IN (SELECT value FROM json_each(${JSON.stringify(numbers)})))`,
+          );
+        }
+        if (booleans.includes(true)) {
+          branches.push(sql`${type} = 'true'`);
+        }
+        if (booleans.includes(false)) {
+          branches.push(sql`${type} = 'false'`);
+        }
+        if (values.includes(null)) {
+          branches.push(sql`${type} = 'null'`);
+        }
+        return branches.length === 0 ? sql`0` : sql`(${sql.or(branches)})`;
+      }
+      case 'in-query': {
+        const subquery = this.#compileInQuery(filter);
+        const refOrValue = sql`COALESCE(json_extract(d.snapshot, ${jsonPathLiteral(sql, [...path, '/'])}), ${value})`;
+        return sql`COALESCE(${refOrValue} IN (SELECT v FROM ${sql.literal(subquery)}), 0)`;
+      }
+      case 'contains': {
+        const element = filter.value;
+        if (typeof element === 'object' && element !== null && !Array.isArray(element)) {
+          return sql`(${type} = 'array' AND EXISTS (SELECT 1 FROM json_each(d.snapshot, ${at}) e WHERE ${structuralMatch(sql, sql`e.value`, element)}))`;
+        }
+        return sql`(${type} = 'array' AND EXISTS (SELECT 1 FROM json_each(d.snapshot, ${at}) e WHERE ${scalarEquals(sql, sql`e.value`, sql`e.type`, element)}))`;
+      }
+      case 'range': {
+        if (typeof filter.from === 'number' && typeof filter.to === 'number') {
+          return sql`(${type} IN ('integer', 'real') AND ${value} >= ${filter.from} AND ${value} <= ${filter.to})`;
+        }
+        if (typeof filter.from === 'string' && typeof filter.to === 'string') {
+          return sql`(${type} = 'text' AND ${value} >= ${filter.from} AND ${value} <= ${filter.to})`;
+        }
+        return sql`0`;
+      }
+      case 'not':
+        return sql`NOT ${this.#compileValuePredicate(filter.filter, path)}`;
+      case 'and':
+        return filter.filters.length === 0
+          ? sql`1 = 1`
+          : sql`(${sql.and(filter.filters.map((inner) => this.#compileValuePredicate(inner, path)))})`;
+      case 'or':
+        return filter.filters.length === 0
+          ? sql`0`
+          : sql`(${sql.or(filter.filters.map((inner) => this.#compileValuePredicate(inner, path)))})`;
+      default:
+        return sql`0`;
+    }
+  }
+
+  /** Strict equality of a property against an operand, `undefined` meaning "absent". */
+  #equalsOperand(path: readonly string[], operand: unknown): Fragment {
+    const sql = this.#sql;
+    const at = jsonPathLiteral(sql, path);
+    const value = sql`json_extract(d.snapshot, ${at})`;
+    const type = sql`COALESCE(json_type(d.snapshot, ${at}), 'missing')`;
+    if (operand === undefined) {
+      return sql`(${type} = 'missing')`;
+    }
+    if (isEncodedReference(operand)) {
+      return sql`(COALESCE(json_extract(d.snapshot, ${jsonPathLiteral(sql, [...path, '/'])}) = ${EncodedReference.toURI(operand)}, 0))`;
+    }
+    return scalarEquals(sql, value, type, operand);
+  }
+
+  /** Compiles the subquery of an `in-query` node once and returns the CTE holding its projection. */
+  #compileInQuery(filter: QueryAST.FilterInQuery): string {
+    const sql = this.#sql;
+    const key = `${JSON.stringify(filter.subquery)}\0${filter.property}`;
+    const existing = this.#subqueries.get(key);
+    if (existing !== undefined) {
+      return existing;
+    }
+    const subPlan = new QueryPlanner().createPlan(filter.subquery);
+    const result = this.#compilePlan(subPlan, undefined);
+    const at = jsonPathLiteral(sql, [filter.property]);
+    const refAt = jsonPathLiteral(sql, [filter.property, '/']);
+    // Missing and null projected values never broaden the membership set.
+    const projection = this.#define(
+      'sub',
+      sql`SELECT COALESCE(json_extract(d.snapshot, ${refAt}), json_extract(d.snapshot, ${at})) AS v FROM ${this.#ref(result)} w JOIN objectSnapshot d ON d.recordId = w.recordId WHERE json_type(d.snapshot, ${at}) IS NOT NULL AND json_type(d.snapshot, ${at}) != 'null'`,
+    );
+    this.#subqueries.set(key, projection.name);
+    return projection.name;
+  }
+
+  //
+  // Deleted, child-of, strong deps: recursive walks over the dependency columns.
+  //
+
+  #compileFilterDeleted(step: QueryPlan.FilterDeletedStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    const wsRef = this.#ref(ws);
+    // Dependencies whose deletion cascades: the parent chain, plus a relation's endpoints. Each
+    // row lists the entities its verdict depends on, to the executor's depth.
+    const dep = this.#define(
+      'dep',
+      sql`
+      SELECT w.recordId, m.spaceId, m.parentId AS depId, 1 AS depth FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId WHERE m.parentId IS NOT NULL
+      UNION ALL
+      SELECT w.recordId, m.spaceId, m.sourceId, 1 FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId WHERE m.entityKind = 'relation' AND m.sourceId IS NOT NULL
+      UNION ALL
+      SELECT w.recordId, m.spaceId, m.targetId, 1 FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId WHERE m.entityKind = 'relation' AND m.targetId IS NOT NULL
+      UNION ALL
+      SELECT x.recordId, x.spaceId, p.parentId, x.depth + 1
+        FROM ${sql.literal(this.#peekName('dep'))} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId
+        WHERE x.depth < ${MAX_DEPTH_FOR_DELETION_TRACING} AND p.deleted = 0 AND p.parentId IS NOT NULL`,
+    );
+    const deletedByDependency = sql`EXISTS (
+      SELECT 1 FROM ${this.#ref(dep)} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId
+      WHERE x.recordId = w.recordId AND p.deleted = 1)`;
+    const isDeleted = sql`(m.deleted = 1 OR ${deletedByDependency})`;
+    const condition = step.mode === 'only-deleted' ? isDeleted : sql`NOT ${isDeleted}`;
+    return this.#define(
+      'ws',
+      sql`SELECT w.* FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId WHERE ${condition}`,
+      ws.grouped,
+    );
+  }
+
+  /** The name the next `#define` with this prefix will receive, for a recursive CTE's self-reference. */
+  #peekName(prefix: string): string {
+    return `${prefix}${this.#counter}`;
+  }
+
+  #compileChildOf(filter: QueryAST.FilterChildOf, ws: Relation): Relation {
+    const sql = this.#sql;
+    const parentIds: string[] = [];
+    for (const parent of filter.parents) {
+      const eid = EID.tryParse(parent);
+      const objectId = eid ? EID.getEntityId(eid) : undefined;
+      if (objectId) {
+        parentIds.push(objectId);
+      }
+    }
+    const maxDepth = filter.transitive ? MAX_DEPTH_FOR_CHILD_OF_TRACING : 1;
+    const wsRef = this.#ref(ws);
+    // A feed item's parent is its feed when it carries no parent of its own.
+    const anc = this.#define(
+      'anc',
+      sql`
+      SELECT w.recordId, m.spaceId, COALESCE(m.parentId, CASE WHEN m.parentId IS NULL AND m.parent IS NULL AND m.queueId != '' THEN m.queueId END) AS ancestorId, 1 AS depth
+        FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
+      UNION ALL
+      SELECT x.recordId, x.spaceId, p.parentId, x.depth + 1
+        FROM ${sql.literal(this.#peekName('anc'))} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.ancestorId
+        WHERE x.depth < ${maxDepth} AND p.parentId IS NOT NULL`,
+    );
+    return this.#define(
+      'ws',
+      sql`SELECT w.* FROM ${wsRef} w WHERE EXISTS (
+        SELECT 1 FROM ${this.#ref(anc)} x WHERE x.recordId = w.recordId AND x.ancestorId IS NOT NULL
+          AND x.ancestorId IN (SELECT value FROM json_each(${JSON.stringify(parentIds)})))`,
+      ws.grouped,
+    );
+  }
+
+  /**
+   * Drops document rows whose strong dependencies (schema object, relation endpoints, parent) are
+   * absent from the space's indexed documents, transitively, so they never reach a client that
+   * could not hydrate them. Cross-space dependencies are not gated, as `ObjectCore` does not gate them.
+   */
+  #compileStrongDependencyFilter(ws: Relation): Relation {
+    const sql = this.#sql;
+    const wsRef = this.#ref(ws);
+    const typeId = (table: Fragment) => localIdOfLocalUri(sql, sql`${table}.typeDXN`);
+    const seedFrom = (depId: Fragment, extra: Fragment) =>
+      sql`SELECT w.recordId, m.spaceId, ${depId} AS depId, 1 AS depth FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId WHERE m.queueId = '' AND ${extra} ${depId} IS NOT NULL`;
+    // Each recursive branch seeks the dependency row by (space, object) and emits one of its own
+    // dependencies; a derived table over the whole of `objectMeta` here would rescan it per level.
+    const recurseWith = (depId: Fragment, extra: Fragment) =>
+      sql`SELECT x.recordId, x.spaceId, ${depId} AS depId, x.depth + 1
+        FROM ${sql.literal(this.#peekName('sdep'))} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId
+        WHERE x.depth < ${MAX_DEPTH_FOR_STRONG_DEP_TRACING} AND ${extra} ${depId} IS NOT NULL`;
+    const relation = (row: Fragment) => sql`${row}.entityKind = 'relation' AND`;
+    const sdep = this.#define(
+      'sdep',
+      sql.join(
+        ' UNION ALL ',
+        false,
+      )([
+        seedFrom(typeId(sql`m`), sql``),
+        seedFrom(sql`m.parentId`, sql``),
+        seedFrom(sql`m.sourceId`, relation(sql`m`)),
+        seedFrom(sql`m.targetId`, relation(sql`m`)),
+        recurseWith(typeId(sql`p`), sql``),
+        recurseWith(sql`p.parentId`, sql``),
+        recurseWith(sql`p.sourceId`, relation(sql`p`)),
+        recurseWith(sql`p.targetId`, relation(sql`p`)),
+      ]),
+    );
+    return this.#define(
+      'ws',
+      sql`SELECT w.* FROM ${wsRef} w WHERE NOT EXISTS (
+        SELECT 1 FROM ${this.#ref(sdep)} x WHERE x.recordId = w.recordId
+          AND NOT EXISTS (SELECT 1 FROM ${docRow(sql, 'p')} WHERE p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId))`,
+      ws.grouped,
+    );
+  }
+
+  //
+  // Traversal.
+  //
+
+  #compileTraverse(step: QueryPlan.TraverseStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    const wsRef = this.#ref(ws);
+    const project = (target: Fragment) =>
+      sql`SELECT ${target}.recordId, ${target}.objectId, ${target}.spaceId, MIN(w.rank) AS rank, MIN(w.ord) AS ord`;
+    switch (step.traversal._tag) {
+      case 'ReferenceTraversal': {
+        if (step.traversal.direction === 'outgoing') {
+          if (step.traversal.property === null) {
+            throw new QueryError({ message: 'Outgoing reference traversal requires a property', context: {} });
+          }
+          const path = EscapedPropPath.unescape(step.traversal.property);
+          const at = jsonPathLiteral(sql, path);
+          // The property holds one reference or an array of them; either way each is `{"/": uri}`.
+          const refs = sql`json_each(CASE json_type(d.snapshot, ${at}) WHEN 'array' THEN json_extract(d.snapshot, ${at}) ELSE json_array(json_extract(d.snapshot, ${at})) END)`;
+          const uri = sql`json_extract(ref.value, '$."/"')`;
+          // A target in a feed is reachable only when the plan scopes the space with its feeds.
+          const target = this.#includeAllFeeds
+            ? sql`objectMeta t INDEXED BY ${sql.literal(INDEX_SPACE_OBJECT)}`
+            : docRow(sql, 't');
+          const targetKind = this.#includeAllFeeds ? sql`1 = 1` : sql`t.queueId = ''`;
+          return this.#define(
+            'ws',
+            sql`${project(sql`t`)} FROM ${wsRef} w
+              JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
+              JOIN objectSnapshot d ON d.recordId = w.recordId
+              JOIN ${refs} ref
+              JOIN ${target} ON t.spaceId = COALESCE(${spaceIdOfUri(sql, uri)}, m.spaceId) AND t.objectId = ${localIdOfUri(sql, uri)} AND ${targetKind}
+              WHERE ${uri} LIKE 'echo:%'
+              GROUP BY t.recordId`,
+          );
+        }
+        // Incoming: the reverse index keys targets by their local form; the property narrows the
+        // referrer's path.
+        const pathCondition = this.#propPathCondition(step.traversal.property);
+        return this.#define(
+          'ws',
+          sql`${project(sql`t`)} FROM ${wsRef} w
+            JOIN reverseRef r ON r.targetDXN = 'echo:///' || w.objectId
+            JOIN objectMeta t ON t.recordId = r.recordId
+            WHERE ${pathCondition}
+            GROUP BY t.recordId`,
+        );
+      }
+      case 'RelationTraversal': {
+        switch (step.traversal.direction) {
+          case 'relation-to-source':
+          case 'relation-to-target': {
+            const column = step.traversal.direction === 'relation-to-source' ? sql`m.source` : sql`m.target`;
+            return this.#define(
+              'ws',
+              sql`${project(sql`t`)} FROM ${wsRef} w
+                JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
+                JOIN ${docRow(sql, 't')} ON t.spaceId = COALESCE(${spaceIdOfUri(sql, column)}, m.spaceId) AND t.objectId = ${localIdOfUri(sql, column)} AND t.queueId = ''
+                WHERE ${column} IS NOT NULL
+                GROUP BY t.recordId`,
+            );
+          }
+          case 'source-to-relation':
+          case 'target-to-relation': {
+            const bySource = step.traversal.direction === 'source-to-relation';
+            const column = bySource ? sql`t.sourceId` : sql`t.targetId`;
+            const index = sql.literal(bySource ? INDEX_SPACE_SOURCE : INDEX_SPACE_TARGET);
+            return this.#define(
+              'ws',
+              sql`${project(sql`t`)} FROM ${wsRef} w
+                JOIN objectMeta t INDEXED BY ${index} ON t.spaceId = w.spaceId AND ${column} = w.objectId AND t.entityKind = 'relation'
+                GROUP BY t.recordId`,
+            );
+          }
+        }
+        break;
+      }
+      case 'HierarchyTraversal': {
+        if (step.traversal.direction === 'to-parent') {
+          return this.#define(
+            'ws',
+            sql`${project(sql`t`)} FROM ${wsRef} w
+              JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
+              JOIN ${docRow(sql, 't')} ON t.spaceId = COALESCE(${spaceIdOfUri(sql, sql`m.parent`)}, m.spaceId) AND t.objectId = ${localIdOfUri(sql, sql`m.parent`)} AND t.queueId = ''
+              WHERE m.queueId = '' AND m.parent IS NOT NULL
+              GROUP BY t.recordId`,
+          );
+        }
+        // Children by parent, and a feed's items by queue id (a feed's queue id is its object id).
+        // Two seeks rather than one `OR`, which SQLite answers by scanning the space.
+        return this.#define(
+          'ws',
+          sql`SELECT recordId, objectId, spaceId, MIN(rank) AS rank, MIN(ord) AS ord FROM (
+            ${project(sql`t`)} FROM ${wsRef} w
+              JOIN objectMeta t INDEXED BY ${sql.literal(INDEX_SPACE_PARENT)} ON t.spaceId = w.spaceId AND t.parentId = w.objectId
+              GROUP BY t.recordId
+            UNION ALL
+            ${project(sql`t`)} FROM ${wsRef} w
+              JOIN objectMeta t INDEXED BY ${sql.literal(INDEX_SPACE_QUEUE_OBJECT)} ON t.spaceId = w.spaceId AND t.queueId = w.objectId
+              GROUP BY t.recordId
+          ) GROUP BY recordId`,
+        );
+      }
+    }
+    throw new QueryError({
+      message: `Unknown traversal type: ${(step.traversal as { _tag: string })._tag}`,
+      context: {},
+    });
+  }
+
+  //
+  // Set operations.
+  //
+
+  #compileUnion(step: QueryPlan.UnionStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    const branches = step.plans.map((plan, index) => {
+      const result = this.#compilePlan(plan, ws);
+      return sql`SELECT recordId, objectId, spaceId, rank, ${index * UNION_BRANCH_STRIDE} + ord AS ord FROM ${this.#ref(result)}`;
+    });
+    // First occurrence keeps its position, the last occurrence its rank, as the executor's
+    // insertion into a `Map` keyed by (space, document, object) did.
+    const all = this.#define('all', sql.join(' UNION ALL ', false)(branches));
+    return this.#define(
+      'ws',
+      sql`SELECT recordId, objectId, spaceId, MAX(rank) AS rank, MIN(ord) AS ord FROM ${this.#ref(all)} GROUP BY recordId`,
+    );
+  }
+
+  #compileSetDifference(step: QueryPlan.SetDifferenceStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    const source = this.#compilePlan(step.source, ws);
+    const exclude = this.#compilePlan(step.exclude, ws);
+    return this.#define(
+      'ws',
+      sql`SELECT s.* FROM ${this.#ref(source)} s WHERE s.objectId NOT IN (SELECT objectId FROM ${this.#ref(exclude)})`,
+    );
+  }
+
+  //
+  // Order, limit, skip, aggregate.
+  //
+
+  #compileOrder(step: QueryPlan.OrderStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    const wsRef = this.#ref(ws);
+    const terms = step.order.map((order) => this.#orderTerm(order, ws.grouped));
+    const orderBy = terms.length > 0 ? sql.csv(terms) : sql`w.ord`;
+    if (ws.grouped) {
+      // Groups reorder as wholes by their first member; members keep their order within the group.
+      const regrouped = this.#define(
+        'grp',
+        sql`SELECT w.*, DENSE_RANK() OVER (ORDER BY ${orderBy}, w.groupOrd) AS newGroupOrd
+          FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId
+          WHERE w.ord = (SELECT MIN(ord) FROM ${wsRef} f WHERE f.groupKey = w.groupKey)`,
+      );
+      const reordered = this.#define(
+        'ws',
+        sql`SELECT ${this.#groupedColumns(ws.grouped, sql`w`, sql`g.newGroupOrd`)}
+          FROM ${wsRef} w JOIN ${this.#ref(regrouped)} g ON g.groupKey = w.groupKey`,
+        ws.grouped,
+      );
+      const withOrd = this.#define(
+        'ws',
+        sql`SELECT ${this.#groupedColumns(ws.grouped, sql`w`, sql`w.groupOrd`, sql`ROW_NUMBER() OVER (ORDER BY w.groupOrd, w.ord)`)} FROM ${this.#ref(reordered)} w`,
+        ws.grouped,
+      );
+      return step.limit === undefined ? withOrd : this.#compileLimitSkip(withOrd, { limit: step.limit });
+    }
+    const ordered = this.#define(
+      'ws',
+      sql`SELECT w.recordId, w.objectId, w.spaceId, w.rank, ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS ord
+        FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId`,
+    );
+    return step.limit === undefined ? ordered : this.#compileLimitSkip(ordered, { limit: step.limit });
+  }
+
+  /** One `ORDER BY` term over the joined row `w`/`m`/`d`, with nulls last as the executor sorts. */
+  #orderTerm(order: QueryAST.Order, grouped: GroupedShape | undefined): Fragment {
+    const sql = this.#sql;
+    const direction = order.direction === 'desc' ? sql`DESC` : sql`ASC`;
+    switch (order.kind) {
+      case 'natural':
+        return sql`w.objectId ${direction}`;
+      case 'rank':
+        return sql`w.rank ${direction}`;
+      case 'timestamp': {
+        const column = order.field === 'updatedAt' ? sql`m.updatedAt` : sql`m.createdAt`;
+        return sql`COALESCE(${column}, 0) ${direction}`;
+      }
+      case 'property': {
+        if (grouped && grouped.aggregateNames.includes(order.property)) {
+          return sql`${sql.literal(aggregateColumn(order.property))} ${direction} NULLS LAST`;
+        }
+        const at = jsonPathLiteral(sql, [order.property]);
+        // Only scalars order; anything else sorts with the nulls, last.
+        return sql`CASE WHEN json_type(d.snapshot, ${at}) IN ('text', 'integer', 'real', 'true', 'false') THEN json_extract(d.snapshot, ${at}) END ${direction} NULLS LAST`;
+      }
+      default:
+        return sql`w.ord`;
+    }
+  }
+
+  #compileLimitSkip(ws: Relation, { limit, skip }: { limit?: number; skip?: number }): Relation {
+    const sql = this.#sql;
+    const wsRef = this.#ref(ws);
+    if (ws.grouped) {
+      // Group-level paging: whole groups by their ordinal.
+      const conditions: Fragment[] = [];
+      if (skip !== undefined) {
+        conditions.push(sql`w.groupOrd > ${skip}`);
+      }
+      if (limit !== undefined) {
+        conditions.push(sql`w.groupOrd <= ${(skip ?? 0) + limit}`);
+      }
+      const paged = this.#define('ws', sql`SELECT w.* FROM ${wsRef} w WHERE ${sql.and(conditions)}`, ws.grouped);
+      return skip === undefined
+        ? paged
+        : this.#define(
+            'ws',
+            sql`SELECT ${this.#groupedColumns(ws.grouped, sql`w`, sql`w.groupOrd - ${skip}`)} FROM ${this.#ref(paged)} w`,
+            ws.grouped,
+          );
+    }
+    const limitClause = limit !== undefined ? sql`LIMIT ${limit}` : sql`LIMIT -1`;
+    const offsetClause = skip !== undefined ? sql`OFFSET ${skip}` : sql``;
+    return this.#define(
+      'ws',
+      sql`SELECT w.recordId, w.objectId, w.spaceId, w.rank, ROW_NUMBER() OVER (ORDER BY w.ord) AS ord
+        FROM (SELECT * FROM ${wsRef} ORDER BY ord ${limitClause} ${offsetClause}) w`,
+    );
+  }
+
+  #compileAggregate(step: QueryPlan.AggregateStep, ws: Relation): Relation {
+    const sql = this.#sql;
+    const wsRef = this.#ref(ws);
+    const groups = step.aggregates.filter(QueryAST.isGroupKeyAggregate);
+    const scalarAggregates = step.aggregates.filter((aggregate) => aggregate.kind !== 'items');
+    const collapsed = !step.aggregates.some((aggregate) => aggregate.kind === 'items');
+    const itemsOrders = step.aggregates.flatMap((aggregate) =>
+      aggregate.kind === 'items' && aggregate.order?.length ? [aggregate.order] : [],
+    );
+    if (new Set(itemsOrders.map((order) => JSON.stringify(order))).size > 1) {
+      throw new QueryError({
+        message: 'Multiple `items` aggregates with different `order`s are not supported.',
+        context: {},
+      });
+    }
+    const itemsOrder = itemsOrders[0];
+
+    // Group key: one coerced scalar per key entry; a `group` entry falls through its property chain.
+    const keyColumns = groups.map(
+      (group) => sql`${this.#keyComponent(group)} AS ${sql.literal(keyColumn(group.name))}`,
+    );
+    const keyJson =
+      groups.length === 0
+        ? sql`'{}'`
+        : sql`json_object(${sql.join(', ', false)(groups.map((group) => sql`${group.name}, ${this.#jsonKeyComponent(group)}`))})`;
+    const keyed = this.#define(
+      'keyed',
+      sql`SELECT w.*, ${keyJson} AS groupKey${keyColumns.length > 0 ? sql`, ${sql.csv(keyColumns)}` : sql``}
+        FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId`,
+    );
+
+    const aggregateColumns = scalarAggregates.map((aggregate) => {
+      const name = sql.literal(aggregateColumn(aggregate.name));
+      switch (aggregate.kind) {
+        case 'group':
+        case 'type':
+        case 'timestamp':
+          return sql`k.${sql.literal(keyColumn(aggregate.name))} AS ${name}`;
+        case 'count':
+          return sql`COUNT(*) OVER (PARTITION BY k.groupKey) AS ${name}`;
+        case 'max':
+          return sql`MAX(${this.#coercedProperty(aggregate.property, sql`k`)}) OVER (PARTITION BY k.groupKey) AS ${name}`;
+        case 'min':
+          return sql`MIN(${this.#coercedProperty(aggregate.property, sql`k`)}) OVER (PARTITION BY k.groupKey) AS ${name}`;
+        default:
+          throw new QueryError({ message: 'Unknown aggregate kind', context: {} });
+      }
+    });
+    const stamped = this.#define(
+      'agg',
+      sql`SELECT k.recordId, k.objectId, k.spaceId, k.rank, k.ord, k.groupKey,
+        MIN(k.ord) OVER (PARTITION BY k.groupKey) AS firstOrd,
+        COUNT(*) OVER (PARTITION BY k.groupKey) AS groupCount${aggregateColumns.length > 0 ? sql`, ${sql.csv(aggregateColumns)}` : sql``}
+        FROM ${this.#ref(keyed)} k JOIN objectMeta m NOT INDEXED ON m.recordId = k.recordId JOIN objectSnapshot d ON d.recordId = k.recordId`,
+    );
+    const shape: GroupedShape = { aggregateNames: scalarAggregates.map((aggregate) => aggregate.name), collapsed };
+    // Groups take the order of their first member; members keep their order, or the `items`
+    // aggregate's own order when it declares one. A collapsed set keeps only the first member,
+    // which already carries the group's key, count and aggregates.
+    const memberOrder = itemsOrder ? sql.csv(itemsOrder.map((order) => this.#orderTerm(order, undefined))) : sql`w.ord`;
+    const members = collapsed ? sql`WHERE w.ord = w.firstOrd` : sql``;
+    return this.#define(
+      'ws',
+      sql`SELECT ${this.#groupedColumns(shape, sql`w`, sql`DENSE_RANK() OVER (ORDER BY w.firstOrd)`, sql`ROW_NUMBER() OVER (ORDER BY w.firstOrd, ${memberOrder})`)}
+        FROM ${this.#ref(stamped)} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId ${members}`,
+      shape,
+    );
+  }
+
+  /** A group key component in the scalar domain, from the joined `m` (meta) and `d` (body) rows. */
+  #keyComponent(aggregate: QueryAST.GroupAggregate): Fragment {
+    const sql = this.#sql;
+    switch (aggregate.kind) {
+      case 'group': {
+        const coerced = aggregate.properties.map((property) => this.#coercedProperty(property));
+        // `COALESCE` needs two arguments; a single-property chain is the property itself.
+        return coerced.length === 1 ? coerced[0] : sql`COALESCE(${sql.join(', ', false)(coerced)})`;
+      }
+      case 'type':
+        return sql`CASE WHEN m.typeDXN = ${UNTYPED_INDEX_TYPE} THEN NULL ELSE m.typeDXN END`;
+      case 'timestamp':
+        return this.#truncatedTimestamp(aggregate);
+      default:
+        throw new QueryError({ message: 'Not a group key aggregate', context: { kind: aggregate.kind } });
+    }
+  }
+
+  /**
+   * The start of the hour or day a system timestamp falls in, as unix ms. Hours and UTC days are
+   * arithmetic; a day in a named zone is looked up in the boundaries `compilePlan` computed with
+   * `GroupBy.truncateTimestamp`, so both executors agree on daylight-saving days.
+   */
+  #truncatedTimestamp(aggregate: QueryAST.GroupAggregate & { kind: 'timestamp' }): Fragment {
+    const sql = this.#sql;
+    const column = aggregate.field === 'updatedAt' ? sql`m.updatedAt` : sql`m.createdAt`;
+    if (aggregate.unit === 'hour') {
+      return sql`CAST(${column} / ${HOUR_MS} AS INTEGER) * ${HOUR_MS}`;
+    }
+    if (!aggregate.timeZone || aggregate.timeZone === 'UTC') {
+      return sql`CAST(${column} / ${DAY_MS} AS INTEGER) * ${DAY_MS}`;
+    }
+    const starts = this.#dayStarts.get(aggregate.timeZone);
+    if (!starts) {
+      throw new QueryError({
+        message: 'Day boundaries were not resolved for the time zone',
+        context: { timeZone: aggregate.timeZone },
+      });
+    }
+    return sql`CASE WHEN ${column} IS NULL THEN NULL ELSE (SELECT MAX(b.value) FROM json_each(${JSON.stringify(starts)}) b WHERE b.value <= ${column}) END`;
+  }
+
+  /** The grouped working-set columns, with `groupOrd` (and optionally `ord`) replaced. */
+  #groupedColumns(shape: GroupedShape, row: Fragment, groupOrd: Fragment, ord?: Fragment): Fragment {
+    const sql = this.#sql;
+    const columns: Fragment[] = [
+      sql`${row}.recordId`,
+      sql`${row}.objectId`,
+      sql`${row}.spaceId`,
+      sql`${row}.rank`,
+      ord ? sql`${ord} AS ord` : sql`${row}.ord`,
+      sql`${row}.groupKey`,
+      sql`${groupOrd} AS groupOrd`,
+      sql`${row}.groupCount`,
+      ...shape.aggregateNames.map((name) => sql`${row}.${sql.literal(aggregateColumn(name))}`),
+    ];
+    return sql.csv(columns);
+  }
+
+  /** A property coerced to the scalar domain (`null` for anything else); `id` is the entity id. */
+  #coercedProperty(property: string, row: Fragment = this.#sql`m`): Fragment {
+    const sql = this.#sql;
+    if (property === 'id') {
+      return sql`${row}.objectId`;
+    }
+    const at = jsonPathLiteral(sql, [property]);
+    return sql`CASE WHEN json_type(d.snapshot, ${at}) IN ('text', 'integer', 'real', 'true', 'false') THEN json_extract(d.snapshot, ${at}) END`;
+  }
+
+  /** The group key component as JSON, so booleans serialize as `true`/`false` like `JSON.stringify`. */
+  #jsonKeyComponent(group: QueryAST.GroupAggregate): Fragment {
+    const sql = this.#sql;
+    if (group.kind !== 'group') {
+      return this.#keyComponent(group);
+    }
+    const branches = group.properties.map((property) => {
+      if (property === 'id') {
+        return sql`WHEN m.objectId IS NOT NULL THEN m.objectId`;
+      }
+      const at = jsonPathLiteral(sql, [property]);
+      return sql`WHEN json_type(d.snapshot, ${at}) IN ('true', 'false') THEN json(json_type(d.snapshot, ${at})) WHEN json_type(d.snapshot, ${at}) IN ('text', 'integer', 'real') THEN json_extract(d.snapshot, ${at})`;
+    });
+    return sql`CASE ${sql.join(' ', false)(branches)} ELSE NULL END`;
+  }
+
+  //
+  // Final projection.
+  //
+
+  #final(ws: Relation): Fragment {
+    const sql = this.#sql;
+    const aggregates =
+      ws.grouped?.collapsed && ws.grouped.aggregateNames.length > 0
+        ? sql`json_object(${sql.join(', ', false)(ws.grouped.aggregateNames.map((name) => sql`${name}, w.${sql.literal(aggregateColumn(name))}`))})`
+        : ws.grouped?.collapsed
+          ? sql`'{}'`
+          : sql`NULL`;
+    const groupColumns = ws.grouped
+      ? sql`w.groupKey AS groupKey, w.groupCount AS groupCount, ${aggregates} AS aggregates`
+      : sql`NULL AS groupKey, NULL AS groupCount, NULL AS aggregates`;
+    return sql`SELECT w.recordId, w.objectId, w.spaceId, m.documentId, m.queueId, m.queueNamespace, w.rank AS rank,
+      m.createdAt, m.updatedAt,
+      CASE WHEN m.queueId != '' THEN json(d.snapshot) END AS documentJson,
+      ${groupColumns}
+      FROM ${this.#ref(ws)} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId LEFT JOIN objectSnapshot d ON d.recordId = w.recordId
+      ORDER BY w.ord`;
+  }
+}
+
+export type CompileOptions = {
+  /**
+   * Drop document rows whose strong dependencies are absent from the index (default true); the
+   * executor mirrors the client-side gate so dependency-broken objects never reach it.
+   */
+  strongDependencyFilter?: boolean;
+};
+
+/**
+ * Compiles a plan, first resolving every `metaVersion` filter to the literal versions present
+ * under its key: semver ranges are not expressible in SQL, and the distinct versions under one
+ * registry key are few.
+ */
+export const compilePlan = (
+  plan: QueryPlan.Plan,
+  options: CompileOptions = {},
+): Effect.Effect<CompiledQuery, SqlError.SqlError, SqlClient.SqlClient> =>
+  Effect.gen(function* () {
+    const sql = yield* SqlClient.SqlClient;
+    const metaVersions = new Map<string, readonly string[]>();
+    for (const [key, range] of collectMetaVersionFilters(plan)) {
+      const keyPath = jsonPathLiteral(sql, [ATTR_META, 'key']);
+      const versionPath = jsonPathLiteral(sql, [ATTR_META, 'version']);
+      const rows = yield* sql<{ version: string | null }>`
+        SELECT DISTINCT json_extract(snapshot, ${versionPath}) AS version FROM objectSnapshot WHERE json_extract(snapshot, ${keyPath}) = ${key}`;
+      const matching = rows
+        .map((row) => row.version)
+        .filter((version): version is string => typeof version === 'string')
+        .filter((version) => matchMetaKey(key, range, key, version));
+      metaVersions.set(metaVersionKey(key, range), matching);
+    }
+    const dayStarts = new Map<string, readonly number[]>();
+    const timeZones = collectDayTimeZones(plan);
+    if (timeZones.size > 0) {
+      const [range] = yield* sql<{ min: number | null; max: number | null }>`
+        SELECT MIN(MIN(createdAt), MIN(updatedAt)) AS min, MAX(MAX(createdAt), MAX(updatedAt)) AS max FROM objectMeta`;
+      for (const timeZone of timeZones) {
+        dayStarts.set(timeZone, dayStartsBetween(range?.min ?? null, range?.max ?? null, timeZone));
+      }
+    }
+    return new SqlPlanCompiler(sql, metaVersions, dayStarts).compile(plan, options);
+  });
+
+//
+// Helpers.
+//
+
+const metaVersionKey = (key: string, range: string): string => `${key}\0${range}`;
+
+/** IANA zones of every `timestamp` group key that truncates to a local day, sub-plans included. */
+const collectDayTimeZones = (plan: QueryPlan.Plan): Set<string> => {
+  const zones = new Set<string>();
+  const visit = (plan: QueryPlan.Plan) => {
+    for (const step of plan.steps) {
+      switch (step._tag) {
+        case 'AggregateStep':
+          for (const aggregate of step.aggregates) {
+            if (
+              aggregate.kind === 'timestamp' &&
+              aggregate.unit === 'day' &&
+              aggregate.timeZone &&
+              aggregate.timeZone !== 'UTC'
+            ) {
+              zones.add(aggregate.timeZone);
+            }
+          }
+          break;
+        case 'UnionStep':
+          step.plans.forEach(visit);
+          break;
+        case 'SetDifferenceStep':
+          visit(step.source);
+          visit(step.exclude);
+          break;
+        default:
+          break;
+      }
+    }
+  };
+  visit(plan);
+  return zones;
+};
+
+/**
+ * The start of every `timeZone` day from the one holding `min` through the one holding `max`. Days
+ * in a zone are 23 to 25 hours apart, so stepping 36 hours from a day's start lands inside the next
+ * day and truncating again gives its start.
+ */
+const dayStartsBetween = (min: number | null, max: number | null, timeZone: string): number[] => {
+  if (min === null || max === null) {
+    return [];
+  }
+  const starts: number[] = [];
+  let start = GroupBy.truncateTimestamp(min, 'day', timeZone);
+  while (start !== null && start <= max) {
+    starts.push(start);
+    start = GroupBy.truncateTimestamp(start + DAY_MS * 1.5, 'day', timeZone);
+  }
+  return starts;
+};
+
+/** True when any select step, sub-plans included, scopes a space with `includeAllFeeds`. */
+const planIncludesAllFeeds = (plan: QueryPlan.Plan): boolean =>
+  plan.steps.some((step) => {
+    switch (step._tag) {
+      case 'SelectStep':
+        return step.scope.some((scope) => scope._tag === 'space' && scope.includeAllFeeds === true);
+      case 'UnionStep':
+        return step.plans.some(planIncludesAllFeeds);
+      case 'SetDifferenceStep':
+        return planIncludesAllFeeds(step.source) || planIncludesAllFeeds(step.exclude);
+      default:
+        return false;
+    }
+  });
+
+/**
+ * Whether any filter in the plan reads `@meta` — foreign keys, a registry key/version, or tags.
+ *
+ * `objectSnapshot` strips `@meta` from document rows (it exists there only so the entity-meta index
+ * can lift the convergence key out), so those predicates cannot be evaluated in SQL and the plan
+ * has to take the in-memory path instead. Queue rows do keep their meta, but a space-scoped query
+ * sees both, so this declines the plan wholesale rather than by scope.
+ */
+export const planReadsObjectMeta = (plan: QueryPlan.Plan): boolean => {
+  const readsMeta = (filter: QueryAST.Filter): boolean => {
+    if (filter.type === 'object') {
+      if (filter.foreignKeys !== undefined || filter.metaKey !== undefined) {
+        return true;
+      }
+      if (Object.values(filter.props ?? {}).some(readsMeta)) {
+        return true;
+      }
+    }
+    if (filter.type === 'tag') {
+      return true;
+    }
+    if (filter.type === 'and' || filter.type === 'or') {
+      return filter.filters.some(readsMeta);
+    }
+    if (filter.type === 'not') {
+      return readsMeta(filter.filter);
+    }
+    if (filter.type === 'in-query') {
+      // The subquery carries no scope of its own, so it cannot be planned here; walk its AST.
+      let found = false;
+      QueryAST.visit(filter.subquery, (node) => {
+        if ((node.type === 'select' || node.type === 'filter') && readsMeta(node.filter)) {
+          found = true;
+        }
+      });
+      return found;
+    }
+    return false;
+  };
+  return plan.steps.some((step) => {
+    switch (step._tag) {
+      case 'FilterStep':
+        return readsMeta(step.filter);
+      case 'UnionStep':
+        return step.plans.some(planReadsObjectMeta);
+      case 'SetDifferenceStep':
+        return planReadsObjectMeta(step.source) || planReadsObjectMeta(step.exclude);
+      default:
+        return false;
+    }
+  });
+};
+
+/** Every `(metaKey, metaVersion)` pair in the plan, sub-plans and subqueries included. */
+const collectMetaVersionFilters = (plan: QueryPlan.Plan): [key: string, range: string][] => {
+  const found: [string, string][] = [];
+  const visitFilter = (filter: QueryAST.Filter): void => {
+    switch (filter.type) {
+      case 'object':
+        if (filter.metaKey !== undefined && filter.metaVersion !== undefined) {
+          found.push([filter.metaKey, filter.metaVersion]);
+        }
+        for (const nested of Object.values(filter.props)) {
+          visitFilter(nested);
+        }
+        break;
+      case 'in-query':
+        visitPlan(new QueryPlanner().createPlan(filter.subquery));
+        break;
+      case 'not':
+        visitFilter(filter.filter);
+        break;
+      case 'and':
+      case 'or':
+        filter.filters.forEach(visitFilter);
+        break;
+      default:
+        break;
+    }
+  };
+  const visitPlan = (visited: QueryPlan.Plan): void => {
+    for (const step of visited.steps) {
+      switch (step._tag) {
+        case 'FilterStep':
+          visitFilter(step.filter);
+          break;
+        case 'UnionStep':
+          step.plans.forEach(visitPlan);
+          break;
+        case 'SetDifferenceStep':
+          visitPlan(step.source);
+          visitPlan(step.exclude);
+          break;
+        default:
+          break;
+      }
+    }
+  };
+  visitPlan(plan);
+  return found;
+};
+
+/**
+ * A JSON path literal for SQLite's JSON functions, every key quoted so a dot or bracket in a key
+ * cannot change the path. Emitted as a literal, not a parameter, so an expression index on the
+ * same spelling can serve the predicate.
+ */
+const jsonPathLiteral = (sql: SqlClient.SqlClient, path: readonly string[]): Fragment => {
+  const escaped = path.map((key) => `."${key.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join('');
+  return sql.literal(`'$${escaped.replaceAll("'", "''")}'`);
+};
+
+const keyColumn = (name: string): string => `key_${sanitizeIdentifier(name)}`;
+const aggregateColumn = (name: string): string => `agg_${sanitizeIdentifier(name)}`;
+
+/** Result field names come from the query author; only a safe subset can be a column name. */
+const sanitizeIdentifier = (name: string): string => {
+  const safe = name.replace(/[^A-Za-z0-9_]/g, '_');
+  if (safe !== name) {
+    throw new QueryError({ message: `Aggregate name is not a valid identifier: ${name}`, context: { name } });
+  }
+  return safe;
+};
+
+/** `filterMatchValue`'s `in` normalization: a reference compares by its URI. */
+const normalizeInValue = (value: unknown): unknown =>
+  isEncodedReference(value) ? EncodedReference.toURI(value) : value;
+
+/** `matchesTag`'s canonical form: the entity id of an `echo:` URI, the URI itself otherwise. */
+const canonicalTag = (tag: string): string => {
+  const eid = EID.tryParse(tag);
+  return (eid && EID.getEntityId(eid)) || tag;
+};
+
+/**
+ * Strict equality of a JSON value (`value`/`type` are `json_extract`/`json_type` over it) with a
+ * literal, typed as JS `===` is: a number never equals a string, `true` never equals `1`.
+ */
+const scalarEquals = (sql: SqlClient.SqlClient, value: Fragment, type: Fragment, operand: unknown): Fragment => {
+  if (operand === null) {
+    return sql`(${type} = 'null')`;
+  }
+  if (typeof operand === 'boolean') {
+    return sql`(${type} = ${operand ? 'true' : 'false'})`;
+  }
+  if (typeof operand === 'number') {
+    return sql`(${type} IN ('integer', 'real') AND ${value} = ${operand})`;
+  }
+  if (typeof operand === 'string') {
+    return sql`(${type} = 'text' AND ${value} = ${operand})`;
+  }
+  return sql`0`;
+};
+
+/**
+ * `structuralMatch` with `strict` on: the element has exactly the operand's keys, each equal.
+ * Nested objects recurse; arrays and other non-scalars never match, as in the matcher.
+ */
+const structuralMatch = (sql: SqlClient.SqlClient, element: Fragment, operand: Record<string, unknown>): Fragment => {
+  const keys = Object.keys(operand);
+  const conditions: Fragment[] = [
+    sql`json_type(${element}) = 'object'`,
+    sql`(SELECT count(*) FROM json_each(${element})) = ${keys.length}`,
+  ];
+  for (const key of keys) {
+    const at = jsonPathLiteral(sql, [key]);
+    const nested = operand[key];
+    if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
+      conditions.push(structuralMatch(sql, sql`json_extract(${element}, ${at})`, nested as Record<string, unknown>));
+    } else {
+      conditions.push(
+        scalarEquals(
+          sql,
+          sql`json_extract(${element}, ${at})`,
+          sql`COALESCE(json_type(${element}, ${at}), 'missing')`,
+          nested,
+        ),
+      );
+    }
+  }
+  return sql`(${sql.and(conditions)})`;
+};
+
+/** `objectMeta` aliased for a document-row point lookup by (space, queue, object), with the index pinned. */
+const docRow = (sql: SqlClient.SqlClient, alias: string): Fragment =>
+  sql`objectMeta ${sql.literal(alias)} INDEXED BY ${sql.literal(INDEX_SPACE_QUEUE_OBJECT)}`;
+
+/** The entity id of an `echo:` URI (the text after its last slash), `NULL` for any other text. */
+const localIdOfUri = (sql: SqlClient.SqlClient, uri: Fragment): Fragment =>
+  sql`CASE WHEN ${uri} LIKE 'echo:%' THEN substr(${uri}, length(rtrim(${uri}, replace(${uri}, '/', ''))) + 1) ELSE ${uri} END`;
+
+/** The entity id of a space-less `echo:` URI (canonical `echo:///<id>` or legacy `echo:/<id>`), else `NULL`. */
+const localIdOfLocalUri = (sql: SqlClient.SqlClient, uri: Fragment): Fragment =>
+  sql`CASE WHEN ${uri} LIKE 'echo:///%' THEN substr(${uri}, 9) WHEN ${uri} LIKE 'echo:/%' AND ${uri} NOT LIKE 'echo://%' THEN substr(${uri}, 7) END`;
+
+/** The space id of a space-qualified `echo://<space>/<id>` URI, `NULL` for a local one. */
+const spaceIdOfUri = (sql: SqlClient.SqlClient, uri: Fragment): Fragment =>
+  sql`CASE WHEN ${uri} LIKE 'echo://%' AND ${uri} NOT LIKE 'echo:///%' AND instr(substr(${uri}, 8), '/') > 0 THEN substr(${uri}, 8, instr(substr(${uri}, 8), '/') - 1) END`;
+
+/**
+ * The queues a feed scope names, each carrying the space its URI qualifies it with, so the index
+ * seek cannot cross spaces. An unqualified URI matches on its id alone.
+ */
+const extractQueueRefs = (queues: readonly string[]): QueueRef[] | null => {
+  if (queues.length === 0) {
+    return null;
+  }
+  const refs: QueueRef[] = [];
+  for (const feedUri of queues) {
+    const eid = EID.tryParse(feedUri);
+    const queueId = eid ? EID.getEntityId(eid) : undefined;
+    if (!eid || !queueId) {
+      continue;
+    }
+    const spaceId = EID.getSpaceId(eid);
+    refs.push(spaceId !== undefined ? { queueId, spaceId } : { queueId });
+  }
+  return refs;
+};
+
+/** Bound below every assigned position, which start at 0. */
+const BEFORE_FIRST_POSITION = -1;
+
+/**
+ * The index-level window for a select the storage layer can bound itself: a cursor range resumes
+ * by position, a `feedScan` reads a capped page in natural order. Mirrors the executor's rule,
+ * including treating a non-numeric cursor as unsatisfiable rather than absent.
+ */
+const extractQueueWindow = (step: QueryPlan.SelectStep): QueueWindow | undefined => {
+  const range = step.feedCursorRange;
+  if (range === undefined) {
+    if (step.feedScan === undefined || step.limit === undefined) {
+      return undefined;
+    }
+    return {
+      kind: 'natural',
+      direction: step.feedScan.direction,
+      limit: step.limit,
+      ...(step.feedScan.deleted !== undefined ? { deleted: step.feedScan.deleted } : {}),
+    };
+  }
+  if (!step.scope.every((scope) => scope._tag === 'feed')) {
+    throw new QueryError({ message: 'A feed cursor filter can only be used with a feed scope.', context: {} });
+  }
+  return {
+    kind: 'cursor',
+    after: range.begin ? parseCursor(range.begin, Number.MAX_SAFE_INTEGER) : BEFORE_FIRST_POSITION,
+    ...(range.end ? { before: parseCursor(range.end, BEFORE_FIRST_POSITION) } : {}),
+    ...(step.limit !== undefined ? { limit: step.limit } : {}),
+  };
+};
+
+const parseCursor = (cursor: string, unsatisfiable: number): number => {
+  const position = /^\d+$/.test(cursor) ? Number(cursor) : Number.NaN;
+  return Number.isSafeInteger(position) ? position : unsatisfiable;
+};
```

The compiler's public entry point, `compilePlan`, first resolves anything unexpressible as pure SQL — `metaVersion` semver ranges and per-timezone day boundaries — into literal sets via preliminary queries, then hands off to `SqlPlanCompiler.compile`. It also exports `planReadsObjectMeta`, a static check over the plan's filters: because `objectSnapshot` rows strip `@meta`, any predicate touching foreign keys, registry keys/versions, or tags can't be answered by the compiled path, so this flag routes such plans back to memory. Both exports are re-surfaced through a small barrel file.

```diff file=packages/core/echo/echo-host/src/query/sql/index.ts lines=1-12
@@ -0,0 +1,12 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+export {
+  type CompiledQuery,
+  type CompiledRow,
+  type CompileOptions,
+  SqlPlanCompiler,
+  compilePlan,
+  planReadsObjectMeta,
+} from './compile.ts';
```

`plan.ts` gets a new step variant, `SqlStep`, that stands in for a run of steps once they've been compiled into one statement. It carries the SQL text, its bound params, and the original `steps` array so traces and scope extraction still see what the statement represents. This keeps the compiled path inside the existing plan/step abstraction rather than introducing a parallel execution model.

```diff file=packages/core/echo/echo-host/src/query/plan.ts lines=36-58
@@ -36,7 +36,23 @@ export namespace QueryPlan {
     | OrderStep
     | LimitStep
     | SkipStep
-    | AggregateStep;
+    | AggregateStep
+    | SqlStep;
+
+  /**
+   * A contiguous run of steps compiled into a single SQLite statement over the index tables.
+   * Emitted by `SqlPlanCompiler` in place of the steps it stands for, so the compiled path runs a
+   * plan like any other rather than a separate execution mode.
+   */
+  export type SqlStep = {
+    _tag: 'SqlStep';
+    /** Statement text with placeholders. */
+    sql: string;
+    /** Values bound to the statement's placeholders, in order. */
+    params: readonly unknown[];
+    /** The steps the statement stands for, kept so traces and scope analysis still see them. */
+    steps: readonly Step[];
+  };

   /**
    * Clear the current working set.
```

`query-executor.ts` is where mode selection happens. `QueryExecutorMode` is `'sql' | 'memory'`, resolved by `resolveQueryExecutorMode` from an explicit option or the `DX_ECHO_QUERY_EXECUTOR` environment variable, defaulting to `memory`. The `QueryExecutor` constructor computes `#compilable` from `planReadsObjectMeta`, and its `mode` getter only returns `'sql'` when both the requested mode and compilability agree; otherwise it silently falls back. `execQuery` dispatches to `#execCompiled` or `#execInMemory` based on that getter. `#execCompiled` calls `compilePlan`, runs the resulting `SqlStep` through the same `_execPlan` step loop as any in-memory plan, and records the compiled plan so `.plan` and tracing reflect what actually ran. A new `_execSqlStep` handler executes the statement via `SqlClient`, optionally captures `EXPLAIN QUERY PLAN` when tracing is enabled, and converts each returned row into a `QueryItem` carrying no document — `compiledRowToItem` builds the shipped `QueryService.QueryResult` directly from the row, since there's no in-memory object to derive it from. `ExecutionTrace` gains `sql`/`explain` fields so both paths' traces are inspectable the same way, and a `_sameCompiledResult` helper does cheap field comparison for reactive change detection instead of diffing loaded documents.

```diff file=packages/core/echo/echo-host/src/query/query-executor.ts lines=648-728
@@ -616,6 +648,11 @@ export class QueryExecutor extends Resource {
   readonly #includeAllFeeds: boolean;
   private _trace: ExecutionTrace = ExecutionTrace.makeEmpty();
   private _lastResultSet: QueryItem[] = [];
+  readonly #mode: QueryExecutorMode;
+  /** The plan the compiled path runs: one `SqlStep`. Null until the first compiled execution. */
+  #compiledPlan: QueryPlan.Plan | null = null;
+  /** Whether the compiled path can answer this plan at all; see {@link planReadsObjectMeta}. */
+  readonly #compilable: boolean;

   /**
    * Resolved `in-query` (subquery-membership) sets for the current `execQuery` run, keyed by
@@ -640,10 +677,13 @@ export class QueryExecutor extends Resource {
     this._id = options.queryId;
     this._query = options.query;
     this._reactivity = options.reactivity;
+    this.#mode = resolveQueryExecutorMode(options.executor);

     const queryPlanner = new QueryPlanner();
     this._plan = queryPlanner.createPlan(this._query);
     this.#scopes = extractScopes(this._plan);
+    // `objectSnapshot` drops `@meta` for document rows, so a plan reading it cannot be compiled.
+    this.#compilable = !planReadsObjectMeta(this._plan);
     this.#includeAllFeeds = extractIncludeAllFeeds(this._plan);
   }

@@ -656,13 +696,18 @@ export class QueryExecutor extends Resource {
   }

   get plan(): QueryPlan.Plan {
-    return this._plan;
+    return this.#compiledPlan ?? this._plan;
   }

   get trace(): ExecutionTrace {
     return this._trace;
   }

+  /** The path this query actually takes, which is `memory` when `sql` cannot compile the plan. */
+  get mode(): QueryExecutorMode {
+    return this.#mode === 'sql' && this.#compilable ? 'sql' : 'memory';
+  }
+
   getResults(): QueryService.QueryResult[] {
     // Computed over the final (post-filter) result set so counts always match shipped records.
     const groupCounts = new Map<string, number>();
@@ -675,6 +720,9 @@ export class QueryExecutor extends Resource {
     }

     return this._lastResultSet.map((item): QueryService.QueryResult => {
+      if (item.result !== undefined) {
+        return item.result;
+      }
       const serializedGroupKey = item.groupKey !== undefined ? GroupBy.serializeGroupKey(item.groupKey) : undefined;
       if (item.collapsed !== undefined && serializedGroupKey !== undefined) {
         return {
```

```diff file=packages/core/echo/echo-host/src/query/query-executor.ts lines=776-821
@@ -728,8 +776,46 @@ export class QueryExecutor extends Resource {
     log('exec query', {
       queryId: this._id,
       query: Query.pretty(Query.fromAst(this._query)),
+      mode: this.mode,
     });

+    return this.mode === 'sql' ? this.#execCompiled() : this.#execInMemory();
+  }
+
+  /**
+   * The compiled path: the plan is compiled into a single `SqlStep` and run through the same step
+   * loop as any other plan. One statement over the index tables, no document loads — document rows
+   * ship identity only, since the client hydrates them from the document itself; feed rows carry
+   * the indexed snapshot.
+   */
+  async #execCompiled(): Promise<QueryExecutionResult> {
+    const plan = this._plan;
+    const compiled = await this._runInRuntime(compilePlan(plan));
+    this.#compiledPlan = compiled.plan;
+
+    const previous = this._lastResultSet;
+    const { workingSet, trace } = await this._execPlan(compiled.plan, []);
+    this._lastResultSet = workingSet;
+    trace.name = 'Root';
+    trace.details = JSON.stringify({ id: this._id, query: Query.pretty(Query.fromAst(this._query)) });
+    // The statement ran one level down, in the step; surface it on the root the trace prints.
+    trace.sql = compiled.sql;
+    trace.explain = trace.children[0]?.explain;
+    this._trace = trace;
+
+    const changed =
+      previous.length !== workingSet.length ||
+      previous.some((item, index) => !_sameCompiledResult(workingSet[index].result, item.result));
+
+    if (TRACE_QUERY_EXECUTION) {
+      // eslint-disable-next-line no-console
+      console.log(ExecutionTrace.format(trace), trace.sql, trace.explain);
+    }
+
+    return { changed };
+  }
+
+  async #execInMemory(): Promise<QueryExecutionResult> {
     // Subquery results can change between reactive runs, so resolved `in-query` sets must not
     // survive across `execQuery` calls.
     this.#inQuerySetCache = new Map();
```

```diff file=packages/core/echo/echo-host/src/query/query-executor.ts lines=1797-1829
@@ -1708,6 +1797,33 @@ export class QueryExecutor extends Resource {
     };
   }

+  /**
+   * Runs a compiled statement. A source step: it ignores the incoming working set, because the
+   * statement already stands for every step that produced one.
+   */
+  private async _execSqlStep(step: QueryPlan.SqlStep): Promise<StepExecutionResult> {
+    const trace = ExecutionTrace.makeEmpty();
+    const begin = performance.now();
+    const { rows, explain } = await this._runInRuntime(
+      Effect.gen(function* () {
+        const sql = yield* SqlClient.SqlClient;
+        const rows = yield* sql.unsafe<CompiledRow>(step.sql, step.params);
+        const explain = TRACE_QUERY_EXECUTION
+          ? (yield* sql.unsafe<{ detail: string }>(`EXPLAIN QUERY PLAN ${step.sql}`, step.params)).map(
+              (row) => row.detail,
+            )
+          : undefined;
+        return { rows, explain };
+      }),
+    );
+    trace.indexQueryTime = performance.now() - begin;
+    trace.indexHits = rows.length;
+    trace.objectCount = rows.length;
+    trace.sql = step.sql;
+    trace.explain = explain;
+    return { workingSet: rows.map(compiledRowToItem), trace };
+  }
+
   private async _execAggregateStep(
     step: QueryPlan.AggregateStep,
     workingSet: QueryItem[],
```

`query-service.ts` thread an `executor: QueryExecutorMode` option through to each `QueryExecutor` it creates, and adds `hasCompleteSnapshots`, a check the compiled path needs because it reads the snapshot store instead of loading documents. Until every indexed object has a snapshot (e.g. right after upgrading a host that previously never populated it), a query must wait for indexing before its first execution; this is cached once true since the store only ever finishes filling, never regresses. A new `getQueryTraces` RPC-style method also exposes each open query's trace for diagnostics.

```diff file=packages/core/echo/echo-host/src/db-host/query-service.ts lines=92-112
@@ -82,6 +92,21 @@ export class QueryServiceImpl extends Resource implements QueryService.Handlers
     return this._queries.size;
   }

+  'getQueryTraces'(): ExecutionTrace[] {
+    return Array.from(this._queries, (query) => query.executor.trace);
+  }
+
+  /** Cached once true: the store only ever finishes filling, so the check need not repeat. */
+  #snapshotsKnownComplete = false;
+
+  async #snapshotsComplete(): Promise<boolean> {
+    if (this.#snapshotsKnownComplete || !this._params.hasCompleteSnapshots) {
+      return true;
+    }
+    this.#snapshotsKnownComplete = await this._params.hasCompleteSnapshots();
+    return this.#snapshotsKnownComplete;
+  }
+
   // 'all' = catch-all; null = no pending hint.
   #pendingHint: InvalidationHint | 'all' | null = null;

```

```diff file=packages/core/echo/echo-host/src/db-host/query-service.ts lines=186-192
@@ -161,7 +186,7 @@ export class QueryServiceImpl extends Resource implements QueryService.Handlers
       );
       scheduleMicroTask(ctx, async () => {
         await queryEntry.executor.open();
-        if (queryEntry.feedScoped) {
+        if (queryEntry.feedScoped || !(await this.#snapshotsComplete())) {
           await this._params.updateIndexes();
         }
         queryEntry.open = true;
```

Finally `echo-host.ts` accepts a `queryExecutor` option on `EchoHostProps` and passes it, plus the `hasCompleteSnapshots` provider backed by the index engine, into `QueryServiceImpl`. This is the only place a host chooses its execution mode explicitly; everything downstream just consumes it.

```diff file=packages/core/echo/echo-host/src/db-host/echo-host.ts lines=83-243
@@ -83,7 +83,12 @@ const FTS_FLUSH_MAX_DELAY_MS = 10_000;
  */
 export type IndexRunReason = 'open' | 'feed-blocks' | 'documents-saved' | 'batch-continuation' | 'rpc-update-indexes';

+import { type QueryExecutorMode } from '../query/index.ts';
+
 export type EchoHostProps = {
+  /** Query evaluation path; defaults to the in-memory executor (see `QueryExecutorMode`). */
+  queryExecutor?: QueryExecutorMode;
+
   peerIdProvider?: PeerIdProvider;
   getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider;

@@ -182,6 +187,7 @@ export class EchoHost extends Resource {
     peerIdProvider,
     getSpaceKeyByRootDocumentId,
     runtime,
+    queryExecutor,
     assignQueuePositions = false,
     useSubduction,
   }: EchoHostProps) {
@@ -224,12 +230,14 @@ export class EchoHost extends Resource {
     });

     this._queryService = new QueryServiceImpl({
-      automergeHost: this._automergeHost,
       indexEngine: () => this.indexEngine,
       runtime: this._runtime,
+      automergeHost: this._automergeHost,
       spaceStateManager: this._spaceStateManager,
       // Delegate to the public method so the closed-host early-out and cooperative loop apply.
       updateIndexes: () => this.updateIndexes(),
+      executor: queryExecutor,
+      hasCompleteSnapshots: () => RuntimeProvider.runPromise(this._runtime)(this.indexEngine.hasCompleteSnapshots()),
     });

     this._dataService = new DataServiceImpl({
```

## SQL engine tests

Three test files exercise the compiler in `packages/core/echo/echo-host/src/query/sql/`, each checking a different property of `compilePlan`. They run against a real in-memory SQLite instance rather than mocks, so what's verified is the actual SQL the compiler emits, not an idealized model of it.

`compile.test.ts` is the correctness suite. It seeds the three index tables (`EntityMetaIndex`, `ObjectSnapshotIndex`, `ReverseRefIndex`) the way `IndexEngine.#update` would, building a small fixture of tasks, projects, and people with deletions, references, and a relation. Each `it.effect` case plans a query with `QueryPlanner`, compiles it with `compilePlan`, runs the resulting statement, and checks the returned object ids by name. Coverage spans type/property filters with cascade-deletion, typed comparisons and `contains`/`in`, ordering with nulls-last plus limit/skip, reference and relation traversal, hierarchy (`children()`), unions and set differences, and aggregation with grouping, including timezone-aware timestamp truncation. A separate case checks `planReadsObjectMeta`, confirming which filters force the plan back onto the in-memory evaluator because `objectSnapshot` strips `@meta` from document rows.

```diff file=packages/core/echo/echo-host/src/query/sql/compile.test.ts lines=1-432
@@ -0,0 +1,432 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
+import { describe, expect, it } from '@effect/vitest';
+import * as Effect from 'effect/Effect';
+import * as Layer from 'effect/Layer';
+import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
+import * as SqlClient from 'effect/unstable/sql/SqlClient';
+
+import { Aggregate, Filter, Order, Query } from '@dxos/echo';
+import {
+  ATTR_DELETED,
+  ATTR_META,
+  ATTR_PARENT,
+  ATTR_RELATION_SOURCE,
+  ATTR_RELATION_TARGET,
+  ATTR_TYPE,
+} from '@dxos/echo/internal';
+import { TestSchema } from '@dxos/echo/testing';
+import { EntityMetaIndex, type IndexerObject, ObjectSnapshotIndex, ReverseRefIndex } from '@dxos/index-core';
+import { DXN, EID, EntityId, SpaceId, type URI } from '@dxos/keys';
+
+import { GroupBy } from '../group-by.ts';
+import { QueryPlanner } from '../query-planner.ts';
+import { compilePlan, planReadsObjectMeta } from './compile.ts';
+
+const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));
+
+const TASK = DXN.make('com.example.type.task', '0.1.0');
+const PROJECT = DXN.make('com.example.type.project', '0.1.0');
+const PERSON = DXN.make('com.example.type.person', '0.1.0');
+const HAS_MANAGER = DXN.make('com.example.type.hasManager', '0.1.0');
+
+type Fixture = {
+  spaceId: SpaceId;
+  ids: Record<string, EntityId>;
+};
+
+/** Seeds the three index tables the compiler reads, the way `IndexEngine.#update` would. */
+const seed = Effect.gen(function* () {
+  const sqlClient = yield* SqlClient.SqlClient;
+  const meta = new EntityMetaIndex(sqlClient);
+  const bodies = new ObjectSnapshotIndex(sqlClient);
+  const refs = new ReverseRefIndex(sqlClient);
+  yield* meta.migrate();
+  yield* bodies.migrate();
+  yield* refs.migrate();
+
+  const spaceId = SpaceId.random();
+  const ids = Object.fromEntries(
+    ['project', 'deletedProject', 't1', 't2', 't3', 't4', 'alice', 'bob', 'rel'].map((name) => [
+      name,
+      EntityId.random(),
+    ]),
+  ) as Fixture['ids'];
+  const ref = (id: EntityId) => ({ '/': EID.make({ entityId: id }) });
+  const doc = (
+    id: EntityId,
+    type: URI.URI,
+    data: Record<string, unknown>,
+    extra: Record<string, unknown> = {},
+  ): IndexerObject => ({
+    spaceId,
+    documentId: `doc-${id}`,
+    queueId: null,
+    queueNamespace: null,
+    queuePosition: null,
+    recordId: null,
+    createdAt: 1000,
+    updatedAt: 2000,
+    data: { id, [ATTR_TYPE]: type, [ATTR_DELETED]: false, ...extra, ...data },
+  });
+  const objects: IndexerObject[] = [
+    doc(ids.project, PROJECT, { name: 'live' }),
+    doc(ids.deletedProject, PROJECT, { name: 'gone' }, { [ATTR_DELETED]: true }),
+    doc(
+      ids.t1,
+      TASK,
+      { title: 'alpha', priority: 2, tags: ['a', 'b'], assignee: ref(ids.alice) },
+      { [ATTR_PARENT]: EID.make({ entityId: ids.project }) },
+    ),
+    doc(
+      ids.t2,
+      TASK,
+      { title: 'beta', priority: 1, tags: ['b'], assignee: ref(ids.bob) },
+      { [ATTR_PARENT]: EID.make({ entityId: ids.deletedProject }) },
+    ),
+    doc(ids.t3, TASK, { title: 'gamma', priority: 3, tags: [], assignee: ref(ids.alice) }),
+    doc(ids.t4, TASK, {
+      title: 'delta',
+      tags: ['a'],
+      done: true,
+      [ATTR_META]: { keys: [{ source: 'github.com', id: '42' }] },
+    }),
+    doc(ids.alice, PERSON, { name: 'alice' }),
+    doc(ids.bob, PERSON, { name: 'bob' }),
+    doc(
+      ids.rel,
+      HAS_MANAGER,
+      {},
+      {
+        [ATTR_RELATION_SOURCE]: EID.make({ entityId: ids.alice }),
+        [ATTR_RELATION_TARGET]: EID.make({ entityId: ids.bob }),
+      },
+    ),
+  ];
+  yield* meta.update(objects);
+  yield* meta.lookupRecordIds(objects);
+  yield* bodies.update(objects);
+  yield* refs.update(objects);
+  return { spaceId, ids } satisfies Fixture;
+});
+
+const run = (fixture: Fixture, query: Query.Any) =>
+  Effect.gen(function* () {
+    const plan = new QueryPlanner().createPlan(query.ast);
+    const compiled = yield* compilePlan(plan);
+    if (process.env.DX_DEBUG_SQL) {
+      // eslint-disable-next-line no-console
+      console.log(compiled.sql);
+    }
+    const rows = yield* compiled.statement;
+    return { rows, sql: compiled.sql };
+  });
+
+const names = (fixture: Fixture, ids: readonly string[]) =>
+  ids.map((id) => Object.entries(fixture.ids).find(([, value]) => value === id)?.[0] ?? id);
+
+describe('SqlPlanCompiler', () => {
+  it.effect('selects a type and filters on properties, excluding deleted and cascade-deleted rows', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const { rows } = yield* run(fixture, Query.select(Filter.type(TASK, { title: Filter.neq('zzz') })).from(scope));
+      // t2's parent is deleted, so it is deleted transitively.
+      expect(
+        names(
+          fixture,
+          rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['t1', 't3', 't4']);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('typed comparisons, contains, in and has-parent', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const priority = yield* run(fixture, Query.select(Filter.type(TASK, { priority: Filter.gt(1) })).from(scope));
+      expect(
+        names(
+          fixture,
+          priority.rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['t1', 't3']);
+
+      const tagged = yield* run(fixture, Query.select(Filter.type(TASK, { tags: Filter.contains('a') })).from(scope));
+      expect(
+        names(
+          fixture,
+          tagged.rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['t1', 't4']);
+
+      const missing = yield* run(
+        fixture,
+        Query.select(Filter.type(TASK, { priority: Filter.eq(undefined) })).from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          missing.rows.map((row) => row.objectId),
+        ),
+      ).toEqual(['t4']);
+
+      const done = yield* run(fixture, Query.select(Filter.type(TASK, { done: Filter.eq(true) })).from(scope));
+      expect(
+        names(
+          fixture,
+          done.rows.map((row) => row.objectId),
+        ),
+      ).toEqual(['t4']);
+
+      const roots = yield* run(
+        fixture,
+        Query.select(Filter.and(Filter.type(TASK), Filter.hasParent(false))).from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          roots.rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['t3', 't4']);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  // `objectSnapshot` strips `@meta` from document rows, so these predicates have nothing to read
+  // there and the executor sends the plan to the in-memory path instead.
+  it.effect('declines plans whose filters read object meta', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const plan = (query: Query.Any) => new QueryPlanner().createPlan(query.ast);
+
+      expect(planReadsObjectMeta(plan(Query.select(Filter.type(TASK)).from(scope)))).toBe(false);
+      expect(
+        planReadsObjectMeta(
+          plan(Query.select(Filter.foreignKeys(TASK, [{ source: 'github.com', id: '42' }])).from(scope)),
+        ),
+      ).toBe(true);
+      expect(planReadsObjectMeta(plan(Query.select(Filter.key('example.com/type/Contact')).from(scope)))).toBe(true);
+      // A meta predicate nested under a union is still a meta predicate.
+      expect(
+        planReadsObjectMeta(
+          plan(
+            Query.all(
+              Query.select(Filter.type(TASK)),
+              Query.select(Filter.foreignKeys(TASK, [{ source: 'github.com', id: '42' }])),
+            ).from(scope),
+          ),
+        ),
+      ).toBe(true);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('orders by property with nulls last and applies limit and skip', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const ordered = yield* run(
+        fixture,
+        Query.select(Filter.type(TASK)).orderBy(Order.property<{ priority: number }>('priority', 'desc')).from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          ordered.rows.map((row) => row.objectId),
+        ),
+      ).toEqual(['t3', 't1', 't4']);
+
+      const page = yield* run(
+        fixture,
+        Query.select(Filter.type(TASK))
+          .orderBy(Order.property<{ title: string }>('title', 'asc'))
+          .skip(1)
+          .limit(1)
+          .from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          page.rows.map((row) => row.objectId),
+        ),
+      ).toEqual(['t4']);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('traverses references, relations and hierarchy', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      // t2 is cascade-deleted with its project, so bob is reached by no live task.
+      const assignees = yield* run(
+        fixture,
+        Query.select(Filter.type(TestSchema.Task)).reference('assignee').from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          assignees.rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['alice']);
+
+      const withDeleted = yield* run(
+        fixture,
+        Query.select(Filter.type(TestSchema.Task)).reference('assignee').options({ deleted: 'include' }).from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          withDeleted.rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['alice', 'bob']);
+
+      const referrers = yield* run(
+        fixture,
+        Query.select(Filter.id(fixture.ids.alice)).referencedBy(TestSchema.Task, 'assignee').from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          referrers.rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['t1', 't3']);
+
+      const relations = yield* run(
+        fixture,
+        Query.select(Filter.id(fixture.ids.alice)).sourceOf(TestSchema.HasManager).from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          relations.rows.map((row) => row.objectId),
+        ),
+      ).toEqual(['rel']);
+
+      const children = yield* run(fixture, Query.select(Filter.id(fixture.ids.project)).children().from(scope));
+      expect(
+        names(
+          fixture,
+          children.rows.map((row) => row.objectId),
+        ),
+      ).toEqual(['t1']);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('unions and set differences', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const union = yield* run(
+        fixture,
+        Query.all(Query.select(Filter.type(PERSON)), Query.select(Filter.type(PROJECT))).from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          union.rows.map((row) => row.objectId),
+        ).sort(),
+      ).toEqual(['alice', 'bob', 'project']);
+
+      const without = yield* run(
+        fixture,
+        Query.without(
+          Query.select(Filter.type(TASK)),
+          Query.select(Filter.type(TASK, { tags: Filter.contains('a') })),
+        ).from(scope),
+      );
+      expect(
+        names(
+          fixture,
+          without.rows.map((row) => row.objectId),
+        ),
+      ).toEqual(['t3']);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('collapses groups with counts to one row each, ordered by first appearance', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const { rows } = yield* run(
+        fixture,
+        Query.select(Filter.type(TASK))
+          .orderBy(Order.property<{ title: string }>('title', 'asc'))
+          .aggregate({ tag: Aggregate.group('done'), count: Aggregate.count() })
+          .from(scope),
+      );
+      // Without an `items` aggregate each group ships one row, standing for its members.
+      expect(rows.map((row) => [names(fixture, [row.objectId])[0], row.groupKey, row.groupCount])).toEqual([
+        ['t1', '{"tag":null}', 2],
+        ['t4', '{"tag":true}', 1],
+      ]);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('collapses a count by type and hour to one row per group, carrying its aggregates', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const { rows } = yield* run(
+        fixture,
+        Query.select(Filter.everything())
+          .aggregate({ type: Aggregate.type(), hour: Aggregate.updated('hour'), count: Aggregate.count() })
+          .from(scope),
+      );
+      // Every fixture object was updated at 2,000 ms, inside the first UTC hour; the deleted project
+      // and the task under it are out, so the task group counts three.
+      const groups = rows.map((row) => ({
+        ...JSON.parse(row.groupKey ?? '{}'),
+        ...JSON.parse(row.aggregates ?? '{}'),
+      }));
+      expect(groups).toEqual([
+        { type: String(PROJECT), hour: 0, count: 1 },
+        { type: String(TASK), hour: 0, count: 3 },
+        { type: String(PERSON), hour: 0, count: 2 },
+        { type: String(HAS_MANAGER), hour: 0, count: 1 },
+      ]);
+      // One row per group, standing for the group's first member; the executor replaces the id with
+      // the key before the row leaves the host.
+      expect(rows.map((row) => [names(fixture, [row.objectId])[0], row.groupCount])).toEqual([
+        ['project', 1],
+        ['t1', 3],
+        ['alice', 2],
+        ['rel', 1],
+      ]);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('truncates a timestamp key to the local day of a named zone and leaves members uncollapsed', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const scope = [{ _tag: 'space' as const, spaceId: fixture.spaceId }];
+      const { rows } = yield* run(
+        fixture,
+        Query.select(Filter.type(TASK))
+          .aggregate({ day: Aggregate.created('day', { timeZone: 'Asia/Kolkata' }), items: Aggregate.items() })
+          .from(scope),
+      );
+      // 1,000 ms after the epoch is 05:30 on 1 January 1970 in Kolkata, a day that began at 18:30 UTC
+      // the evening before.
+      const day = GroupBy.truncateTimestamp(1000, 'day', 'Asia/Kolkata');
+      expect(day).toBe(Date.UTC(1969, 11, 31, 18, 30));
+      expect(rows).toHaveLength(3);
+      expect(rows.every((row) => row.groupKey === JSON.stringify({ day }) && row.aggregates === null)).toBe(true);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('ships a body only for feed rows', () =>
+    Effect.gen(function* () {
+      const fixture = yield* seed;
+      const { rows } = yield* run(
+        fixture,
+        Query.select(Filter.type(PERSON)).from([{ _tag: 'space' as const, spaceId: fixture.spaceId }]),
+      );
+      expect(rows.every((row) => row.documentJson === null)).toBe(true);
+      expect(rows.every((row) => row.documentId.startsWith('doc-'))).toBe(true);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+});
```

`differential.test.ts` is a randomized cross-check against the existing in-memory evaluator (`filterMatchObjectJSON`), which is the authority the SQL path must match. A deterministic PRNG (seeded, so a failure reproduces) generates 150 objects with sparse, mixed-type fields, then 200 rounds of random filter trees, sometimes wrapped in a union of two selects. Each round runs the filter both through `filterMatchObjectJSON` and through the compiled SQL plan, and asserts the resulting id sets match exactly. A documented exception excludes cross-type ordering comparisons, where JS coercion (`2 >= ''`) diverges from the compiler's stricter type-matched semantics; that divergence is intentional and out of scope for this test. The suite also asserts more than 50 of the 200 rounds return non-empty results, guarding against a generator that only produces vacuous mismatches.

```diff file=packages/core/echo/echo-host/src/query/sql/differential.test.ts lines=1-190
@@ -0,0 +1,190 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
+import { describe, expect, it } from '@effect/vitest';
+import * as Effect from 'effect/Effect';
+import * as Layer from 'effect/Layer';
+import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
+import * as SqlClient from 'effect/unstable/sql/SqlClient';
+
+import { Filter, Query } from '@dxos/echo';
+import { type QueryAST } from '@dxos/echo-protocol';
+import { ATTR_DELETED, ATTR_TYPE, type ObjectJSON } from '@dxos/echo/internal';
+import { EntityMetaIndex, type IndexerObject, ObjectSnapshotIndex } from '@dxos/index-core';
+import { DXN, EntityId, SpaceId } from '@dxos/keys';
+
+import { filterMatchObjectJSON } from '../../filter/index.ts';
+import { QueryPlanner } from '../query-planner.ts';
+import { compilePlan } from './compile.ts';
+
+const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));
+
+const TYPE = DXN.make('com.example.type.item', '0.1.0');
+
+/** Deterministic generator, so a failing case reproduces from its seed. */
+const makeRandom = (seed: number) => {
+  let state = seed >>> 0;
+  const next = () => {
+    state = (state * 1664525 + 1013904223) >>> 0;
+    return state / 0x1_0000_0000;
+  };
+  const int = (max: number) => Math.floor(next() * max);
+  const pick = <T>(items: readonly T[]): T => items[int(items.length)];
+  return { next, int, pick };
+};
+
+type Random = ReturnType<typeof makeRandom>;
+
+const WORDS = ['alpha', 'beta', 'gamma', 'delta', '', 'Alpha', '10', 'zeta'];
+const NUMBERS = [0, 1, 2, 3, 10, -1, 2.5];
+const TAGS = ['a', 'b', 'c'];
+
+/** A body drawing every field from a small domain, so predicates hit often and miss often. */
+const makeBody = (random: Random, id: EntityId): ObjectJSON => {
+  const body: Record<string, unknown> = { id, [ATTR_TYPE]: TYPE, [ATTR_DELETED]: false };
+  if (random.next() < 0.85) {
+    body.name = random.pick(WORDS);
+  }
+  if (random.next() < 0.85) {
+    body.count = random.pick(NUMBERS);
+  }
+  if (random.next() < 0.7) {
+    body.flag = random.next() < 0.5;
+  }
+  if (random.next() < 0.6) {
+    body.tags = Array.from({ length: random.int(4) }, () => random.pick(TAGS));
+  }
+  if (random.next() < 0.5) {
+    body.nested = { level: random.pick(NUMBERS), label: random.pick(WORDS) };
+  }
+  if (random.next() < 0.3) {
+    body.mixed = random.next() < 0.5 ? random.pick(WORDS) : random.pick(NUMBERS);
+  }
+  return body as ObjectJSON;
+};
+
+/**
+ * Ordering comparisons get an operand of the property's own type: across types the matcher
+ * coerces (`2 >= ''` is true in JS) where the compiler deliberately matches nothing, and that
+ * documented divergence is not what this test checks. Equality stays strict on both sides.
+ */
+const scalarFilter = (random: Random, property: string): QueryAST.Filter => {
+  const numeric = property === 'count' || property === 'level';
+  const operand = numeric && random.next() < 0.7 ? random.pick(NUMBERS) : random.pick(WORDS);
+  const sameType = numeric ? random.pick(NUMBERS) : random.pick(WORDS);
+  switch (random.int(6)) {
+    case 0:
+      return { type: 'compare', operator: 'eq', value: operand };
+    case 1:
+      return { type: 'compare', operator: 'neq', value: operand };
+    case 2:
+      return property === 'mixed'
+        ? { type: 'compare', operator: 'eq', value: operand }
+        : { type: 'compare', operator: random.pick(['gt', 'gte', 'lt', 'lte'] as const), value: sameType };
+    case 3:
+      return {
+        type: 'in',
+        values: Array.from({ length: random.int(3) + 1 }, () => (numeric ? random.pick(NUMBERS) : random.pick(WORDS))),
+      };
+    case 4:
+      return numeric
+        ? { type: 'range', from: random.pick(NUMBERS), to: random.pick(NUMBERS) }
+        : { type: 'compare', operator: 'eq', value: undefined };
+    default:
+      return { type: 'not', filter: { type: 'compare', operator: 'eq', value: operand } };
+  }
+};
+
+/** A random `object` filter over the generated properties, one to three predicates deep. */
+const makeFilter = (random: Random, depth = 0): QueryAST.Filter => {
+  const props: Record<string, QueryAST.Filter> = {};
+  const count = random.int(3) + 1;
+  for (let index = 0; index < count; index++) {
+    switch (random.int(6)) {
+      case 0:
+        props.name = scalarFilter(random, 'name');
+        break;
+      case 1:
+        props.count = scalarFilter(random, 'count');
+        break;
+      case 2:
+        props.flag = { type: 'compare', operator: 'eq', value: random.next() < 0.5 };
+        break;
+      case 3:
+        props.tags = { type: 'contains', value: random.pick(TAGS) };
+        break;
+      case 4:
+        props.nested = { type: 'object', typename: null, props: { level: scalarFilter(random, 'level') } };
+        break;
+      default:
+        props.mixed = scalarFilter(random, 'mixed');
+        break;
+    }
+  }
+  const object: QueryAST.Filter = { type: 'object', typename: TYPE, props };
+  // The planner accepts `or` only over bare type filters, so alternatives are exercised as a union
+  // of two selects below; a conjunction of two object filters plans as one filter step.
+  if (depth === 0 && random.next() < 0.2) {
+    return { type: 'and', filters: [object, makeFilter(random, depth + 1)] };
+  }
+  return object;
+};
+
+describe('SqlPlanCompiler differential', () => {
+  it.effect('agrees with the in-memory matcher on random filters over random bodies', () =>
+    Effect.gen(function* () {
+      const random = makeRandom(20260917);
+      const sqlClient = yield* SqlClient.SqlClient;
+      const meta = new EntityMetaIndex(sqlClient);
+      const bodies = new ObjectSnapshotIndex(sqlClient);
+      yield* meta.migrate();
+      yield* bodies.migrate();
+
+      const spaceId = SpaceId.random();
+      const objects: IndexerObject[] = Array.from({ length: 150 }, () => {
+        const id = EntityId.random();
+        return {
+          spaceId,
+          documentId: `doc-${id}`,
+          queueId: null,
+          queueNamespace: null,
+          queuePosition: null,
+          recordId: null,
+          createdAt: 1,
+          updatedAt: 2,
+          data: makeBody(random, id),
+        };
+      });
+      yield* meta.update(objects);
+      yield* meta.lookupRecordIds(objects);
+      yield* bodies.update(objects);
+
+      const scope = [{ _tag: 'space' as const, spaceId }];
+      let nonEmpty = 0;
+      for (let round = 0; round < 200; round++) {
+        const filters = Array.from({ length: random.next() < 0.25 ? 2 : 1 }, () => makeFilter(random));
+        const query =
+          filters.length === 1
+            ? Query.select(Filter.fromAst(filters[0])).from(scope)
+            : Query.all(...filters.map((filter) => Query.select(Filter.fromAst(filter)))).from(scope);
+        const plan = new QueryPlanner().createPlan(query.ast);
+        const compiled = yield* compilePlan(plan);
+        const rows = yield* compiled.statement;
+        const expected = objects
+          .filter((object) => filters.some((filter) => filterMatchObjectJSON(filter, object.data)))
+          .map((object) => object.data.id);
+        const actual = rows.map((row) => row.objectId);
+        expect(actual.sort(), `round ${round}: ${JSON.stringify(filters)}\n${compiled.sql}`).toEqual(
+          [...expected].sort(),
+        );
+        if (expected.length > 0) {
+          nonEmpty++;
+        }
+      }
+      // The generator must exercise matches, not only mismatches.
+      expect(nonEmpty).toBeGreaterThan(50);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+});
```

`explain.test.ts` checks query plan shape rather than results, using SQLite's `EXPLAIN QUERY PLAN` on the compiled SQL. Without `ANALYZE` statistics, SQLite would otherwise prefer an equality seek on `queueId` — true of every row — over the more selective `(spaceId, objectId)` seek, which the earlier benchmark chapter found caused a 17x regression from an effective full scan. These tests assert the compiler pins the seek away from `idx_object_index_queuePosition` and onto the composite `idx_object_index_queueObjectId` for reference joins, that deletion/dependency recursions seek by `objectId`, and that type selects use `idx_object_index_typeDXN`. This locks in the index choice as a regression guard tied directly to the benchmark finding.

```diff file=packages/core/echo/echo-host/src/query/sql/explain.test.ts lines=1-73
@@ -0,0 +1,73 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
+import { describe, expect, it } from '@effect/vitest';
+import * as Effect from 'effect/Effect';
+import * as Layer from 'effect/Layer';
+import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
+import * as SqlClient from 'effect/unstable/sql/SqlClient';
+
+import { Filter, Query } from '@dxos/echo';
+import { TestSchema } from '@dxos/echo/testing';
+import { EntityMetaIndex, ObjectSnapshotIndex, ReverseRefIndex } from '@dxos/index-core';
+import { SpaceId } from '@dxos/keys';
+
+import { QueryPlanner } from '../query-planner.ts';
+import { compilePlan } from './compile.ts';
+
+const TestLayer = SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.provideMerge(Reactivity.layer));
+
+/** `EXPLAIN QUERY PLAN` rows of a compiled query, against the real index migrations. */
+const explain = (query: Query.Any) =>
+  Effect.gen(function* () {
+    const sql = yield* SqlClient.SqlClient;
+    yield* new EntityMetaIndex(sql).migrate();
+    yield* new ObjectSnapshotIndex(sql).migrate();
+    yield* new ReverseRefIndex(sql).migrate();
+    const plan = new QueryPlanner().createPlan(query.ast);
+    const compiled = yield* compilePlan(plan);
+    const rows = yield* sql.unsafe<{ detail: string }>(
+      `EXPLAIN QUERY PLAN ${compiled.sql}`,
+      compiled.statement.compile()[1],
+    );
+    return rows.map((row) => row.detail);
+  });
+
+const scope = [{ _tag: 'space' as const, spaceId: SpaceId.random() }];
+
+// Without `ANALYZE` statistics SQLite prefers an equality on `queueId` (the leading column of the
+// queue-position index, true of every document row) over the `(spaceId, objectId)` seek; the
+// compiler pins the seek. A plan that touches the queue-position index here is a full scan of the
+// space's documents per row, the 17x regression the first benchmark run measured.
+describe('compiled plans seek the index', () => {
+  it.effect('outgoing reference traversal joins its targets by (space, queue, object)', () =>
+    Effect.gen(function* () {
+      const details = yield* explain(Query.select(Filter.type(TestSchema.Task)).reference('assignee').from(scope));
+      const plan = details.join('\n');
+      expect(plan).not.toContain('idx_object_index_queuePosition');
+      expect(plan).toMatch(
+        /SEARCH t USING (COVERING )?INDEX idx_object_index_queueObjectId \(spaceId=\? AND queueId=\? AND objectId=\?\)/,
+      );
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('the deletion and dependency recursions seek their parents', () =>
+    Effect.gen(function* () {
+      const details = yield* explain(Query.select(Filter.type(TestSchema.Task)).from(scope));
+      expect(details.some((detail) => detail.includes('idx_object_index_queuePosition'))).toBe(false);
+      expect(details.filter((detail) => detail.includes('SEARCH p USING'))).not.toHaveLength(0);
+      expect(
+        details.filter((detail) => detail.includes('SEARCH p USING')).every((detail) => detail.includes('objectId=?')),
+      ).toBe(true);
+    }).pipe(Effect.provide(TestLayer)),
+  );
+
+  it.effect('a type select seeks the type index', () =>
+    Effect.gen(function* () {
+      const details = yield* explain(Query.select(Filter.type(TestSchema.Task)).from(scope));
+      expect(details.join('\n')).toContain('idx_object_index_typeDXN (spaceId=? AND typeDXN');
+    }).pipe(Effect.provide(TestLayer)),
+  );
+});
```

## Index data normalization for SQL querying

The compiled query path runs SQL directly against the index tables, so it needs columns whose values line up exactly with how the in-memory engine already matches ids and property paths. This chapter covers the schema and index-engine changes that make `objectMeta`, `reverseRef`, `fts`, and `objectSnapshot` queryable that way, and the migrations that bring existing databases up to date.

`objectMeta.parent`/`source`/`target` store full EID strings, which a SQL join against `objectId` can't match without per-row string concatenation. `entity-meta-index.ts` adds a `localEntityId` helper that extracts the bare entity id only when the reference is local to the row's space, feeding new `parentId`/`sourceId`/`targetId` columns that the query compiler joins through directly.

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.ts lines=61-85
@@ -61,6 +61,25 @@ const _escapeLikePrefix = (prefix: string) => {
   return `${escaped}:%`;
 };

+/**
+ * Bare entity id of a reference that is local to `spaceId`; `null` for a cross-space reference,
+ * a non-entity URI, or no reference. Feeds `objectMeta.parentId`/`sourceId`/`targetId`.
+ */
+export const localEntityId = (uri: unknown, spaceId: SpaceId): string | null => {
+  if (typeof uri !== 'string') {
+    return null;
+  }
+  const eid = EID.tryParse(uri);
+  if (!eid) {
+    return null;
+  }
+  const referencedSpaceId = EID.getSpaceId(eid);
+  if (referencedSpaceId !== undefined && referencedSpaceId !== spaceId) {
+    return null;
+  }
+  return EID.getEntityId(eid) ?? null;
+};
+
 /**
  * WHERE fragment matching the `typeDXN` column against any of the given type identifiers,
  * covering legacy-equivalent stored forms and — for versionless DXNs — versioned rows via a
```

The write path computes these columns alongside the existing ones, in both the update and insert branches.

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.ts lines=515-524
@@ -483,6 +515,10 @@ export class EntityMetaIndex implements Index {
                 : null;
             // Parent (nullable).
             const parent = preserveBody ? priorRow.parent : (castData[ATTR_PARENT] ?? null);
+            // Bare local ids of the dependencies, the columns the query compiler joins through.
+            const parentId = preserveBody ? priorRow.parentId : localEntityId(parent, spaceId);
+            const sourceId = preserveBody ? priorRow.sourceId : localEntityId(source, spaceId);
+            const targetId = preserveBody ? priorRow.targetId : localEntityId(target, spaceId);
             // Convergence key (nullable) — from the meta section of the serialized object. The meta
             // arrives as raw replicated JSON, so anything but a string is treated as no key.
             const rawConvergenceKey = (castData[ATTR_META] as { convergenceKey?: unknown } | undefined)?.convergenceKey;
```

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.ts lines=560-572
@@ -521,12 +560,13 @@ export class EntityMetaIndex implements Index {
               yield* sql`
                   INSERT INTO objectMeta (
                     objectId, queueId, queueNamespace, spaceId, documentId,
-                    entityKind, typeDXN, deleted, source, target, parent, convergenceKey, version,
-                    createdAt, updatedAt, queuePosition
+                    entityKind, typeDXN, deleted, source, target, parent, parentId, sourceId, targetId,
+                    convergenceKey, version, createdAt, updatedAt, queuePosition
                   ) VALUES (
                     ${objectId}, ${queueId ?? ''}, ${queueNamespace ?? ''}, ${spaceId}, ${documentId ?? ''},
                     ${entityKind}, ${typeDXN}, ${deleted},
-                    ${source}, ${target}, ${parent}, ${convergenceKey}, ${version},
+                    ${source}, ${target}, ${parent}, ${parentId}, ${sourceId}, ${targetId},
+                    ${convergenceKey}, ${version},
                     ${createdAtTimestamp}, ${updatedAtTimestamp}, ${queuePosition ?? null}
                   )
                 `;
```

A cross-space reference must stay `NULL` there, since two spaces can reuse the same bare id and a wrong join would collide them. The new test exercises exactly that boundary.

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.test.ts lines=831-905
@@ -831,4 +831,75 @@ describe('EntityMetaIndex', () => {
       expect(live.map((row) => row.objectId)).toEqual(objectIds.slice(2, 4));
     }).pipe(Effect.provide(TestLayer)),
   );
+
+  // The query compiler joins `parentId`/`sourceId`/`targetId` to `objectId` within one space, so a
+  // reference into another space must not be normalized to an id that may collide there.
+  it.effect('fills the normalized id columns for local references only', () =>
+    Effect.gen(function* () {
+      const sql = yield* SqlClient.SqlClient;
+      const index = new EntityMetaIndex(sql);
+      yield* index.migrate();
+
+      const spaceId = SpaceId.random();
+      const otherSpaceId = SpaceId.random();
+      const parentId = EntityId.random();
+      const sourceId = EntityId.random();
+      const targetId = EntityId.random();
+
+      const object: IndexerObject = {
+        spaceId,
+        queueId: null,
+        queueNamespace: null,
+        documentId: 'doc-1',
+        recordId: null,
+        createdAt: null,
+        updatedAt: Date.now(),
+        data: {
+          id: EntityId.random(),
+          [ATTR_TYPE]: TYPE_PERSON,
+          [ATTR_PARENT]: EID.make({ entityId: parentId }),
+        },
+      };
+      const relation: IndexerObject = {
+        spaceId,
+        queueId: null,
+        queueNamespace: null,
+        documentId: 'doc-1',
+        recordId: null,
+        createdAt: null,
+        updatedAt: Date.now(),
+        data: {
+          id: EntityId.random(),
+          [ATTR_TYPE]: TYPE_RELATION,
+          [ATTR_RELATION_SOURCE]: EID.make({ entityId: sourceId }),
+          [ATTR_RELATION_TARGET]: EID.make({ spaceId: otherSpaceId, entityId: targetId }),
+        },
+      };
+      const qualifiedParent: IndexerObject = {
+        spaceId,
+        queueId: null,
+        queueNamespace: null,
+        documentId: 'doc-1',
+        recordId: null,
+        createdAt: null,
+        updatedAt: Date.now(),
+        data: {
+          id: EntityId.random(),
+          [ATTR_TYPE]: TYPE_PERSON,
+          [ATTR_PARENT]: EID.make({ spaceId, entityId: parentId }),
+        },
+      };
+
+      yield* index.update([object, relation, qualifiedParent]);
+
+      type NormalizedIds = { parentId: string | null; sourceId: string | null; targetId: string | null };
+      const rowFor = (objectId: string) =>
+        sql<NormalizedIds>`SELECT parentId, sourceId, targetId FROM objectMeta WHERE objectId = ${objectId}`;
+
+      expect(yield* rowFor(object.data.id)).toEqual([{ parentId, sourceId: null, targetId: null }]);
+      expect(yield* rowFor(relation.data.id)).toEqual([{ parentId: null, sourceId, targetId: null }]);
+      // A reference qualified with the row's own space is still local.
+      expect(yield* rowFor(qualifiedParent.data.id)).toEqual([{ parentId, sourceId: null, targetId: null }]);
+    }).pipe(Effect.provide(TestLayer)),
+  );
 });
```

`buildTypeDxnCondition` also changes shape, from an `= OR LIKE` predicate to a range bounded on `(spaceId, typeDXN)`. The `= OR LIKE` form can't use the index as a seek, so SQLite scans the whole space partition; the range gives it a seekable bound while keeping the exact predicate as a residual filter.

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.ts lines=93-111
@@ -74,9 +93,19 @@ export const buildTypeDxnCondition = (sql: SqlClient.SqlClient, typeDxns: readon
       const hasNoVersion = parsedDxn !== undefined && DXN.getVersion(parsedDxn) === undefined;
       const forms = _typeUriEquivalents(normalized);
       const exactMatch = sql.or(forms.map((form) => sql`typeDXN = ${form}`));
-      return hasNoVersion
-        ? sql.or([exactMatch, sql.or(forms.map((form) => sql`typeDXN LIKE ${_escapeLikePrefix(form)} ESCAPE '\\'`))])
-        : exactMatch;
+      if (!hasNoVersion) {
+        return exactMatch;
+      }
+      // A range bounds the seek on `(spaceId, typeDXN)`; `= OR LIKE` alone makes SQLite scan the
+      // space partition. `;` is the code point after `:`, so the range covers the bare form and
+      // every `form:<version>`; the exact predicate stays as the residual because the range also
+      // admits `form` followed by a code point below `:`.
+      return sql.or(
+        forms.map(
+          (form) =>
+            sql`(typeDXN >= ${form} AND typeDXN < ${form + ';'} AND (typeDXN = ${form} OR typeDXN LIKE ${_escapeLikePrefix(form)} ESCAPE '\\'))`,
+        ),
+      );
     }),
   );

```

`buildSourceCondition` and `buildQueueWindow` change only their visibility, from module-private to exported, so the SQL compiler can reuse the identical predicates the in-memory query path already builds.

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.ts lines=161-167
@@ -132,7 +161,7 @@ export interface QueueRef {
  * Builds a SQL condition for filtering by space and queue source.
  * When `includeAllQueues` is false and no `queues`, only non-queue objects are returned.
  */
-const buildSourceCondition = (
+export const buildSourceCondition = (
   sql: SqlClient.SqlClient,
   spaceIds: readonly string[],
   includeAllQueues: boolean,
```

The reverse-reference index has an analogous problem for property paths: a lookup by property name should match `items.assignee` whether the reference sat at `items.0.assignee` or `items.3.assignee`. `utils.ts` adds `normalizePropPath`, stripping array-index segments.

```diff file=packages/core/echo/index-core/src/utils.ts lines=8-20
@@ -8,6 +8,13 @@ import { invariant } from '@dxos/invariant';

 export type EntityPropPath = string[];

+/**
+ * A property path with array-index segments removed, the form `reverseRef.propPathNormalized`
+ * stores: `['items', '0', 'assignee']` and `['items', 'assignee']` name the same property.
+ */
+export const normalizePropPath = (path: readonly string[]): EntityPropPath =>
+  path.filter((segment) => !/^[0-9]+$/.test(segment));
+
 /**
  * SQLite bound-variable limit (`SQLITE_LIMIT_VARIABLE_NUMBER`, typically 999 in wasm builds).
  * Batch `IN (...)` queries below this; 500 gives a safe margin.
```

`reverse-ref-index.ts` stores this normalized form in a new `propPathNormalized` column alongside the existing `propPath`.

```diff file=packages/core/echo/index-core/src/indexes/reverse-ref-index.ts lines=208-214
@@ -208,7 +208,7 @@ export class ReverseRefIndex implements Index {
             yield* Effect.forEach(
               refs,
               (ref) =>
-                sql`INSERT INTO reverseRef (recordId, targetDXN, propPath) VALUES (${recordId}, ${ref.targetDXN}, ${EscapedPropPath.escape(ref.path)})`,
+                sql`INSERT INTO reverseRef (recordId, targetDXN, propPath, propPathNormalized) VALUES (${recordId}, ${ref.targetDXN}, ${EscapedPropPath.escape(ref.path)}, ${EscapedPropPath.escape(normalizePropPath(ref.path))})`,
               { discard: true },
             );
           }),
```

```diff file=packages/core/echo/index-core/src/indexes/reverse-ref-index.test.ts lines=379-414
@@ -379,4 +379,36 @@ describe('ReverseRefIndex.queryReferrers', () => {
       expect(referrers.map(({ objectId }) => objectId)).toEqual([sameSpace.data.id]);
     }).pipe(Effect.provide(TestLayer)),
   );
+
+  // `propPathNormalized` is what an incoming-reference lookup by property matches on, so it must
+  // name the property regardless of the array position the reference sat at.
+  it.effect('stores the property path with and without array-index segments', () =>
+    Effect.gen(function* () {
+      const sql = yield* SqlClient.SqlClient;
+      const reverseRefIndex = new ReverseRefIndex(sql);
+      yield* reverseRefIndex.migrate();
+
+      const targetDXN = EID.make({ entityId: EntityId.random() });
+      const sourceObject: IndexerObject = {
+        spaceId: SpaceId.random(),
+        queueId: EntityId.random(),
+        queueNamespace: 'data',
+        documentId: null,
+        recordId: 1,
+        createdAt: null,
+        updatedAt: Date.now(),
+        data: {
+          id: EntityId.random(),
+          [ATTR_TYPE]: TYPE_PERSON,
+          items: [{ assignee: { '/': targetDXN } }],
+        },
+      };
+
+      yield* reverseRefIndex.update([sourceObject]);
+
+      const rows = yield* sql<{ propPath: string; propPathNormalized: string }>`
+        SELECT propPath, propPathNormalized FROM reverseRef WHERE targetDXN = ${targetDXN}`;
+      expect(rows).toEqual([{ propPath: 'items.0.assignee', propPathNormalized: 'items.assignee' }]);
+    }).pipe(Effect.provide(TestLayer)),
+  );
 });
```

Because the normalized column is only filled going forward, `index-engine.ts` bumps the reverse-ref index name so every object is re-presented and the column backfilled.

```diff file=packages/core/echo/index-core/src/index-engine.ts lines=102-126
@@ -102,10 +102,25 @@ const convergenceKeyOf = (obj: IndexerObject): string | undefined => {
 /** Name every index tracks its cursor under; a new name retires the old cursor and rebuilds. */
 const INDEX_NAMES = {
   objectSnapshot: 'objectSnapshot',
-  reverseRef: 'reverseRef2',
+  // Bumped for `propPathNormalized`, which the compiled query path matches reference paths on.
+  reverseRef: 'reverseRef3',
   fts: 'fts7',
 } as const;

+/** `json_type(x, path)`, which the compiled query path relies on, returns NULL for a missing path only from here. */
+const MIN_SQLITE_VERSION = [3, 45, 0] as const;
+
+const compareVersions = (version: string, minimum: readonly number[]): number => {
+  const parts = version.split('.').map((part) => Number.parseInt(part, 10));
+  for (let index = 0; index < minimum.length; index++) {
+    const actual = parts[index] ?? 0;
+    if (actual !== minimum[index]) {
+      return actual < minimum[index] ? -1 : 1;
+    }
+  }
+  return 0;
+};
+
 export class IndexEngine {
   readonly #sql: SqlClient.SqlClient;

```

`fts-index.ts` gets a `buildFtsCondition` export that mirrors `FtsIndex.query`'s own matching logic, including its fallback from trigram `MATCH` to `LIKE` for terms under three characters, so the compiled and in-memory paths return the same rows.

```diff file=packages/core/echo/index-core/src/indexes/fts-index.ts lines=270-294
@@ -270,3 +270,25 @@ export class FtsIndex implements Index {
     }),
   );
 }
+
+/**
+ * The `WHERE` fragment matching `ftsIndex f` against free text, and whether BM25 ranking applies.
+ * Terms shorter than the trigram tokenizer's three characters fall back to `LIKE`, which cannot
+ * rank. `undefined` when the text has no terms. Mirrors the conditions {@link FtsIndex.query}
+ * builds, so the compiled and in-memory executors match the same rows.
+ */
+export const buildFtsCondition = (
+  sql: SqlClient.SqlClient,
+  text: string,
+): { condition: Statement.Fragment; ranked: boolean } | undefined => {
+  const trimmed = text.trim();
+  if (trimmed.length === 0) {
+    return undefined;
+  }
+  const terms = trimmed.split(/\s+/).filter(Boolean);
+  const minTermLength = Math.min(...terms.map((term) => term.length));
+  if (minTermLength < 3) {
+    return { condition: sql.and(terms.map((term) => sql`f.snapshot LIKE ${'%' + term + '%'}`)), ranked: false };
+  }
+  return { condition: sql`f.snapshot MATCH ${escapeFts5Query(trimmed)}`, ranked: true };
+};
```

The compiled path also needs to know the store isn't mid-backfill. `object-snapshot-index.ts` adds `countMissingSnapshots`, and `index-engine.ts` exposes it as `hasCompleteSnapshots` so a reader can wait for indexing before querying directly.

```diff file=packages/core/echo/index-core/src/indexes/object-snapshot-index.ts lines=73-92
@@ -73,6 +73,20 @@ export class ObjectSnapshotIndex implements Index {
     });
   }

+  /**
+   * How many indexed objects have no snapshot yet. Non-zero only while the store is filling after
+   * its introduction; a reader that cannot tolerate a partial store waits for this to reach zero.
+   */
+  countMissingSnapshots(): Effect.Effect<number, SqlError.SqlError, SqlClient.SqlClient> {
+    return Effect.gen(function* () {
+      const sql = yield* SqlClient.SqlClient;
+      const [row] = yield* sql<{ missing: number }>`
+        SELECT COUNT(*) AS missing FROM objectMeta m LEFT JOIN objectSnapshot s ON s.recordId = m.recordId
+        WHERE s.recordId IS NULL`;
+      return row?.missing ?? 0;
+    });
+  }
+
   /** Delete snapshot rows by record id. Used by garbage collection. */
   deleteByRecordIds = Effect.fn('ObjectSnapshotIndex.deleteByRecordIds')(
     (recordIds: readonly number[]): Effect.Effect<void, SqlError.SqlError> =>
```

```diff file=packages/core/echo/index-core/src/index-engine.ts lines=200-214
@@ -178,6 +200,15 @@ export class IndexEngine {
    * Query snapshots by recordIds.
    * Used to load queue objects from indexed snapshots.
    */
+  /**
+   * True once every `objectMeta` row has a snapshot. False while the store is still filling after
+   * its introduction, during which the compiled query path would read an incomplete database and
+   * must await indexing first.
+   */
+  hasCompleteSnapshots(): Effect.Effect<boolean, SqlError.SqlError, SqlClient.SqlClient> {
+    return this.#objectSnapshotIndex.countMissingSnapshots().pipe(Effect.map((missing) => missing === 0));
+  }
+
   querySnapshotsJSON(recordIds: number[]) {
     return this.#objectSnapshotIndex.querySnapshotsJSON(recordIds);
   }
```

The compiled path also relies on `json_type` behavior for missing paths that only exists from SQLite 3.45, so `migrate()` now checks the runtime version and fails fast below it.

```diff file=packages/core/echo/index-core/src/index-engine.ts lines=147-159
@@ -132,6 +147,13 @@ export class IndexEngine {

   migrate() {
     return Effect.gen({ self: this }, function* () {
+      const sql = yield* SqlClient.SqlClient;
+      const [{ version }] = yield* sql<{ version: string }>`SELECT sqlite_version() AS version`;
+      if (compareVersions(version, MIN_SQLITE_VERSION) < 0) {
+        return yield* Effect.die(
+          new Error(`SQLite ${version} is below the ${MIN_SQLITE_VERSION.join('.')} the index requires`),
+        );
+      }
       yield* this.#tracker.migrate();
       yield* this.#objectMetaIndex.migrate();
       yield* this.#ftsIndex.migrate();
```

All the new helpers above are re-exported from the package entry point so the SQL compilation layer can import them directly.

```diff file=packages/core/echo/index-core/src/index.ts lines=8-30
@@ -8,9 +8,18 @@ export { IndexedObjectSource } from './indexed-object-source.ts';
 export { type IndexCursor, IndexTracker } from './index-tracker.ts';
 export { ConvergenceKeyIntentStore } from './convergence-key-intent-store.ts';
 export { type Index, type IndexerObject } from './indexes/interface.ts';
-export { FtsIndex, type FtsQuery } from './indexes/fts-index.ts';
+export { FtsIndex, type FtsQuery, buildFtsCondition } from './indexes/fts-index.ts';
 export { ObjectSnapshotIndex } from './indexes/object-snapshot-index.ts';
-export { type EntityMeta, EntityMetaIndex, type QueueRef, type QueueWindow } from './indexes/entity-meta-index.ts';
+export {
+  type EntityMeta,
+  EntityMetaIndex,
+  type QueueRef,
+  type QueueWindow,
+  buildQueueWindow,
+  buildSourceCondition,
+  buildTypeDxnCondition,
+  localEntityId,
+} from './indexes/entity-meta-index.ts';
 export {
   type Referrer,
   type ReverseRef,
@@ -18,4 +27,4 @@ export {
   type ReverseRefQuery,
   referenceIndexKey,
 } from './indexes/reverse-ref-index.ts';
-export { type EntityPropPath, EscapedPropPath } from './utils.ts';
+export { type EntityPropPath, EscapedPropPath, normalizePropPath } from './utils.ts';
```

Each new column needs a migration, since SQLite has no `ADD COLUMN IF NOT EXISTS`. `0008_normalized_ids.ts` adds `parentId`/`sourceId`/`targetId` plus supporting indexes, checking `PRAGMA table_info` first.

```diff file=packages/core/echo/index-core/src/migrations/entity-meta/0008_normalized_ids.ts lines=1-28
@@ -0,0 +1,28 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+import * as Effect from 'effect/Effect';
+import * as SqlClient from 'effect/unstable/sql/SqlClient';
+
+/**
+ * Adds `parentId`, `sourceId` and `targetId`: the bare entity id of the parent and relation
+ * endpoints when they are local to the row's space, `NULL` otherwise. `parent`/`source`/`target`
+ * hold full EID strings, so a join to `objectId` needs string concatenation on the indexed side,
+ * which the `(spaceId, objectId)` index cannot serve; the query compiler joins through these
+ * columns instead. A code migration for the same reason as 0002: SQLite has no
+ * `ADD COLUMN IF NOT EXISTS`.
+ */
+const NORMALIZED_ID_COLUMNS = ['parentId', 'sourceId', 'targetId'] as const;
+
+export const addNormalizedIds = Effect.gen(function* () {
+  const sql = yield* SqlClient.SqlClient;
+  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("objectMeta")');
+  const present = new Set(columns.map((column) => column.name));
+  for (const name of NORMALIZED_ID_COLUMNS) {
+    if (!present.has(name)) {
+      yield* sql.unsafe(`ALTER TABLE objectMeta ADD COLUMN ${name} TEXT`);
+    }
+    yield* sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_object_index_${name} ON objectMeta(spaceId, ${name})`);
+  }
+});
```

It's wired into the entity-meta migration table the same way every prior migration is.

```diff file=packages/core/echo/index-core/src/migrations/entity-meta/index.ts lines=55-61
@@ -54,6 +55,7 @@ export const MIGRATIONS = {
   '0005_queue_object_id': SqlMigrations.apply(queueObjectId),
   '0006_queue_object_id_by_space': SqlMigrations.apply(queueObjectIdBySpace),
   '0007_convergence_key': addConvergenceKey,
+  '0008_normalized_ids': addNormalizedIds,
 };

 /** Own history table per store, since many stores share the client database. */
```

`migrations.test.ts` asserts the full expected column set, so it grows to include the three new columns.

```diff file=packages/core/echo/index-core/src/migrations/migrations.test.ts lines=58-73
@@ -58,13 +58,16 @@ const DESIRED_COLUMNS = [
   'entityKind',
   'objectId',
   'parent',
+  'parentId',
   'queueId',
   'queueNamespace',
   'queuePosition',
   'recordId',
   'source',
+  'sourceId',
   'spaceId',
   'target',
+  'targetId',
   'typeDXN',
   'updatedAt',
   'version',
```

`0002_prop_path_normalized.ts` does the equivalent for `reverseRef.propPathNormalized`, wired into that table's migration list the same way.

```diff file=packages/core/echo/index-core/src/migrations/reverse-ref/0002_prop_path_normalized.ts lines=1-24
@@ -0,0 +1,24 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+import * as Effect from 'effect/Effect';
+import * as SqlClient from 'effect/unstable/sql/SqlClient';
+
+/**
+ * Adds `propPathNormalized`: the escaped property path with array-index segments removed, so an
+ * incoming-reference lookup by property is an indexed equality rather than a per-row path walk.
+ * Rows written before this column existed hold `NULL`; the reverse-reference index name is bumped
+ * alongside so every object is re-presented and the column filled. A code migration because
+ * SQLite has no `ADD COLUMN IF NOT EXISTS`.
+ */
+export const addPropPathNormalized = Effect.gen(function* () {
+  const sql = yield* SqlClient.SqlClient;
+  const columns = yield* sql.unsafe<{ name: string }>('PRAGMA table_info("reverseRef")');
+  if (!columns.some((column) => column.name === 'propPathNormalized')) {
+    yield* sql.unsafe('ALTER TABLE reverseRef ADD COLUMN propPathNormalized TEXT');
+  }
+  yield* sql.unsafe(
+    'CREATE INDEX IF NOT EXISTS idx_reverse_ref_target_path ON reverseRef(targetDXN, propPathNormalized)',
+  );
+});
```

```diff file=packages/core/echo/index-core/src/migrations/reverse-ref/index.ts lines=5-15
@@ -5,9 +5,11 @@
 import { SqlMigrations } from '@dxos/sql-sqlite';

 import init from './0001_init.sql?raw';
+import { addPropPathNormalized } from './0002_prop_path_normalized.ts';

 export const MIGRATIONS = {
   '0001_init': SqlMigrations.apply(init),
+  '0002_prop_path_normalized': addPropPathNormalized,
 };

 /** Own history table per store, since many stores share the client database. */
```

Bumping the reverse-ref index name leaves cursor rows under the old `reverseRef2` name that would otherwise sit unread forever. A tracker migration deletes them; deleting absent rows is a no-op, so it's safe regardless of a database's history.

```diff file=packages/core/echo/index-core/src/migrations/tracker/0005_retire_reverse_ref2_cursors.sql lines=1-9
@@ -0,0 +1,9 @@
+--
+-- Drops the cursor rows of the retired `reverseRef2` index name. The name was bumped to
+-- `reverseRef3` so every object is re-presented and `reverseRef.propPathNormalized` filled; the
+-- rows under the old name would otherwise sit unread forever. Deleting absent rows is a no-op, so
+-- this is safe on every vintage.
+--
+-- Immutable: recorded in `index_cursor_migrations` and never re-run.
+--
+DELETE FROM indexCursor WHERE indexName = 'reverseRef2';
```

```diff file=packages/core/echo/index-core/src/migrations/tracker/index.ts lines=8-21
@@ -8,12 +8,14 @@ import init from './0001_init.sql?raw';
 import reindexReverseRef from './0002_reindex_reverse_ref.sql?raw';
 import retirePreConvergenceKeyCursors from './0003_retire_pre_convergence_key_cursors.sql?raw';
 import retireFtsCursor from './0004_retire_fts_cursor.sql?raw';
+import retireReverseRef2Cursors from './0005_retire_reverse_ref2_cursors.sql?raw';

 export const MIGRATIONS = {
   '0001_init': SqlMigrations.apply(init),
   '0002_reindex_reverse_ref': SqlMigrations.apply(reindexReverseRef),
   '0003_retire_pre_convergence_key_cursors': SqlMigrations.apply(retirePreConvergenceKeyCursors),
   '0004_retire_fts_cursor': SqlMigrations.apply(retireFtsCursor),
+  '0005_retire_reverse_ref2_cursors': SqlMigrations.apply(retireReverseRef2Cursors),
 };

 /** Own history table per store, since many stores share the client database. */
```

## Client-side flag wiring

The working-set executor is the client-side fallback path that runs when a query can't be (or isn't) evaluated by the SQL engine on the host. Since results from the two paths get merged by position, their ordering has to match exactly, not just be "close enough" under locale rules. This chapter tightens the executor's comparisons to the same semantics SQLite uses, and threads the new query-executor mode through the test builder so tests can opt into the SQL path per peer.

The natural-order comparator and the generic value comparator both switched from `localeCompare` to plain code-unit comparison. Locale-aware comparison can disagree with SQLite's binary collation on mixed-case strings, which would silently desync ordering between the two executors.

```diff file=packages/core/echo/echo-client/src/query/working-set-executor.ts lines=540-548
@@ -540,9 +540,9 @@ export class WorkingSetQueryExecutor {
   private _compareByOrder(itemA: WorkingSetItem, itemB: WorkingSetItem, order: QueryAST.Order): number {
     switch (order.kind) {
       case 'natural': {
-        // The working set has no queue/insertion order (that lives in the feed index); fall back
-        // to a stable id ordering so results are deterministic.
-        const comparison = itemA.objectId.localeCompare(itemB.objectId);
+        // Code-unit order, as the host sorts: a locale comparison disagrees with it on a
+        // mixed-case pair of ids, and the two sources' results are merged by position.
+        const comparison = itemA.objectId < itemB.objectId ? -1 : itemA.objectId > itemB.objectId ? 1 : 0;
         return order.direction === 'desc' ? -comparison : comparison;
       }
       case 'rank':
```

The tracing depth constant for resolving `child-of` relationships is also aligned with the host executor and `DeletionResolver`, so a child object resolves consistently regardless of which side does the work.

```diff file=packages/core/echo/echo-client/src/query/working-set-executor.ts lines=601-608
@@ -601,7 +601,8 @@ export class WorkingSetQueryExecutor {
   }
 }

-const MAX_DEPTH_FOR_CHILD_OF_TRACING = 16;
+/** Matches the host executor and `DeletionResolver`, so a child resolves the same on both sides. */
+const MAX_DEPTH_FOR_CHILD_OF_TRACING = 10;

 /** True once the working set has been partitioned by an AggregateStep (every item carries a group key). */
 const _isGroupedWorkingSet = (ws: WorkingSetItem[]): boolean => ws.length > 0 && ws[0].groupKey !== undefined;
```

The other comparator change follows the same code-unit-order fix, applied to the generic value comparison used for non-natural orderings.

```diff file=packages/core/echo/echo-client/src/query/working-set-executor.ts lines=621-636
@@ -620,13 +621,16 @@ const _compareValues = (valueA: unknown, valueB: unknown): number => {
   if (valueB == null) {
     return -1;
   }
+  // Code-unit order, the collation the host's SQLite sort uses.
   if (typeof valueA === 'string' && typeof valueB === 'string') {
-    return valueA.localeCompare(valueB);
+    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
   }
   if (typeof valueA === 'number' && typeof valueB === 'number') {
     return valueA - valueB;
   }
-  return String(valueA).localeCompare(String(valueB));
+  const stringA = String(valueA);
+  const stringB = String(valueB);
+  return stringA < stringB ? -1 : stringA > stringB ? 1 : 0;
 };

 const _filterContainsTimestamp = (filter: QueryAST.Filter): boolean => {
```

On the test-builder side, `EchoTestPeer` gains a `queryExecutor` option typed as `QueryExecutorMode`, imported from `@dxos/echo-host`. It's optional and falls back to the environment's `DX_ECHO_QUERY_EXECUTOR`, or `memory` if unset, matching how `EchoHost` itself resolves the mode. The value is stored on construction and passed straight through when the peer builds its `EchoHost`, giving tests a way to force the SQL path without touching environment variables.

```diff file=packages/core/echo/echo-client/src/testing/echo-test-builder.ts lines=124-169
@@ -121,8 +124,9 @@ export class EchoTestPeer extends Resource {
   private _persistentRuntime?: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient | SqlExport.SqlExport, never>;
   private _managedRuntime!: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient | SqlExport.SqlExport, never>;

-  constructor({ types, registry, assignQueuePositions, storagePath }: PeerOptions = {}) {
+  constructor({ types, registry, assignQueuePositions, storagePath, queryExecutor }: PeerOptions = {}) {
     super();
+    this._queryExecutor = queryExecutor;
     // Include Expando as default type for tests that use Obj.make(TestSchema.Expando, ...).
     this._types = [TestSchema.Expando, ...(types ?? [])];
     this._registry = registry ?? [];
@@ -159,6 +163,7 @@ export class EchoTestPeer extends Resource {
     this._echoHost = new EchoHost({
       runtime: this._managedRuntime.contextEffect,
       assignQueuePositions: this._assignQueuePositions,
+      queryExecutor: this._queryExecutor,
     });
     this._clients.clear();
     this._echoClient = new EchoClient();
```

## Benchmarks and documentation

This chapter adds the two artifacts a reviewer uses to judge whether the SQL path is worth shipping: a benchmark suite that runs the same query workload under both executors, and a design document that explains why the SQL compiler is built the way it is. Together they let the flag flip from `memory` to `sql` be an evidence-based decision rather than a guess.

The benchmark is a new file, `query-executor.bench.ts`. It seeds one warm, file-backed peer with a mixed population of tasks, notes, events, organizations and persons, then runs the same set of query shapes, selecting the executor with `DX_ECHO_QUERY_EXECUTOR`. Each run measures only the mode it was given; the harness no longer builds one peer per mode in the same process, because that stopped scaling once a run seeded thousands of objects and multi-peer flushes started hitting the 30s RPC timeout. A cold peer is derived by exporting the warm peer's SQLite file and reopening a copy, so cold measurements are genuinely cold rather than warmed by in-process document creation. Alongside timing, `afterAll` reads the host's execution traces (`docsLoaded`, `indexHits`, `exec`) and samples heap/RSS around each query to show what an executor leaves resident, not just how fast it answers.

```diff file=packages/core/echo/echo-client-e2e/src/query-executor.bench.ts lines=1-569
@@ -0,0 +1,569 @@
+//
+// Copyright 2026 DXOS.org
+//
+
+import * as Schema from 'effect/Schema';
+import { rmSync, writeFileSync } from 'node:fs';
+import v8 from 'node:v8';
+import vm from 'node:vm';
+import { afterAll, bench, describe } from 'vitest';
+
+import { Filter, Obj, Order, Query, type QueryResult, Ref, Type } from '@dxos/echo';
+import { type EchoDatabase } from '@dxos/echo-client';
+import { EchoTestBuilder, type EchoTestPeer, createTmpPath } from '@dxos/echo-client/testing';
+import { type ExecutionTrace } from '@dxos/echo-host';
+import { TestSchema } from '@dxos/echo/testing';
+import { DXN } from '@dxos/keys';
+
+import { blackhole, parseBenchCount } from './testing/bench-util.ts';
+
+//
+// A query workload under one of the host's two query executors, selected by `DX_ECHO_QUERY_EXECUTOR`
+// (`memory`, the default, loads the objects a plan touches and evaluates it in JS; `sql` compiles the
+// plan into one SQLite statement and loads nothing). One run measures one mode; `BENCHMARKS.md`
+// records the pairs.
+//
+// One warm peer holds a mixed population: TASK_COUNT tasks (priority cycling 1..5, each assigned to
+// one of PERSON_COUNT persons), half as many notes with ~1 KB bodies, half as many events, a few
+// organizations and the persons. The `run:` rows query the tasks and events out of that pool; the
+// `reactive first result` row opens a reactive query and waits for its first non-empty result, which
+// is the host-side re-execution path. `afterAll` reads the host's execution traces for each query
+// shape and prints them.
+//
+// The store is seeded once, into the file-backed warm peer; the cold peer opens a copy of that SQLite
+// file (`exportSqliteDatabase`), because seeding a second peer in the same process gets slower with
+// everything the first one left resident and hits the 30 s flush RPC timeout around 10k objects. The
+// cold row reloads that peer and times the first `run()` of the type+property query; the reload is
+// inside the timed body, since vitest's `bench()` has no per-iteration hooks, so the query-only phase
+// is also recorded from inside the row and reported from `afterAll`.
+//
+// Memory is measured from `afterAll`, outside tinybench: for each shape the heap is collected, the
+// query run a few times under a 1 ms sampler recording peak heap and RSS, and collected again for the
+// retained delta. The cold peer gets the same treatment across a reload, which is where a query's
+// document loads stay resident.
+//
+
+const TASK_COUNT = parseBenchCount('QUERY_EXECUTOR_BENCH_COUNT', 2_000);
+const NOTE_COUNT = Math.ceil(TASK_COUNT / 2);
+const EVENT_COUNT = Math.ceil(TASK_COUNT / 2);
+const ORG_COUNT = Math.max(10, Math.ceil(TASK_COUNT / 20));
+const PERSON_COUNT = 50;
+const PRIORITY_LEVELS = 5;
+const TARGET_PRIORITY = 3;
+const EVENT_KINDS = ['meeting', 'call', 'deadline'] as const;
+const TARGET_EVENT_KIND = 'deadline';
+const ORDER_LIMIT = 20;
+const SEED_BATCH_SIZE = 200;
+const SEED_PROGRESS_EVERY = 1_000;
+const FIRST_RESULT_TIMEOUT_MS = 30_000;
+const SHORT_RESULT_RETRIES = 10;
+const MEMORY_ITERATIONS = 3;
+// `process.memoryUsage()` reads /proc on every call; at 1 ms the sampler ate enough of the event loop to
+// push the client's 2 s per-object load budget over on a cold 1,000-result query. 10 ms still gives a
+// dozen samples per warm iteration.
+const MEMORY_SAMPLE_INTERVAL_MS = 10;
+// tinybench warms up for 16 iterations by default; a short warm-up keeps the row bounded.
+const WARM_OPTIONS = { time: 1_000, warmupIterations: 3 };
+// Every cold sample reloads a peer; a small fixed sample count keeps the row bounded.
+const COLD_OPTIONS = { iterations: 3, time: 0, warmupIterations: 1, warmupTime: 0 };
+// Set only when the bench runs against a build that still carries the executor switch; labels the output.
+const EXECUTOR_LABEL = process.env.DX_ECHO_QUERY_EXECUTOR;
+
+// `TestSchema.Task` carries no numeric field to filter and order on, so the bench types its own task
+// with a `priority`; the assignee stays a `TestSchema.Person` so the reference row traverses a
+// shared test type.
+class BenchTask extends Type.makeObject<BenchTask>(DXN.make('com.example.type.benchTask', '0.1.0'))(
+  Schema.Struct({
+    title: Schema.optional(Schema.String),
+    description: Schema.optional(Schema.String),
+    // Optional like every `TestSchema` field: `Filter.eq(n)` is a `Filter<number | undefined>`, which the
+    // typed props overload of `Filter.type` only accepts against an optional field.
+    priority: Schema.optional(Schema.Number),
+    assignee: Schema.optional(Ref.Ref(TestSchema.Person)),
+  }),
+) {}
+
+/** Larger documents than a task, so document loads on a type the query does not select still cost. */
+class BenchNote extends Type.makeObject<BenchNote>(DXN.make('com.example.type.benchNote', '0.1.0'))(
+  Schema.Struct({
+    title: Schema.optional(Schema.String),
+    body: Schema.optional(Schema.String),
+    tags: Schema.optional(Schema.Array(Schema.String)),
+  }),
+) {}
+
+/** A second queried type, filtered on a string property rather than a number. */
+class BenchEvent extends Type.makeObject<BenchEvent>(DXN.make('com.example.type.benchEvent', '0.1.0'))(
+  Schema.Struct({
+    name: Schema.optional(Schema.String),
+    kind: Schema.optional(Schema.String),
+    day: Schema.optional(Schema.Number),
+    organizer: Schema.optional(Ref.Ref(TestSchema.Person)),
+  }),
+) {}
+
+const TYPES = [BenchTask, BenchNote, BenchEvent, TestSchema.Person, TestSchema.Organization];
+const TOTAL_OBJECTS = TASK_COUNT + NOTE_COUNT + EVENT_COUNT + ORG_COUNT + PERSON_COUNT;
+const NOTE_BODY = 'lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt. '.repeat(
+  11,
+);
+
+const taskIndices = Array.from({ length: TASK_COUNT }, (unusedValue, index) => index);
+const priorityOf = (index: number) => (index % PRIORITY_LEVELS) + 1;
+const assigneeOf = (index: number) => index % PERSON_COUNT;
+const eventKindOf = (index: number) => EVENT_KINDS[index % EVENT_KINDS.length];
+const matchingIndices = taskIndices.filter((index) => priorityOf(index) === TARGET_PRIORITY);
+const EXPECTED_MATCHES = matchingIndices.length;
+// Distinct assignees of the matching tasks: with 50 persons and 5 priorities that is 10, not 50.
+const EXPECTED_ASSIGNEES = new Set(matchingIndices.map(assigneeOf)).size;
+const EXPECTED_EVENT_MATCHES = Array.from({ length: EVENT_COUNT }, (unusedValue, index) => index).filter(
+  (index) => eventKindOf(index) === TARGET_EVENT_KIND,
+).length;
+
+type QueryShape = {
+  label: string;
+  query: Query.Any;
+  expected: number;
+  /** The typename whose host trace the shape's reactive run leaves behind. */
+  traceType: string;
+};
+
+const typeQuery = Query.select(Filter.type(BenchTask));
+const propertyQuery = Query.select(Filter.type(BenchTask, { priority: Filter.eq(TARGET_PRIORITY) }));
+const referenceQuery = Query.select(Filter.type(BenchTask, { priority: Filter.eq(TARGET_PRIORITY) })).reference(
+  'assignee',
+);
+const orderQuery = Query.select(Filter.type(BenchTask)).orderBy(Order.property('priority', 'desc')).limit(ORDER_LIMIT);
+const eventKindQuery = Query.select(Filter.type(BenchEvent, { kind: Filter.eq(TARGET_EVENT_KIND) }));
+const unionQuery = Query.all(Query.select(Filter.type(BenchNote)), Query.select(Filter.type(TestSchema.Organization)));
+
+const SHAPES: QueryShape[] = [
+  { label: 'type', query: typeQuery, expected: TASK_COUNT, traceType: Type.getTypename(BenchTask) },
+  {
+    label: 'type + property',
+    query: propertyQuery,
+    expected: EXPECTED_MATCHES,
+    traceType: Type.getTypename(BenchTask),
+  },
+  {
+    label: 'reference traversal',
+    query: referenceQuery,
+    expected: EXPECTED_ASSIGNEES,
+    traceType: Type.getTypename(BenchTask),
+  },
+  { label: 'order + limit', query: orderQuery, expected: ORDER_LIMIT, traceType: Type.getTypename(BenchTask) },
+  {
+    label: 'type + string property',
+    query: eventKindQuery,
+    expected: EXPECTED_EVENT_MATCHES,
+    traceType: Type.getTypename(BenchEvent),
+  },
+  {
+    label: 'union of two types',
+    query: unionQuery,
+    expected: NOTE_COUNT + ORG_COUNT,
+    traceType: Type.getTypename(BenchNote),
+  },
+];
+
+const warmStoragePath = createTmpPath();
+const coldStoragePath = createTmpPath();
+process.once('exit', () => {
+  for (const path of [warmStoragePath, coldStoragePath]) {
+    for (const suffix of ['', '-wal', '-shm']) {
+      try {
+        rmSync(`${path}${suffix}`, { force: true });
+      } catch {
+        // Best-effort: EchoTestBuilder.close() is async and can't run from a sync exit handler.
+      }
+    }
+  }
+});
+
+// `--expose-gc` is a startup flag vitest's workers do not carry; setting it at runtime and pulling `gc`
+// out of a fresh context is the documented way to get it after startup.
+v8.setFlagsFromString('--expose_gc');
+const exposedGc: unknown = vm.runInNewContext('gc');
+const forceGc = (): void => {
+  if (typeof exposedGc !== 'function') {
+    throw new Error('gc() is not exposed');
+  }
+  exposedGc();
+};
+
+/** Row and memory-pass errors, printed from `afterAll`; tinybench and a failing hook otherwise hide them. */
+const failures: string[] = [];
+
+/** A macrotask turn, so finalization registry callbacks and freed handles settle before sampling. */
+const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
+
+type MemoryRow = {
+  label: string;
+  /** Heap in use after a collection, before the measured work (bytes). */
+  baselineHeap: number;
+  /** Highest sampled heap during the work, over the baseline (bytes). */
+  peakHeapDelta: number;
+  /** Heap still in use after the work and a collection, over the baseline (bytes). */
+  retainedHeapDelta: number;
+  /** Same two deltas for the process RSS, which also carries SQLite's own memory and Automerge's WASM heap. */
+  peakRssDelta: number;
+  retainedRssDelta: number;
+};
+
+/** Resolves to nothing when `work` throws, so the remaining measurements and the table still run. */
+const measureMemory = async (label: string, work: () => Promise<void>): Promise<MemoryRow | undefined> => {
+  forceGc();
+  await settle();
+  const before = process.memoryUsage();
+  let peakHeap = before.heapUsed;
+  let peakRss = before.rss;
+  const sample = () => {
+    peakHeap = Math.max(peakHeap, v8.getHeapStatistics().used_heap_size);
+    peakRss = Math.max(peakRss, process.memoryUsage.rss());
+  };
+  const timer = setInterval(sample, MEMORY_SAMPLE_INTERVAL_MS);
+  try {
+    await work();
+  } catch (error) {
+    failures.push(`memory pass, ${label}: ${error instanceof Error ? error.message : String(error)}`);
+    return undefined;
+  } finally {
+    clearInterval(timer);
+  }
+  sample();
+  forceGc();
+  await settle();
+  const after = process.memoryUsage();
+  return {
+    label,
+    baselineHeap: before.heapUsed,
+    peakHeapDelta: peakHeap - before.heapUsed,
+    retainedHeapDelta: after.heapUsed - before.heapUsed,
+    peakRssDelta: peakRss - before.rss,
+    retainedRssDelta: after.rss - before.rss,
+  };
+};
+
+const megabytes = (bytes: number): string => `${(bytes / 1_048_576).toFixed(1).padStart(8)} MB`;
+
+const builder = await new EchoTestBuilder().open();
+
+type Seeded = {
+  peer: EchoTestPeer;
+  db: EchoDatabase;
+};
+
+const seed = async (storagePath: string): Promise<Seeded> => {
+  const peer = await builder.createPeer({ types: TYPES, storagePath });
+  const db = await peer.createDatabase();
+  const persons = Array.from({ length: PERSON_COUNT }, (unusedValue, index) =>
+    db.add(Obj.make(TestSchema.Person, { name: `person-${index}`, username: `user${index}` })),
+  );
+  for (let index = 0; index < ORG_COUNT; index++) {
+    db.add(Obj.make(TestSchema.Organization, { name: `org-${index}`, properties: { region: `region-${index % 7}` } }));
+  }
+  // Seeding dominates a large run and the RPC behind `flush` times out at 30 s, so the log shows where
+  // the per-flush cost goes as the store grows.
+  let added = 0;
+  let slowestFlush = 0;
+  const phaseStart = performance.now();
+  const addBatched = async (object: Obj.Any) => {
+    db.add(object);
+    if (++added % SEED_BATCH_SIZE === 0) {
+      const flushStart = performance.now();
+      await db.flush();
+      slowestFlush = Math.max(slowestFlush, performance.now() - flushStart);
+    }
+    if (added % SEED_PROGRESS_EVERY === 0) {
+      const elapsed = (performance.now() - phaseStart) / 1000;
+      // eslint-disable-next-line no-console
+      console.log(
+        `seed: ${added} objects, ${elapsed.toFixed(0)} s, slowest flush in window ${slowestFlush.toFixed(0)} ms`,
+      );
+      slowestFlush = 0;
+    }
+  };
+  for (let index = 0; index < TASK_COUNT; index++) {
+    await addBatched(
+      Obj.make(BenchTask, {
+        title: `task-${index}`,
+        description: `description of task ${index}`,
+        priority: priorityOf(index),
+        assignee: Ref.make(persons[assigneeOf(index)]),
+      }),
+    );
+  }
+  for (let index = 0; index < NOTE_COUNT; index++) {
+    await addBatched(
+      Obj.make(BenchNote, {
+        title: `note-${index}`,
+        body: NOTE_BODY,
+        tags: [`tag-${index % 13}`, `tag-${index % 29}`],
+      }),
+    );
+  }
+  for (let index = 0; index < EVENT_COUNT; index++) {
+    await addBatched(
+      Obj.make(BenchEvent, {
+        name: `event-${index}`,
+        kind: eventKindOf(index),
+        day: index % 30,
+        organizer: Ref.make(persons[index % PERSON_COUNT]),
+      }),
+    );
+  }
+  await db.flush({ indexes: true });
+  return { peer, db };
+};
+
+const seedStart = performance.now();
+const warm = await seed(warmStoragePath);
+const seedTime = performance.now() - seedStart;
+writeFileSync(coldStoragePath, await warm.peer.exportSqliteDatabase());
+const coldPeer = await builder.createPeer({ types: TYPES, storagePath: coldStoragePath });
+const cold: Seeded = { peer: coldPeer, db: await coldPeer.openLastDatabase() };
+forceGc();
+await settle();
+const afterSeed = process.memoryUsage();
+
+let checksum = 0;
+const phaseSamples: Record<string, number[]> = {};
+const record = (phase: string, value: number) => {
+  (phaseSamples[phase] ??= []).push(value);
+};
+
+const runExpecting = async (db: EchoDatabase, shape: QueryShape): Promise<unknown[]> => {
+  const results = await db.query(shape.query).run();
+  if (results.length !== shape.expected) {
+    throw new Error(`${shape.label}: expected ${shape.expected} results, got ${results.length}`);
+  }
+  return results;
+};
+
+type FirstResult<T> = { value: T; unsubscribe: () => void };
+
+/**
+ * Opens a reactive query and resolves on its first non-empty result with whatever `read` takes from
+ * it while the query is still active; the caller unsubscribes. Subscribing without `fire` means the
+ * callback runs only once the host has executed the query.
+ */
+const awaitFirstResult = <T>(
+  db: EchoDatabase,
+  query: Query.Any,
+  read: (result: QueryResult.QueryResult<unknown>) => T,
+): Promise<FirstResult<T>> =>
+  new Promise<FirstResult<T>>((resolve, reject) => {
+    let unsubscribe: (() => void) | undefined;
+    let settled = false;
+    const timer = setTimeout(() => {
+      if (!settled) {
+        settled = true;
+        unsubscribe?.();
+        reject(new Error(`No reactive result within ${FIRST_RESULT_TIMEOUT_MS} ms`));
+      }
+    }, FIRST_RESULT_TIMEOUT_MS);
+    unsubscribe = db.query(query).subscribe((result) => {
+      if (settled || result.results.length === 0) {
+        return;
+      }
+      settled = true;
+      clearTimeout(timer);
+      // The teardown is left to the caller: unsubscribing here runs inside the query's own `changed`
+      // emission, where a throw is routed to the context's error handler instead of this promise.
+      resolve({ value: read(result), unsubscribe: () => unsubscribe?.() });
+    });
+  });
+
+// The client caches `QueryResult` instances by query AST and fires a subscriber only when the result
+// set changes, so re-subscribing to an identical query after the first sample would never fire. A
+// limit above the result count changes the AST without changing the result, so every sample opens a
+// fresh reactive query and a fresh host execution.
+let reactiveCounter = 0;
+const distinctPropertyQuery = (): Query.Any => propertyQuery.limit(TASK_COUNT + 1 + reactiveCounter++);
+
+type TraceRow = {
+  label: string;
+  objectCount: number;
+  documentsLoaded: number;
+  indexHits: number;
+  executionTime: number;
+  documentLoadTime: number;
+};
+
+const sumTrace = (trace: ExecutionTrace, field: 'documentsLoaded' | 'indexHits' | 'documentLoadTime'): number =>
+  trace[field] + trace.children.reduce((sum, child) => sum + sumTrace(child, field), 0);
+
+// A root trace without a stamped start reads its duration from epoch zero; the step traces under it are
+// stamped, so their sum is the comparable figure.
+const executionTimeOf = (trace: ExecutionTrace): number =>
+  trace.beginTs === 0 && trace.children.length > 0
+    ? trace.children.reduce((sum, child) => sum + child.executionTime, 0)
+    : trace.executionTime;
+
+/**
+ * Runs each query shape as a reactive query on the warm peer and reads the host's trace of that run
+ * while the query is still registered (traces are kept only for active queries).
+ */
+const collectTraces = async ({ peer, db }: Seeded): Promise<TraceRow[]> => {
+  const rows: TraceRow[] = [];
+  for (const shape of SHAPES) {
+    const { value: trace, unsubscribe } = await awaitFirstResult(db, shape.query, () =>
+      peer.host.queryService
+        .getQueryTraces()
+        .filter((candidate) => candidate.details.includes(shape.traceType))
+        .sort((left, right) => right.endTs - left.endTs)
+        .at(0),
+    );
+    unsubscribe();
+    if (!trace) {
+      throw new Error(`${shape.label}: no host trace found`);
+    }
+    rows.push({
+      label: shape.label,
+      objectCount: trace.objectCount,
+      documentsLoaded: sumTrace(trace, 'documentsLoaded'),
+      indexHits: sumTrace(trace, 'indexHits'),
+      executionTime: executionTimeOf(trace),
+      documentLoadTime: sumTrace(trace, 'documentLoadTime'),
+    });
+  }
+  return rows;
+};
+
+const collectMemory = async (): Promise<MemoryRow[]> => {
+  const rows: (MemoryRow | undefined)[] = [];
+  for (const shape of SHAPES) {
+    rows.push(
+      await measureMemory(`warm: ${shape.label} x${MEMORY_ITERATIONS}`, async () => {
+        for (let iteration = 0; iteration < MEMORY_ITERATIONS; iteration++) {
+          checksum += (await runExpecting(warm.db, shape)).length;
+        }
+      }),
+    );
+  }
+  rows.push(
+    await measureMemory('cold: reload + open + run type + property', async () => {
+      await cold.peer.reload();
+      cold.db = await cold.peer.openLastDatabase();
+      const queryStart = performance.now();
+      let results = await cold.db.query(propertyQuery).run();
+      for (let retry = 0; results.length !== EXPECTED_MATCHES && retry < SHORT_RESULT_RETRIES; retry++) {
+        results = await cold.db.query(propertyQuery).run();
+      }
+      record('cold run type + property, memory pass (to a full result set)', performance.now() - queryStart);
+      checksum += results.length;
+    }),
+  );
+  rows.push(
+    await measureMemory('cold: then run type (all tasks)', async () => {
+      checksum += (await runExpecting(cold.db, SHAPES[0])).length;
+    }),
+  );
+  return rows.filter((row) => row !== undefined);
+};
+
+afterAll(async () => {
+  blackhole(checksum);
+  const header = `N=${TASK_COUNT} tasks, ${TOTAL_OBJECTS} objects per peer${EXECUTOR_LABEL ? `, executor=${EXECUTOR_LABEL}` : ''}`;
+
+  const traceRows = await collectTraces(warm);
+  const traceLines = traceRows.map(
+    (row) =>
+      `${row.label.padEnd(24)} objects ${String(row.objectCount).padStart(6)}   docsLoaded ${String(row.documentsLoaded).padStart(6)}   indexHits ${String(row.indexHits).padStart(6)}   exec ${row.executionTime.toFixed(1).padStart(8)} ms   docLoad ${row.documentLoadTime.toFixed(1).padStart(8)} ms`,
+  );
+  // eslint-disable-next-line no-console
+  console.log(`\nHost traces (reactive query, first run; ${header}):\n${traceLines.join('\n')}\n`);
+
+  const memoryRows = await collectMemory();
+  const memoryLines = memoryRows.map(
+    (row) =>
+      `${row.label.padEnd(44)} baseline heap ${megabytes(row.baselineHeap)}   peak heap +${megabytes(row.peakHeapDelta)}   retained heap ${row.retainedHeapDelta < 0 ? '-' : '+'}${megabytes(Math.abs(row.retainedHeapDelta))}   peak rss +${megabytes(row.peakRssDelta)}   retained rss ${row.retainedRssDelta < 0 ? '-' : '+'}${megabytes(Math.abs(row.retainedRssDelta))}`,
+  );
+  // eslint-disable-next-line no-console
+  console.log(
+    `\nMemory (${header}; seed ${(seedTime / 1000).toFixed(1)} s, after seed + gc: heap ${megabytes(afterSeed.heapUsed)}, rss ${megabytes(afterSeed.rss)}, external ${megabytes(afterSeed.external)}):\n${memoryLines.join('\n')}\n`,
+  );
+
+  const phaseLines = Object.entries(phaseSamples).map(([phase, samples]) => {
+    const sorted = [...samples].sort((left, right) => left - right);
+    const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
+    return `${phase.padEnd(52)} mean ${mean.toFixed(1).padStart(8)}   min ${sorted[0].toFixed(1).padStart(8)}   max ${sorted[sorted.length - 1].toFixed(1).padStart(8)}   n=${samples.length}`;
+  });
+  if (phaseLines.length > 0) {
+    // eslint-disable-next-line no-console
+    console.log(`\nPhase timings (measured inside the cold rows, ms unless noted):\n${phaseLines.join('\n')}\n`);
+  }
+  if (failures.length > 0) {
+    // eslint-disable-next-line no-console
+    console.log(`\nRow failures:\n${failures.join('\n')}\n`);
+  }
+
+  await builder.close();
+}, 600_000);
+
+describe(
+  `query executor (N=${TASK_COUNT}${EXECUTOR_LABEL ? `, ${EXECUTOR_LABEL}` : ''})`,
+  { tags: ['manual'], timeout: 1_200_000 },
+  () => {
+    for (const shape of SHAPES) {
+      bench(
+        `run: ${shape.label}`,
+        async () => {
+          const results = await runExpecting(warm.db, shape);
+          checksum += results.length;
+        },
+        WARM_OPTIONS,
+      );
+    }
+
+    bench(
+      'reactive first result (type + property)',
+      async () => {
+        const { value: count, unsubscribe } = await awaitFirstResult(
+          warm.db,
+          distinctPropertyQuery(),
+          (result) => result.results.length,
+        );
+        unsubscribe();
+        if (count !== EXPECTED_MATCHES) {
+          throw new Error(`reactive: expected ${EXPECTED_MATCHES} results, got ${count}`);
+        }
+        checksum += count;
+      },
+      WARM_OPTIONS,
+    );
+
+    bench(
+      'cold: reload + open + run type + property',
+      async () => {
+        const reloadStart = performance.now();
+        await cold.peer.reload();
+        const db = await cold.peer.openLastDatabase();
+        cold.db = db;
+        record('reload + open', performance.now() - reloadStart);
+
+        // A query straight after a reload can come back short if the index is not yet complete. A short
+        // result is re-run and counted so the row keeps its samples and the report shows how often it happened.
+        const queryStart = performance.now();
+        try {
+          let results = await db.query(propertyQuery).run();
+          for (let retry = 0; results.length !== EXPECTED_MATCHES && retry < SHORT_RESULT_RETRIES; retry++) {
+            record('short cold result, re-ran (value = results returned)', results.length);
+            results = await db.query(propertyQuery).run();
+          }
+          record('cold run type + property (to a full result set)', performance.now() - queryStart);
+          if (results.length !== EXPECTED_MATCHES) {
+            throw new Error(`cold: expected ${EXPECTED_MATCHES} results, got ${results.length}`);
+          }
+          checksum += results.length;
+        } catch (error) {
+          // tinybench keeps a failed task's error to itself and vitest prints the row without samples.
+          record('cold run FAILED (value = ms until the error)', performance.now() - queryStart);
+          failures.push(`cold run: ${error instanceof Error ? error.message : String(error)}`);
+          throw error;
+        }
+      },
+      COLD_OPTIONS,
+    );
+  },
+);
```

`BENCHMARKS.md` records the actual runs, not just the harness. It walks through four dated runs: an initial memory-vs-sql comparison that found a real regression in outgoing reference traversal (17× slower on SQL), a re-run after the fix that pins index seeks (`c5294281`) showing every SQL row now beats memory, a confirmation run after the in-memory executor was deleted, and a final rewrite (`3f17ac76`) adding mixed types, memory sampling, and a scale-up to N=5,000 that exposes where the memory executor fails outright on a cold, large result set. Each section states the reading precisely: what host-side saving the trace shows, and how much of the client-visible latency is document hydration that both paths still pay.

````diff file=packages/core/echo/echo-client-e2e/BENCHMARKS.md lines=667-1089
@@ -667,3 +667,423 @@ even that is not enough to resolve a ten-percent effect on a 300 ms window under

 What can be said: reads remain in the tens of nanoseconds and flat in object width, and nothing moved
 enough to suggest the shared handler cost anything. Stage E's case is the deletion, not a number.
+
+---
+
+# Query executor: memory vs sql — `src/query-executor.bench.ts`
+
+The same query workload under the host's two query executors, side by side in one process. The `memory`
+column is the in-memory executor, which loads every candidate document from the Automerge repo and
+evaluates the plan in JS; the `sql` executor compiles the plan into one SQLite statement over the index tables
+and loads no documents. Both ship: `memory` is the default and `sql` is selected with
+`DX_ECHO_QUERY_EXECUTOR=sql`, so either column can be reproduced by setting that variable. The earliest runs
+below built one peer per mode in a single process, which the harness no longer does; a run now measures the
+one mode it was given. Run with:
+
+```bash
+DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run query-executor --outputJson /tmp/query-executor.json
+```
+
+`--outputJson` matters: vitest 4's bench reporter prints its per-row table only on a TTY, so a logged run
+shows the `BENCH Summary` ratios and nothing else. `QUERY_EXECUTOR_BENCH_COUNT` overrides N (default 2,000).
+
+**Data.** Per peer, N tasks of a bench-local `BenchTask` type (`title`, `description`, `priority`, `assignee`
+ref) and 50 `TestSchema.Person`. `TestSchema.Task` has no numeric field to filter and order on, hence the
+local type; every field is optional, as in `TestSchema`, because `Filter.eq(n)` is a `Filter<number |
+undefined>` and the typed props overload of `Filter.type` only accepts it against an optional field.
+Priority cycles 1..5 and task _i_ is assigned to person _i_ mod 50, so `priority = 3` matches 400 tasks whose
+assignees are 10 distinct persons. Objects are added in batches of 200 with a flush per batch and a final
+`flush({ indexes: true })` before any row runs.
+
+**Rows** (per mode in the recorded runs):
+
+- `run: type` — `Query.select(Filter.type(BenchTask)).run()`, 2,000 results.
+- `run: type + property` — `Filter.type(BenchTask, { priority: Filter.eq(3) })`, 400 results.
+- `run: reference traversal` — the type + property query `.reference('assignee')`, 10 results.
+- `run: order + limit` — `Filter.type(BenchTask)` ordered by `priority desc`, `limit(20)`, 20 results.
+- `reactive first result` — subscribe a reactive query for type + property, wait for the first non-empty
+  result, unsubscribe. Each sample uses a distinct `.limit(n > N)` so the AST differs: the client caches
+  `QueryResult` by AST and fires a subscriber only when the result set changes, so re-subscribing to the
+  identical query never fires a second time.
+- `cold: reload + open + run type + property` — a file-backed peer is reloaded, its database
+  reopened, and the type + property query run once; the reload is inside the timed body (no per-iteration
+  hooks in `bench()`), so the query-only phase is also timed inside the row and printed from `afterAll`. 3
+  samples + 1 warm-up. A short result (the index source's 2 s per-object load budget) would be re-run and
+  counted; none occurred in this run.
+
+Every `run:` row checks its result count and throws on a mismatch, so a row that reports a number returned
+the full set.
+
+## `f261daf7` (dirty tree) — 2026-09-17 — N = 2,000
+
+Node 22.22.2. The bench file is as committed; the tree carries uncommitted changes to `echo-host`,
+`echo-client` and `index-core`. Warm rows: 1 s window, 3 warm-up iterations. Means ± rme, sample count in
+parentheses.
+
+| row                                         |                memory |                   sql |            sql vs memory |
+| ------------------------------------------- | --------------------: | --------------------: | -----------------------: |
+| `run: type` (2,000 results)                 |   294.9 ms ±7.1% (10) |   178.3 ms ±2.6% (10) |                    1.65× |
+| `run: type + property` (400)                |   172.8 ms ±2.3% (10) |    67.6 ms ±2.7% (15) |                    2.56× |
+| `run: reference traversal` (10)             |   192.4 ms ±4.3% (10) | 3,245.5 ms ±6.8% (10) | **0.06×** (16.9× slower) |
+| `run: order + limit` (20)                   |   107.7 ms ±2.9% (10) |    13.0 ms ±2.3% (77) |                    8.28× |
+| `reactive first result` (400)               |   137.8 ms ±1.8% (10) |    41.6 ms ±2.3% (25) |                    3.31× |
+| `cold: reload + open + run type + property` | 7,070.6 ms ±46.6% (3) | 2,311.3 ms ±41.7% (3) |                    3.06× |
+
+Cold phases, timed inside the row (n = 4 including the warm-up; min in parentheses):
+
+| phase                            |           memory |              sql |
+| -------------------------------- | ---------------: | ---------------: |
+| reload + open                    |     811 ms (479) |     596 ms (322) |
+| run type + property, first, cold | 7,114 ms (5,074) | 1,863 ms (1,744) |
+
+### Host traces
+
+Read from `peer.host.queryService.getQueryTraces()` after the first result of a reactive query for each
+shape, on the warm peers. `docsLoaded` and `indexHits` are summed over the trace tree; `exec` is the root
+trace's `executionTime` on the sql path and the sum of the step traces on the memory path, because the
+memory path's root trace is created with `beginTs: 0` and its own `executionTime` reads as the process
+uptime (~290 s in this run).
+
+| mode   | query               | objects | docsLoaded | indexHits |       exec | of which doc load |
+| ------ | ------------------- | ------: | ---------: | --------: | ---------: | ----------------: |
+| memory | type                |   2,000 |      2,000 |     2,000 |   104.5 ms |           64.7 ms |
+| memory | type + property     |     400 |      2,000 |     2,000 |   103.0 ms |           60.7 ms |
+| memory | reference traversal |     400 |      2,000 |     2,000 |   117.5 ms |           77.9 ms |
+| memory | order + limit       |      20 |      2,000 |     2,000 |   101.6 ms |           58.0 ms |
+| sql    | type                |   2,000 |          0 |     2,000 |    13.6 ms |                 0 |
+| sql    | type + property     |     400 |          0 |       400 |     7.6 ms |                 0 |
+| sql    | reference traversal |      10 |          0 |        10 | 3,135.6 ms |                 0 |
+| sql    | order + limit       |      20 |          0 |        20 |     9.8 ms |                 0 |
+
+The memory path's `objects` for the traversal is the host's working set before the client dedupes it (400
+task → assignee hops onto 10 persons); the sql statement groups by target and returns 10.
+
+### Reading
+
+- **The host no longer loads documents on the sql path.** `docsLoaded` is 0 for every shape; on the memory
+  path it is 2,000 for every shape — including the 400-result property filter and the 20-result
+  `order + limit`, because the memory executor's type selector returns all 2,000 index hits, loads each
+  document, and applies the predicate, order and limit in JS. The sql path's `indexHits` of 400 and 20 show
+  the predicate and the limit moved into the statement. Host execution goes from ~100–118 ms (of which
+  58–78 ms is document loading) to 8–14 ms.
+- **What the client sees is smaller than what the host saved, in proportion to the result size.** `run:
+type` returns 2,000 objects and improves 295 → 178 ms: the host's ~90 ms saving is a third of the row, and
+  the rest is the client hydrating 2,000 result objects from their documents, which both modes pay. `order
+  - limit` returns 20 objects and improves 108 → 13 ms (8×), because the memory path still loaded 2,000
+    documents to sort 20. Type + property (400 objects) sits between at 2.6×, and the reactive first result
+    for the same query at 3.3× (138 → 42 ms).
+- **Outgoing reference traversal is 17× slower on the sql path**: 3.2 s against 192 ms, and the host trace
+  places all of it in the statement (`exec` 3,136 ms, no document loads, 10 hits). The compiled traversal
+  joins each source row's `objectData` body through `json_each`, then joins `objectMeta` on the URI split
+  into space and local id by `CASE`/`substr` expressions (`compile.ts`, `#compileTraverse`), so 400 source
+  rows are matched against 2,050 `objectMeta` rows on computed columns. Whether the planner can use the
+  `(spaceId, objectId)` index against those expressions is what `EXPLAIN QUERY PLAN` would show; this run
+  did not capture it (the executor's `DX_TRACE_QUERY_EXECUTION` switch is read from `import.meta.env`,
+  which vitest does not populate from `DX_` variables). The cause was established afterwards and fixed in
+  `c5294281`; see the re-run below.
+- **Cold, the sql path is 3× faster but still pays the client's loads**: 2.3 s against 7.1 s inclusive of
+  the reload, 1.86 s against 7.1 s for the query alone. On the memory path the host loads all 2,000 documents
+  from disk before filtering; on the sql path the host loads none, and the 1.7–2.0 s is the reload-heavy
+  client hydrating 400 results. Cold rows carry ±40–47% rme from 3 samples that include one slow first reload;
+  read the min alongside the mean. No cold query came back short in either mode.
+
+### Harness notes
+
+- Unsubscribing from inside a `subscribe` callback hung the first run indefinitely: the callback runs inside
+  the query's own `changed` emission, where a throw from `unsubscribe()` → `_stop()` is routed to the
+  context's error handler rather than the caller, so the bench's promise never settled. The bench resolves
+  from the callback and unsubscribes from the awaiting code.
+- The memory-mode warm rows take ~300 ms per iteration; tinybench's default 16 warm-up iterations added
+  ~5 s per row, so the rows cap warm-up at 3.
+
+## `c5294281` — 2026-09-17 — N = 2,000, re-run after the index pins
+
+Same harness, same Node 22.22.2, same N. The only code change between the runs is `c5294281`, which pins
+the index seeks the compiled statements depend on (`INDEXED BY` on the working-set and traversal joins,
+`NOT INDEXED` on the `objectMeta` metadata joins, children as a `UNION ALL` of two seeks, and the strong
+dependency recursion per union branch). The tree is clean at this commit apart from this file.
+
+| row                                         |                memory |                   sql | sql vs memory |
+| ------------------------------------------- | --------------------: | --------------------: | ------------: |
+| `run: type` (2,000 results)                 |   285.5 ms ±2.1% (10) |   168.4 ms ±2.5% (10) |         1.70× |
+| `run: type + property` (400)                |   163.9 ms ±0.9% (10) |    59.4 ms ±1.4% (17) |         2.76× |
+| `run: reference traversal` (10)             |   197.0 ms ±2.0% (10) |    41.8 ms ±1.4% (24) |         4.71× |
+| `run: order + limit` (20)                   |   120.0 ms ±1.6% (10) |    10.7 ms ±3.3% (95) |        11.26× |
+| `reactive first result` (400)               |   151.1 ms ±2.3% (10) |    41.0 ms ±4.5% (25) |         3.69× |
+| `cold: reload + open + run type + property` | 7,071.8 ms ±40.5% (3) | 2,300.8 ms ±39.7% (3) |         3.07× |
+
+Cold phases, timed inside the row (n = 4 including the warm-up; min in parentheses):
+
+| phase                            |           memory |              sql |
+| -------------------------------- | ---------------: | ---------------: |
+| reload + open                    |     756 ms (514) |     356 ms (294) |
+| run type + property, first, cold | 7,347 ms (5,229) | 2,108 ms (1,767) |
+
+### Host traces
+
+Same method as the first run.
+
+| mode   | query               | objects | docsLoaded | indexHits |     exec | of which doc load |
+| ------ | ------------------- | ------: | ---------: | --------: | -------: | ----------------: |
+| memory | type                |   2,000 |      2,000 |     2,000 | 114.5 ms |           73.0 ms |
+| memory | type + property     |     400 |      2,000 |     2,000 | 112.3 ms |           70.1 ms |
+| memory | reference traversal |     400 |      2,000 |     2,000 | 135.0 ms |           94.1 ms |
+| memory | order + limit       |      20 |      2,000 |     2,000 | 118.1 ms |           71.4 ms |
+| sql    | type                |   2,000 |          0 |     2,000 |  12.3 ms |                 0 |
+| sql    | type + property     |     400 |          0 |       400 |   7.1 ms |                 0 |
+| sql    | reference traversal |      10 |          0 |        10 |  15.0 ms |                 0 |
+| sql    | order + limit       |      20 |          0 |        20 |   7.7 ms |                 0 |
+
+### Reading
+
+- **The traversal regression is gone: 3,136 ms → 15 ms in the statement, 3.2 s → 42 ms end to end.**
+  `EXPLAIN QUERY PLAN` on the first run's statement (captured afterwards with a standalone script against
+  the bench database) showed two mis-picks by SQLite's planner, which has no `ANALYZE` statistics to work
+  from: the traversal target lookup ran `SEARCH t USING INDEX idx_object_index_queuePosition (queueId=?)`,
+  a scan of every non-queue row per source row, and the strong-dependency recursion seeded from a full
+  `objectMeta` scan. With the `(spaceId, queueId, objectId)` index pinned on the join and the working set
+  driving the recursion, the plan is one seek per source row. `explain.test.ts` now asserts this plan shape
+  so a planner regression fails a unit test rather than a benchmark.
+- **The other sql rows moved by a few percent, within the noise of a single run**, except `order + limit`,
+  which is 13.0 → 10.7 ms; the `NOT INDEXED` hint on the metadata joins removes an index probe per result
+  row there as well. The memory rows are unchanged within rme (the memory executor is not touched by
+  `c5294281`).
+- **Every sql row is now faster than its memory counterpart**, from 1.7× on the 2,000-result type query,
+  where the client's hydration of the result objects dominates and both modes pay it, to 11× on
+  `order + limit`, where the memory path still loads 2,000 documents to return 20. The sql host executes
+  every shape in 7–15 ms with no document loads; the memory host takes 112–135 ms, 70–94 ms of it loading
+  documents.
+
+## `fd6e6782` — 2026-09-17 — N = 2,000, sql only, after the in-memory executor was deleted
+
+A confirmation run of the collapsed harness, to check that the deletion changed nothing on the surviving
+path. Every row is within the noise of the `c5294281` sql column; host traces are unchanged (0 documents
+loaded, 6–12 ms per shape).
+
+| row                                         |                   sql |
+| ------------------------------------------- | --------------------: |
+| `run: type` (2,000 results)                 |   167.3 ms ±3.8% (10) |
+| `run: type + property` (400)                |    61.3 ms ±2.1% (17) |
+| `run: reference traversal` (10)             |    44.0 ms ±1.8% (23) |
+| `run: order + limit` (20)                   |   10.1 ms ±1.5% (100) |
+| `reactive first result` (400)               |    37.1 ms ±1.6% (27) |
+| `cold: reload + open + run type + property` | 2,086.5 ms ±18.0% (3) |
+
+## `3f17ac76` — 2026-09-17 — mixed types, memory sampling, N = 2,000 and N = 5,000
+
+The bench was rewritten (`3f17ac76`) to answer three questions the runs above leave open: what the
+executors cost in memory, how they behave when the queried type is a minority of the store, and how they
+scale. The memory column here comes from the `c5294281` executor written into the working tree of
+`3f17ac76` for the run (the sql code is identical in both), selected with `DX_ECHO_QUERY_EXECUTOR=memory`;
+each mode runs in its own process, so the memory figures are not contaminated by the other mode.
+
+**Population**, per peer: N `BenchTask`, N/2 `BenchNote` (~1 KB `body`, two tags), N/2 `BenchEvent`
+(`kind` cycling meeting/call/deadline, `day`, `organizer` ref), N/20 `TestSchema.Organization`, 50
+`TestSchema.Person`. At N = 2,000 that is 4,150 objects; the type query selects 48% of them, the event
+query 8%. Two new rows: `type + string property` (`Filter.type(BenchEvent, { kind: 'deadline' })`,
+N/6 results) and `union of two types` (`Query.all` of notes and organizations, N/2 + N/20 results).
+
+**Memory method.** From `afterAll`, after the timing rows: `gc()` (exposed at runtime via
+`v8.setFlagsFromString`), read `process.memoryUsage()`, run the shape 3× under a 1 ms sampler that
+records the highest `heapUsed` and `rss` seen, `gc()` again, read again. _Peak_ is the sampler's high
+water mark over the pre-run baseline; _retained_ is the post-collection reading over the baseline. The
+cold peer is then reloaded and the property query run under the same sampler, followed by the full type
+query on the same reloaded peer. The baseline heap printed for the first warm row is also the heap the
+timing rows left behind, since it follows them.
+
+### N = 2,000 (4,150 objects per peer)
+
+Seeding took 301 s per run in both modes (two peers; ~36 ms per object through `db.add` + batched
+flushes). Post-seed, collected: heap 504 MB in both modes; RSS 1,765 MB (memory) / 1,727 MB (sql),
+of which ~1,015 MB is `external` (Automerge's WASM heap and buffers for 8,300 documents across the two
+peers).
+
+| row                                         |                memory |                  sql | sql vs memory |
+| ------------------------------------------- | --------------------: | -------------------: | ------------: |
+| `run: type` (2,000 of 4,150)                |   277.9 ms ±2.6% (10) |  167.8 ms ±2.5% (10) |         1.66× |
+| `run: type + property` (400)                |   166.6 ms ±5.9% (10) |   62.3 ms ±1.2% (17) |         2.67× |
+| `run: reference traversal` (10)             |   191.3 ms ±2.7% (10) |   46.4 ms ±3.8% (22) |         4.12× |
+| `run: order + limit` (20)                   |   110.6 ms ±3.8% (10) |   10.8 ms ±2.6% (94) |        10.27× |
+| `run: type + string property` (333)         |   112.5 ms ±1.6% (10) |   56.8 ms ±1.8% (18) |         1.98× |
+| `run: union of two types` (1,100)           |   258.8 ms ±5.2% (10) |  200.0 ms ±3.0% (10) |         1.29× |
+| `reactive first result` (400)               |   147.4 ms ±2.0% (10) |   44.6 ms ±6.9% (23) |         3.31× |
+| `cold: reload + open + run type + property` | 6,538.6 ms ±32.9% (3) | 2,305.3 ms ±7.7% (3) |         2.84× |
+
+Host traces (first reactive run of each shape):
+
+| mode   | query                  | objects | docsLoaded | indexHits |     exec | of which doc load |
+| ------ | ---------------------- | ------: | ---------: | --------: | -------: | ----------------: |
+| memory | type                   |   2,000 |      2,000 |     2,000 | 106.7 ms |           64.7 ms |
+| memory | type + property        |     400 |      2,000 |     2,000 | 104.0 ms |           64.3 ms |
+| memory | reference traversal    |     400 |      2,000 |     2,000 | 125.4 ms |           84.2 ms |
+| memory | order + limit          |      20 |      2,000 |     2,000 | 105.4 ms |           62.2 ms |
+| memory | type + string property |     333 |      1,000 |     1,000 |  50.7 ms |           31.4 ms |
+| memory | union of two types     |   1,100 |      1,100 |     1,100 |  62.0 ms |           78.8 ms |
+| sql    | type                   |   2,000 |          0 |     2,000 |  12.2 ms |                 0 |
+| sql    | type + property        |     400 |          0 |       400 |   5.9 ms |                 0 |
+| sql    | reference traversal    |      10 |          0 |        10 |  11.8 ms |                 0 |
+| sql    | order + limit          |      20 |          0 |        20 |   7.2 ms |                 0 |
+| sql    | type + string property |     333 |          0 |       333 |   4.5 ms |                 0 |
+| sql    | union of two types     |   1,100 |          0 |     1,100 |  11.4 ms |                 0 |
+
+Memory (deltas over the pre-row collected baseline; the first row's baseline is the heap after the timing
+rows):
+
+| measurement                                 | memory: heap peak / retained | sql: heap peak / retained | memory: rss peak / retained | sql: rss peak / retained |
+| ------------------------------------------- | ---------------------------: | ------------------------: | --------------------------: | -----------------------: |
+| heap after the timing rows (baseline)       |                       731 MB |                    540 MB |                             |                          |
+| `warm: type` ×3                             |             +33.2 / −11.0 MB |          +53.4 / −11.1 MB |                 +0.5 / −0.5 |                    0 / 0 |
+| `warm: type + property` ×3                  |              +26.8 / −6.5 MB |           +19.8 / −6.9 MB |                       0 / 0 |                    0 / 0 |
+| `warm: reference traversal` ×3              |              +26.1 / −1.9 MB |           +13.7 / −2.0 MB |                       0 / 0 |                    0 / 0 |
+| `warm: order + limit` ×3                    |              +18.6 / −1.6 MB |            +9.5 / −1.8 MB |                       0 / 0 |                    0 / 0 |
+| `warm: type + string property` ×3           |              +21.9 / +2.6 MB |           +20.0 / +2.9 MB |                       0 / 0 |              +1.3 / +1.3 |
+| `warm: union of two types` ×3               |              +34.9 / +7.8 MB |           +59.4 / +7.6 MB |                       0 / 0 |                    0 / 0 |
+| `cold: reload + open + run type + property` |            +113.8 / +57.0 MB |          +90.4 / +11.8 MB |               +35.5 / +35.3 |              +3.9 / +1.6 |
+| `cold: then run type` (all 2,000 tasks)     |             +50.3 / +30.9 MB |         +221.8 / +74.6 MB |               +20.9 / +20.9 |              +6.3 / +5.7 |
+
+### Reading, N = 2,000
+
+- **The executor's memory cost is what stays resident, not what a query allocates.** The timing rows
+  leave the process at 731 MB of heap in memory mode against 540 MB in sql mode, from the same 504 MB
+  after seeding: about 190 MB the memory executor's document loads left behind in the repo cache, ~46
+  KB per document across 4,150. The warm peaks do not separate the modes; they are the client hydrating
+  the result objects and are within noise (or higher on sql) for every shape, with retained deltas of a
+  few MB either way because the warm peer already holds everything.
+- **The cold peer shows the same thing per query.** One 400-result property query after a reload
+  retains 57 MB of heap and 35 MB of RSS in memory mode (the host loaded all 2,000 task documents to
+  evaluate `priority = 3`), against 12 MB and 1.6 MB on sql (only the 400 hydrated results). The
+  follow-up `type` query inverts it: sql retains +75 MB because the client now hydrates 2,000 objects
+  for the first time, memory mode only +31 MB because the host's load already put them in the cache.
+  After both, heap converges (88 MB vs 87 MB) and RSS does not (56 MB vs 7 MB): the memory path's
+  cost is paid by the first query regardless of result size, and its WASM-side share never comes back.
+- **Speed over the mixed population matches the earlier runs.** The four original rows are within a
+  few percent of the `c5294281` results (1.7× / 2.7× / 4.1× / 10.3×), so the notes and events in the
+  store did not slow the task queries on either path: both start from the type index. The new
+  `type + string property` row is 2.0×, smaller than the numeric one because its memory-path cost
+  (1,000 event documents) is half.
+- **Union is the weakest sql row at 1.29×**, and the host trace says why: 11.4 ms in the statement, so
+  the remaining ~190 ms of the 200 ms is the client hydrating 1,100 results (550 of them 1 KB notes).
+  Same story as `run: type`: once the result set is large, the client dominates and the executor's
+  share of the row is small in both modes.
+
+### N = 5,000 (10,300 objects per peer), `ee130802` harness
+
+Two harness changes between this and the N = 2,000 tables, both forced by scale:
+
+- **The store is seeded once and cloned.** Seeding a second peer in the same process gets slower with
+  everything the first peer left resident, and its flushes reached the 30 s RPC timeout at this size:
+  one two-peer memory run passed with a 27.8 s worst flush, the next failed at 8,000 objects of the
+  second peer. The warm peer is now file-backed and seeded once (569 s memory run, 574 s sql run), and
+  the cold peer opens an `exportSqliteDatabase` copy of that file. The cold peer is therefore genuinely
+  cold: nothing of its store has been in this process before the row, where the two-peer harness had
+  created the documents in-process and reloaded, leaving the OS page cache and possibly more warm.
+- **The memory sampler runs at 10 ms** using `v8.getHeapStatistics()` and `process.memoryUsage.rss()`.
+  At 1 ms with `process.memoryUsage()` it ate enough of the event loop to push the client's 2 s
+  per-object load budget over on a cold 1,000-result hydration. Peaks are coarser than in the
+  N = 2,000 tables; retained figures are unaffected.
+
+Post-seed, collected: heap 629 MB (memory) / 628 MB (sql); RSS 2,231 MB / 2,085 MB, of which 1,286 MB /
+1,276 MB is `external`.
+
+| row                                         |              memory |                   sql | sql vs memory |
+| ------------------------------------------- | ------------------: | --------------------: | ------------: |
+| `run: type` (5,000 of 10,300)               | 678.7 ms ±2.4% (10) |   460.6 ms ±2.3% (10) |         1.47× |
+| `run: type + property` (1,000)              | 404.9 ms ±1.8% (10) |   159.2 ms ±4.9% (10) |         2.54× |
+| `run: reference traversal` (10)             | 469.8 ms ±0.8% (10) |   118.3 ms ±2.2% (10) |         3.97× |
+| `run: order + limit` (20)                   | 293.8 ms ±1.9% (10) |    19.0 ms ±2.0% (53) |        15.46× |
+| `run: type + string property` (833)         | 285.0 ms ±1.0% (10) |   150.5 ms ±5.1% (10) |         1.89× |
+| `run: union of two types` (2,750)           | 696.6 ms ±2.4% (10) |   496.3 ms ±6.2% (10) |         1.40× |
+| `reactive first result` (1,000)             | 359.5 ms ±2.7% (10) |   105.5 ms ±4.4% (10) |         3.41× |
+| `cold: reload + open + run type + property` |   failed, see below | 9,064.6 ms ±17.0% (3) |               |
+
+Cold phases, timed inside the row (n = 4 including the warm-up):
+
+| phase                            |                memory |                                     sql |
+| -------------------------------- | --------------------: | --------------------------------------: |
+| reload + open                    |              1,646 ms |                  1,926 ms (1,706–2,138) |
+| run type + property, first, cold | error after 31,965 ms | 9,715 ms (6,744–17,235), 1 short result |
+
+Host traces (first reactive run of each shape):
+
+| mode   | query                  | objects | docsLoaded | indexHits |     exec | of which doc load |
+| ------ | ---------------------- | ------: | ---------: | --------: | -------: | ----------------: |
+| memory | type                   |   5,000 |      5,000 |     5,000 | 319.6 ms |          205.1 ms |
+| memory | type + property        |   1,000 |      5,000 |     5,000 | 273.8 ms |          169.8 ms |
+| memory | reference traversal    |   1,000 |      5,000 |     5,000 | 336.6 ms |          228.6 ms |
+| memory | order + limit          |      20 |      5,000 |     5,000 | 270.9 ms |          162.1 ms |
+| memory | type + string property |     833 |      2,500 |     2,500 | 130.5 ms |           76.6 ms |
+| memory | union of two types     |   2,750 |      2,750 |     2,750 | 151.3 ms |          168.4 ms |
+| sql    | type                   |   5,000 |          0 |     5,000 |  37.6 ms |                 0 |
+| sql    | type + property        |   1,000 |          0 |     1,000 |  13.9 ms |                 0 |
+| sql    | reference traversal    |      10 |          0 |        10 |  24.8 ms |                 0 |
+| sql    | order + limit          |      20 |          0 |        20 |  16.0 ms |                 0 |
+| sql    | type + string property |     833 |          0 |       833 |   9.3 ms |                 0 |
+| sql    | union of two types     |   2,750 |          0 |     2,750 |  28.0 ms |                 0 |
+
+Memory (deltas over the pre-row collected baseline):
+
+| measurement                                 | memory: heap peak / retained | sql: heap peak / retained | memory: rss peak / retained | sql: rss peak / retained |
+| ------------------------------------------- | ---------------------------: | ------------------------: | --------------------------: | -----------------------: |
+| heap after the timing rows (baseline)       |                       874 MB |                    883 MB |                             |                          |
+| `warm: type` ×3                             |             +77.7 / −33.8 MB |          +47.7 / −33.6 MB |                 +3.1 / −0.6 |              +3.0 / +0.6 |
+| `warm: type + property` ×3                  |             +63.1 / −26.4 MB |           +21.9 / −2.0 MB |                 +1.1 / −1.1 |                    0 / 0 |
+| `warm: reference traversal` ×3              |              +59.4 / −4.1 MB |           +15.9 / −9.1 MB |                       0 / 0 |                    0 / 0 |
+| `warm: order + limit` ×3                    |              +41.7 / +0.1 MB |           +10.1 / −0.1 MB |                       0 / 0 |                    0 / 0 |
+| `warm: type + string property` ×3           |              +33.0 / +6.9 MB |           +25.0 / +7.2 MB |                       0 / 0 |                    0 / 0 |
+| `warm: union of two types` ×3               |             +66.5 / +18.6 MB |          +48.7 / +18.8 MB |                 +0.1 / +0.1 |              +0.4 / +0.2 |
+| `cold: reload + open + run type + property` |                       failed |          +70.7 / +20.1 MB |                             |            +34.6 / +34.6 |
+| `cold: then run type` (all 5,000 tasks)     |                       failed |                    failed |                             |                          |
+
+### Reading, N = 5,000
+
+- **The memory executor cannot answer a cold query at this size.** `Filter.type(BenchTask, { priority:
+3 })` on a freshly opened 10,300-object store fails in the client with `Timeout [20,000ms]: index
+query` (the query service's first-result budget), in the timing row and in both memory-pass cold
+  measurements. The host had to load all 5,000 task documents from disk before it could return
+  anything, and at the 7–17 ms per cold document load this store shows, that is 35–85 s. The sql path
+  returns the 1,000 identities in ~14 ms and then the client hydrates them, which is the 6.7–17.2 s
+  the row measures (one sample came back 936 of 1,000 and was re-run). Cold, the executor decides
+  whether the query completes at all; the client's per-document hydration then decides how long.
+- **A cold 5,000-result query times out in both modes**: `cold: then run type` failed on the sql path
+  too, with 115 `index object load timed out` warnings from the client's 2 s per-object budget. The
+  executor is not the limiting factor for large cold result sets; document loading is, and it is the
+  same loading on both paths once the identities are known.
+- **Warm ratios hold from 2,000 to 5,000**, slightly compressed on the large-result rows (type 1.66 →
+  1.47×, union 1.29 → 1.40×) and widened where the memory path's cost scales with the store and sql's
+  with the result: order + limit 10.3 → 15.5×, reactive first result 3.3 → 3.4×. Host execution is
+  9–38 ms on sql against 130–337 ms in memory mode, the latter 55–70% document loading.
+- **Warm peaks now separate the modes**, by 1.5–4× on the task shapes (type + property +63 vs +22 MB,
+  order + limit +42 vs +10 MB, traversal +59 vs +16 MB): the memory executor's per-query working set
+  of 5,000 loaded documents is large enough at this N to show over the client's hydration, where at
+  2,000 it was inside the noise. Retained deltas are within a few MB of each other on every warm row.
+- **The resident-heap gap from N = 2,000 did not reproduce.** After the timing rows both modes sit at
+  ~880 MB, where the two-peer harness at 2,000 had memory mode 190 MB above sql. The cold rows differ
+  between the harnesses (a clone here, an in-process reload there) and the memory-mode cold row failed
+  before it could load anything, so the two runs' baselines are not measuring the same sequence; the
+  memory executor's document leases are also released after each query (`using` in the deleted
+  `_loadFromAutomerge`), which would let a file-backed host unload them. Not established here; the
+  per-query cold figures from N = 2,000 (+57 MB / +35 MB RSS retained for one 400-result query) remain
+  the direct measurement of what a memory-mode query leaves behind.
+
+### Seeding does not scale, and that bounds these runs
+
+N = 10,000 (20,550 objects per peer) was attempted first and failed in both modes during seeding, with
+`RPC timeout: call: {"timeout":30000}` from `RepoProxy._sendUpdates` and the client proxy closing. The
+per-flush cost grows with the size of the store. Measured in the sql attempt, 200-object batches:
+
+| objects seeded | elapsed | slowest flush in the last 1,000 |
+| -------------: | ------: | ------------------------------: |
+|          1,000 |    28 s |                           5.5 s |
+|          2,000 |    63 s |                           4.6 s |
+|          3,000 |   102 s |                           7.5 s |
+|          4,000 |   152 s |                           8.3 s |
+|          5,000 |   202 s |                           8.8 s |
+
+and in the two-peer N = 5,000 memory run, 10,300 objects per peer: the first peer's flushes rose from
+3.0 s to 13.4 s over its 10,000 objects; the second peer's, seeded into the same process, from 8.2 s
+to 27.8 s. The second peer is slower at every point, so the cost is process-wide (the heap and
+Automerge's WASM memory the first peer left behind), not only per-subscription. The growing call is the
+`DataService.updateSubscription` the client issues for each batch of new documents; what in the host's
+`addDocuments`/sync path scales with the store is not established here and is a follow-up outside the
+executor. Practical limit for this harness: ~15k objects in one process before a flush hits the 30 s
+RPC timeout, hence N = 5,000 as the larger run and the single-seed clone for the cold peer.
````

The design document, `SQL_QUERY_EXECUTION.md`, is the rationale companion. It states the problem (the host loads every candidate document into JS to finish evaluation), the goal (answer a query without loading a document), and the constraints that shape the compiler: three SQLite runtimes with different feature floors, bound-variable caps forcing JSON-array parameters, and a strict no-shims rule that the in-memory executor is deleted once compiled coverage is complete. It lays out the proposed storage addition (`objectData`, normalized id columns), the per-step SQL compilation table, the semantic differences the new path deliberately introduces (string collation, mixed-type comparisons), a phased rollout, and a risks/open-questions section. An "Implementation notes" section at the end reconciles the proposal with what actually landed, including that the compiler lives in `echo-host` rather than `index-core` for now, and that the in-memory path was deleted once both benchmark runs above were recorded.

````diff file=packages/core/echo/echo-host/docs/SQL_QUERY_EXECUTION.md lines=1-532
@@ -0,0 +1,532 @@
+# ECHO query execution in SQLite
+
+Status: **implemented and off by default**, 2026-09-21, on this branch. The compiled executor covers
+phases 1 to 3 of the plan below and is selected with `EchoHost({ queryExecutor: 'sql' })` or
+`DX_ECHO_QUERY_EXECUTOR=sql`; the in-memory executor stays the default until the compiled path has
+soaked. Phase 4 (EDGE) is a cross-repo change and phase 5 (property indexes, contentless FTS) is not
+started. Where the implementation departs from the proposal below, the "Implementation notes"
+section at the end records the departure and why.
+
+## Problem
+
+The host query executor uses SQLite only to find candidates. Everything after candidate selection
+runs in JavaScript over Automerge documents that the executor loads into memory for the purpose.
+`packages/core/echo/echo-host/src/query/query-executor.ts` is 2,322 lines, and this is where they go:
+
+| Plan step                    | Where it runs today                                                                 | What it loads                                                          |
+| ---------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
+| `SelectStep`                 | SQLite (`objectMeta`, `ftsIndex`, `reverseRef`), then `_loadDocumentsAfterSqlQuery` | one `AutomergeHost.loadDoc` lease per candidate (`_loadFromAutomerge`) |
+| `FilterStep`                 | JS, `filterMatchDoc` over the loaded `EntityStructure`                              | every candidate's document                                             |
+| `FilterDeletedStep`          | JS, `_getTransitiveDeletionState`                                                   | parents and relation endpoints, to depth 10                            |
+| `TraverseStep`               | refs read off the loaded document; targets via `_loadFromDXN` from the root doc     | the space root document and every linked target document               |
+| `Order`, `Limit`, `Skip`     | JS sort and slice                                                                   |                                                                        |
+| `AggregateStep`              | JS partition in `group-by.ts`                                                       |                                                                        |
+| `UnionStep`, `SetDifference` | JS maps                                                                             |                                                                        |
+| `in-query` (semi-join)       | sub-plan executed in memory, projected into a `Set`, rewritten to a literal `in`    | the whole subquery result                                              |
+| strong-dependency filter     | `_filterUnresolvableStrongDeps`                                                     | schema object, parent, endpoints, to depth 10                          |
+| result                       | `documentJson: JSON.stringify(item.doc)` on every row                               |                                                                        |
+
+What that costs:
+
+- One document load per candidate per execution. A reactive query re-executes on every invalidation
+  hint that overlaps its scope and repeats the loads. `ExecutionTrace.documentsLoaded` counts them.
+- The documents a query touched sit in the repo cache afterwards. The query path is a source of host
+  memory pressure that has nothing to do with what any client is subscribed to.
+- The body shipped for document-backed rows is thrown away. `IndexQuerySource._filterMapResult`
+  (`echo-client/src/client/index-query-source-provider.ts`) reads `documentJson` only for queue rows
+  and hydrates document rows through `objectLoader.loadObject`, which loads the document again on the
+  client. So the host serializes a document the client then re-loads. `query-materialization.bench.ts`
+  measured the pipeline end to end: 1,000 wide objects could not be cold-queried inside the 20 s
+  ceiling, and the time was document loading, not object construction (`echo-client-e2e/BENCHMARKS.md`,
+  "Query materialization").
+- EDGE carries a second executor, `edge/packages/services/db-service/src/worker/query/` (678-line
+  executor, a 935-line planner fork already marked `@deprecated` in favour of `@dxos/echo-host/query`,
+  and a 394-line copy of the filter matcher). It never touches Automerge. Instead it pulls every
+  candidate's JSON snapshot out of the indexer Durable Object over RPC, 200 per call because a DO RPC
+  return is capped at 32 MiB, chunks `IN` lists at 64 bound variables, and resolves one traversal
+  target by calling `queryAll` for the whole space and `find`ing the id in the array.
+- The `in-query` path materializes the subquery projection as a JS `Set` and re-embeds it as a literal
+  list. The TODO at `query-executor.ts:1172` names the fix: push membership into SQL.
+
+The data the evaluation needs is mostly in SQLite already. `objectMeta` holds type, deleted flag,
+parent, relation endpoints, timestamps and queue position. `reverseRef` holds every outgoing reference
+by property path. `ftsIndex.snapshot` holds the full ObjectJSON of every indexed object, with `@meta`
+stripped for document objects. Two things are missing: a body the compiler can predicate on, and the
+compiler.
+
+## Goals
+
+1. The host answers a query without loading an Automerge document. The index is the query's universe.
+2. One plan executes as one SQL statement, sub-plans included. The working set never crosses into JS
+   until the final projection.
+3. `QueryAST`, `QueryPlan`, `QueryPlanner`, the `QueryService` wire schema and the client stay as they
+   are. The semantic differences are the ones listed under "Semantics", and each is deliberate.
+4. One compiler serves the local host and EDGE, and runs where the SQLite is. On EDGE that is the
+   indexer Durable Object.
+5. Predicates on object properties can be indexed without a schema change, through expression indexes
+   over the body.
+
+## Non-goals
+
+- The client working-set executor (`echo-client/src/query/working-set-executor.ts`). The tab has no
+  SQLite. It stays as the optimistic layer over loaded objects; only its comparators are aligned.
+- Incremental maintenance of reactive results. Re-execution stays full. It becomes cheap instead.
+- Vector search, multi-space queries on EDGE, the `registry` scope.
+- Any change to what the client receives, beyond dropping the body it does not read.
+
+## Constraints
+
+- Three SQLite runtimes. Browser: wa-sqlite 3.50.4, built with `-DSQLITE_ENABLE_FTS5`; `json_extract`
+  is present in the wasm. Node: `node:sqlite` 3.51.2. Cloudflare Durable Objects: version not pinned in
+  either repo; JSON functions are already relied on in edge's `sql-space-store.ts` (`json_each`).
+  Feature floors: recursive CTE 3.8.3, expression indexes 3.9, window functions 3.25, `NULLS LAST` 3.30,
+  `->>` 3.38, contentless-delete FTS5 3.43, JSONB 3.45. `IndexEngine.migrate` reads
+  `SELECT sqlite_version()`, compares it numerically in JS against 3.45.0 and dies below it, so a
+  runtime under the floor fails at open rather than at the first query.
+- Bound-variable caps: 999 on wasm, lower on DO (edge chunks at 64). The compiler passes every list as
+  one JSON-array parameter and reads it with `json_each(?)`, so no statement's variable count depends
+  on data size and `chunkArray` disappears from the query path.
+- Schema changes are numbered `.sql` migrations with `IF NOT EXISTS` on every `CREATE`
+  (`.agents/projects/sql-migrations/DESIGN.md`). A reindex is triggered by retiring cursor rows in a
+  tracker migration; `0003_retire_pre_convergence_key_cursors.sql` is the precedent.
+- No compatibility shims. The in-memory executor is deleted once the compiler covers every step. The
+  `DX_ECHO_QUERY_EXECUTOR=memory|sql` switch exists for the rollout phases only and is removed in the
+  last one.
+- The compiler emits read-only statements, so it needs no transaction and is unaffected by the DO
+  `withTransaction` constraint.
+- On EDGE only results cross the DO boundary, so the 32 MiB RPC cap stops shaping the design.
+
+## Proposal
+
+### 1. Storage: `objectData`, the body the compiler predicates on
+
+A new store in `@dxos/index-core`, history table `object_data_migrations`:
+
+```sql
+CREATE TABLE IF NOT EXISTS objectData (
+  recordId INTEGER PRIMARY KEY,   -- objectMeta.recordId
+  body BLOB NOT NULL              -- jsonb(ObjectJSON), @meta included
+);
+```
+
+Rules:
+
+- One row per `objectMeta` row, written in the same transaction. `IndexEngine.#update` already runs
+  `objectMetaIndex.update`, `lookupRecordIds`, then the dependent index; `objectData` becomes a
+  dependent index that runs before `fts` and `reverseRef`.
+- The body is the full ObjectJSON: `objectStructureToJson` for documents, `EchoFeedCodec.decode` for
+  feed blocks, `@meta` included. `Filter.key`, `Filter.foreignKeys` and `Filter.tag` read meta. Feed
+  partial blocks (the `{ id, '@deleted': true }` tombstone) merge onto the prior body exactly as
+  `FtsIndex.update` merges them today.
+- JSONB, not text. Every runtime is at or above 3.45, the prototype measured the same bodies at 773
+  bytes as JSONB against 950 as text, and `json_extract` on JSONB skips the parse.
+- A separate table, not a column on `objectMeta`. The metadata scans that remain (indexer diffing,
+  garbage collection, hint building, `SELECT *` in `entity-meta-index.ts`) keep small rows, and the
+  join from a working set is a rowid lookup. Open question 1 revisits this with a measurement.
+- Three normalized id columns are added to `objectMeta`: `parentId`, `sourceId`, `targetId`, holding
+  the bare entity id when the reference is local to the row's space and `NULL` otherwise, each indexed
+  with `spaceId` leading. `parent`, `source` and `target` hold full EID strings, so a join to
+  `objectId` today needs string concatenation on the indexed side, which the `(spaceId, objectId)`
+  index cannot serve. The prototype's `EXPLAIN` shows `SEARCH p USING INDEX idx_parent (spaceId=?)`
+  followed by a filter, a scan of the space per recursion step.
+- `reverseRef` gains `propPathNormalized`, the escaped path with array-index segments removed. An
+  incoming traversal becomes an equality instead of the JS `_matchesReferencePropertyPath` walk. A
+  query path that itself names an index (`items.0.assignee`) matches on `propPath` instead.
+- Backfill. A tracker migration deletes every `fts6` and `reverseRef2` cursor, so the next passes
+  re-present every document and feed block through `IndexEngine.#update`, which now writes
+  `objectData`. Until every `objectMeta` row has a body (one `LEFT JOIN ... WHERE d.recordId IS NULL`
+  count), `QueryServiceImpl` awaits `updateIndexes()` before a query's first execution. That is the
+  gate feed-scoped queries already pass through (`QueryServiceProps.updateIndexes`). Boot is not
+  blocked; queries are, once, on the first open after the upgrade. The client-startup-timeout profile
+  (1,700 documents) is the case to time, at the indexer's 50 documents per pass.
+- `querySnapshotsJSON` moves from `ftsIndex` to `objectData`. In phase 5 `ftsIndex` becomes a
+  contentless table (`content=''`, `contentless_delete=1`), which halves the JSON stored per object.
+  Its searchable text stays meta-stripped for document objects, as today.
+
+### 2. Compiler: `SqlPlanCompiler` in `@dxos/index-core`
+
+```ts
+compile(plan: QueryPlan.Plan, context: CompileContext): CompiledQuery;
+// CompileContext: owning spaceId, parameter sink, trace flag.
+// CompiledQuery: { statement: Statement.Fragment; shape: ResultShape }.
+```
+
+A pure function of the plan. The executor runs the statement through the existing
+`RuntimeProvider<SqlClient>` and reads rows. `QueryPlanner` is untouched; the compiler consumes the
+plan the planner already produces, including `limit` pushdown, `feedScan` and `feedCursorRange`.
+
+The working set is a CTE `ws_n(recordId, rank, ord)`. `ord` is the row's position in the working set,
+kept so a later `AggregateStep` can order groups by first appearance and so an `ORDER BY` after a
+sub-plan is stable. After `AggregateStep` the CTE also carries `groupKey` (a `json_object`),
+`groupOrd`, `groupCount` and one `agg_<name>` column per scalar aggregate.
+
+Step compilation:
+
+| Step                                | SQL shape                                                                                                                                                                                                 |
+| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `ClearWorkingSetStep`               | `SELECT ... WHERE 0`                                                                                                                                                                                      |
+| `SelectStep` / `WildcardSelector`   | `FROM objectMeta m WHERE <scope>`; `<scope>` is `buildSourceCondition` reused from `entity-meta-index.ts`                                                                                                 |
+| `SelectStep` / `TypeSelector`       | `... AND <buildTypeDxnCondition>` (`NOT` when inverted)                                                                                                                                                   |
+| `SelectStep` / `IdSelector`         | `... AND m.objectId IN (SELECT value FROM json_each(:ids))`                                                                                                                                               |
+| `SelectStep` / `TimestampSelector`  | `... AND m.updatedAt >= :after ...`                                                                                                                                                                       |
+| `SelectStep` / `IncomingReference`  | `FROM reverseRef r JOIN objectMeta m USING (recordId) WHERE r.targetDXN = :target AND (:path IS NULL OR r.propPathNormalized = :path) AND <scope>`                                                        |
+| `SelectStep` / `TextSelector`       | `FROM ftsIndex f JOIN objectMeta m ON m.recordId = f.rowid WHERE f.snapshot MATCH :q AND <scope> AND <type>`, `rank = -bm25(ftsIndex)`; the `LIKE` fallback for terms under three characters is unchanged |
+| feed window (`QueueWindow`)         | `buildQueueWindow` reused: `AND queuePosition > :after ... ORDER BY queuePosition LIMIT :n`, or `ORDER BY objectId LIMIT :n`                                                                              |
+| `SelectStep.limit`                  | `LIMIT` on the select CTE                                                                                                                                                                                 |
+| `FilterStep`                        | `FROM ws JOIN objectData d USING (recordId) JOIN objectMeta m USING (recordId) WHERE <predicate>` (table below)                                                                                           |
+| `FilterDeletedStep`                 | `NOT EXISTS` or `EXISTS` against the recursive `dep` CTE below                                                                                                                                            |
+| `TraverseStep` / outgoing reference | `json_each` over `$.path` (an array, or a scalar wrapped with `json_array`), target id parsed from the `"/"` URI, joined to `objectMeta` in the ref's space or the anchor's                               |
+| `TraverseStep` / incoming reference | `reverseRef r WHERE r.targetDXN IN (anchor local EIDs) AND propPathNormalized = :path`, joined to `objectMeta`; queue anchors match on their space-qualified EID as today                                 |
+| `TraverseStep` / relation           | `m.entityKind = 'relation' AND m.sourceId IN (anchors)`; the reverse direction joins `objectMeta t ON t.spaceId = m.spaceId AND t.objectId = m.sourceId`                                                  |
+| `TraverseStep` / hierarchy          | `m.parentId IN (anchors) OR m.queueId IN (anchors)` for children; `parentId` join for the parent                                                                                                          |
+| `UnionStep`                         | `UNION` of the sub-chains, each starting from the current `ws`; deduplicated on `(spaceId, documentId, objectId)` as today                                                                                |
+| `SetDifferenceStep`                 | `EXCEPT` on `objectId`, as today                                                                                                                                                                          |
+| `OrderStep`                         | `ORDER BY <expr> ASC NULLS LAST, m.objectId`; in a CTE with `ROW_NUMBER()` when steps follow, on the final `SELECT` otherwise                                                                             |
+| `LimitStep`, `SkipStep`             | `LIMIT` and `OFFSET`; on a grouped working set `WHERE groupOrd > :skip AND groupOrd <= :skip + :limit`                                                                                                    |
+| `AggregateStep`                     | key columns from the coalesce chain of coerced `json_extract`s; `COUNT(*) OVER (PARTITION BY key)`, `MAX/MIN(...) OVER`, `MIN(ord) OVER` for first appearance; `DENSE_RANK()` in a second CTE level       |
+| `in-query`                          | `IN (SELECT projected FROM <compiled sub-plan> JOIN objectData ... WHERE projected IS NOT NULL)`; one CTE per distinct subquery, shared by every occurrence, matching the executor's per-run cache        |
+| `child-of`                          | recursive ancestor CTE over `parentId` (and `queueId` for the feed-as-parent rule), depth 10                                                                                                              |
+| strong dependencies                 | recursive existence CTE: the type's EID row exists among document rows of the space, `parentId`/`sourceId`/`targetId` exist, depth 10; cross-space dependencies pass, as `_areStrongDepsResolvable` does  |
+| projection                          | `SELECT m.objectId, m.spaceId, m.documentId, m.queueId, m.queueNamespace, ws.rank, groupKey, groupCount, CASE WHEN m.queueId != '' THEN json(d.body) END AS documentJson`                                 |
+
+The nested-window restriction is real: `DENSE_RANK() OVER (ORDER BY MIN(ord) OVER (...))` is rejected
+with "misuse of window function", so group ordinal needs its own CTE level. The prototype hit this and
+the two-level form works.
+
+Transitive deletion, matching `DeletionResolver` (`echo-host/src/db-host/deletion.ts`) and
+`ObjectCore.isDeleted`:
+
+```sql
+dep(recordId, depId, depth) AS (
+  SELECT m.recordId, m.parentId, 1 FROM objectMeta m JOIN ws USING (recordId) WHERE m.parentId IS NOT NULL
+  UNION ALL
+  SELECT m.recordId, m.sourceId, 1 FROM objectMeta m JOIN ws USING (recordId)
+    WHERE m.entityKind = 'relation' AND m.sourceId IS NOT NULL
+  UNION ALL
+  SELECT m.recordId, m.targetId, 1 FROM objectMeta m JOIN ws USING (recordId)
+    WHERE m.entityKind = 'relation' AND m.targetId IS NOT NULL
+  UNION ALL
+  SELECT dep.recordId, p.parentId, dep.depth + 1
+    FROM dep JOIN objectMeta p ON p.spaceId = :space AND p.queueId = '' AND p.objectId = dep.depId
+    WHERE dep.depth < 10 AND p.deleted = 0 AND p.parentId IS NOT NULL
+)
+-- a row is deleted when its own flag is set or any dependency reached is deleted:
+... WHERE m.deleted = 0 AND NOT EXISTS (
+  SELECT 1 FROM dep JOIN objectMeta p ON p.spaceId = :space AND p.queueId = '' AND p.objectId = dep.depId
+  WHERE dep.recordId = ws.recordId AND p.deleted = 1)
+```
+
+The recursion follows the parent chain only, which is what `DeletionResolver` does after the first
+hop. Verified on the prototype fixture: children of a deleted project resolve as deleted; a child of a
+live sibling does not.
+
+Predicate compilation for `FilterStep`, keyed to `makeFilterMatcher` and `filterMatchValue` in
+`echo/src/internal/Filter/match.ts`. `b` is `d.body`, `p` the JSON path for the property (keys quoted
+with `$."key"` so a dot in a key cannot change the path):
+
+| Filter node                  | SQL                                                                                                                                                                                                                                                                                                |
+| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `object.typename`            | `buildTypeDxnCondition` on `m.typeDXN`; kept as a re-check because the selector cannot separate schema versions                                                                                                                                                                                    |
+| `object.id`                  | `m.objectId IN (SELECT value FROM json_each(:ids))`                                                                                                                                                                                                                                                |
+| `object.props`               | `AND` of the nested predicates; `@`-prefixed keys skipped; a nested `object` recurses with a longer path                                                                                                                                                                                           |
+| `compare eq`                 | `json_type(b, p) = :type AND json_extract(b, p) = :value`; booleans compare on `json_type` (`'true'`/`'false'`); a ref compares `json_extract(b, p \|\| '."/"') = :uri`; `eq undefined` is `json_type(b, p) IS NULL`                                                                               |
+| `compare neq`                | `NOT (<eq>)`, so a missing property counts as not equal, as in JS                                                                                                                                                                                                                                  |
+| `gt`, `gte`, `lt`, `lte`     | `json_type(b, p) IN ('integer', 'real') AND json_extract(b, p) > :value` for a number operand; `= 'text'` for a string operand                                                                                                                                                                     |
+| `in`                         | `COALESCE(json_extract(b, p \|\| '."/"'), json_extract(b, p)) IN (SELECT value FROM json_each(:values))`; ref values pre-normalized to URIs, as `_normalizeInValue` does                                                                                                                           |
+| `in-query`                   | as in the step table                                                                                                                                                                                                                                                                               |
+| `contains` (scalar)          | `EXISTS (SELECT 1 FROM json_each(b, p) e WHERE e.type = :type AND e.value = :value)`                                                                                                                                                                                                               |
+| `contains` (object, strict)  | `EXISTS (SELECT 1 FROM json_each(b, p) e WHERE (SELECT count(*) FROM json_each(e.value)) = :n AND json_extract(e.value, '$."k1"') = :v1 AND ...)`, recursing for nested objects                                                                                                                    |
+| `range`                      | `json_type(b, p) IN (...) AND json_extract(b, p) >= :from AND json_extract(b, p) <= :to`; inclusive at both ends, which is what the matcher does even though `Filter.between` documents `to` as exclusive                                                                                          |
+| `tag`                        | `EXISTS (SELECT 1 FROM json_each(b, '$."@meta"."tags"') t WHERE <local-id-of>(COALESCE(json_extract(t.value, '$."/"'), t.value)) = :tag)`                                                                                                                                                          |
+| `foreignKeys`                | `EXISTS (SELECT 1 FROM json_each(b, '$."@meta"."keys"') k, json_each(:fks) f WHERE k.value ->> 'source' = f.value ->> 'source' AND k.value ->> 'id' = f.value ->> 'id')`                                                                                                                           |
+| `metaKey`, `metaVersion`     | `json_extract(b, '$."@meta"."key"') = :key`; semver is not expressible in SQL, so with `metaVersion` the executor first selects the distinct `@meta.version` values under that key, filters them with `semver.satisfies`, and compiles `version IN (:matching)`. Two statements, no document loads |
+| `timestamp`                  | `m.updatedAt >= :v` and so on; today's `_execTimestampFilterStep` runs a second index query and intersects                                                                                                                                                                                         |
+| `has-parent`                 | `(m.parent IS NOT NULL) = :value`                                                                                                                                                                                                                                                                  |
+| `mnemonic`                   | `upper(substr(m.objectId, -6)) = :mnemonic`                                                                                                                                                                                                                                                        |
+| `text-search`, `feed-cursor` | never reach a `FilterStep`; the planner lifts them onto the select                                                                                                                                                                                                                                 |
+| `not`, `and`, `or`           | `NOT (...)`, `AND`, `OR`                                                                                                                                                                                                                                                                           |
+
+`<local-id-of>` is the SQL spelling of the canonicalization `matchesTag` applies: for an `echo:` URI
+(`echo:///<id>` or `echo://<space>/<id>`) the text after the last slash,
+`substr(uri, length(rtrim(uri, replace(uri, '/', ''))) + 1)`; any other URI compares as is. Verified
+on both EID forms.
+
+The executor shell (`QueryExecutor`) keeps its id, plan, `#scopes` and `matchesHint`, and its
+`changed` diff on the identity tuple plus group key. `execQuery` becomes: compile once in the
+constructor, run the statement, diff rows, keep them for `getResults`. `ExecutionTrace` keeps its
+shape and gains `sql`, `rows` and `sqlTime`; under `DX_TRACE_QUERY_EXECUTION` it also runs
+`EXPLAIN QUERY PLAN` and attaches the output. `documentsLoaded` stays in the trace and reads 0 by
+construction, which is the property the `active-queries` diagnostic can then assert.
+
+### 3. EDGE
+
+The compiler runs inside the `Indexer` Durable Object, which owns the SQLite. A new RPC,
+`Indexer.execPlan(ctx, plan)`, returns `QueryResult[]`. `data-service.ts` plans with the
+`QueryPlanner` from `@dxos/echo-host/query` (the fork's own deprecation note names it) and calls
+the indexer. `db-service/src/worker/query/` (executor, planner fork, `filter-match.ts`, `plan.ts`)
+is deleted, about 2,300 lines, together with `SNAPSHOT_RPC_BATCH_SIZE`, the 64-variable chunking and
+the `queryAll`-then-`find` target resolution. Cross-repo sequencing is the usual one: land the
+`index-core` compiler in dxos, then bump edge's catalog to a `pkg.pr.new` build, then delete.
+
+### 4. Client
+
+Wire format and hydration are unchanged. `working-set-executor.ts` gets three alignments so the
+optimistic layer agrees with the host: natural order by code-unit comparison (it uses `localeCompare`
+today and the host does not, so a mixed-case pair of ids can sort differently on the two sides),
+property order under the collation adopted below, and `MAX_DEPTH_FOR_CHILD_OF_TRACING` 16 to 10.
+
+### Alternatives considered
+
+- **Property table (entity-attribute-value).** `objectProps(recordId, path, type, value)` with one row
+  per leaf, indexed on `(path, value)`. Every property becomes indexable, at the cost of O(properties)
+  writes per object and a wide table. `objectData` with opt-in expression indexes reaches the same
+  predicates with one write per object, and indexes only what a query needs. Rejected for now; it
+  remains the fallback if expression indexes prove insufficient for a hot type.
+- **Compile filters only, keep JS for traversal, deletion and dependencies.** This is where the
+  document loads are (`_loadFromDXN`, `_getTransitiveDeletionState`, `_areStrongDepsResolvable`), so
+  as an end state it keeps the cost this design exists to remove. It is phase 2 as an intermediate.
+- **Per-type generated tables from schema.** Dynamic schemas, schema versions in one type partition
+  and untyped objects make the table set unstable. Rejected.
+- **Read bodies from `ftsIndex.snapshot`, as EDGE does.** `@meta` is stripped for document objects,
+  so `Filter.key`, `Filter.foreignKeys` and `Filter.tag` cannot be evaluated; a virtual table cannot
+  carry expression indexes; and coupling the query body to FTS blocks making FTS contentless.
+  Rejected.
+
+## Semantics: what changes and what is preserved
+
+| Behaviour                                     | Today (host)                                                                | After                                               | Why it is acceptable                                                                                                                                                 |
+| --------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| `orderBy` on a string property                | `localeCompare`, locale-dependent                                           | BINARY code-unit order                              | these SQLite builds have no ICU; deterministic across devices; already the rule for `natural`                                                                        |
+| `gt`/`lt`/`range` across mixed types          | JS coercion (`'10' > 9` is true)                                            | no match unless operand and value share a JSON type | the coercion was never specified; the typed rule is what `eq` already does                                                                                           |
+| null ordering                                 | nulls last                                                                  | `NULLS LAST`                                        | same                                                                                                                                                                 |
+| `eq`, `neq`, `in`, `contains`, booleans, refs | strict identity, refs by URI                                                | same, via `json_type`                               | same                                                                                                                                                                 |
+| timestamp filter under `or`/`not`             | `QueryError` from the planner                                               | unchanged                                           | out of scope; the compiler could lift it later                                                                                                                       |
+| result universe                               | candidates from the index; bodies and traversal targets from live documents | everything from the index                           | reactive re-execution is triggered by the indexer after it commits, so the two universes cannot disagree there; a one-shot query reads the universe it selected from |
+| `documentJson` on document rows               | sent, discarded by the client                                               | omitted                                             | `_resolveIndexedObject` loads the document itself; feed rows keep the body                                                                                           |
+| `child-of` depth                              | 10 on the host, 16 on the client                                            | 10 on both                                          | `DeletionResolver` and `ObjectCore.isDeleted` already agree on 10                                                                                                    |
+| union / set-difference identity               | `(spaceId, documentId, objectId)` / `objectId`                              | same                                                |                                                                                                                                                                      |
+| group order                                   | first appearance in the ordered input                                       | `MIN(ord) OVER (PARTITION BY key)`                  | same                                                                                                                                                                 |
+| `in-query`                                    | subquery projection held as a JS `Set`                                      | SQL subquery                                        | no bound-variable ceiling; no per-run cache to invalidate                                                                                                            |
+
+One consequence of "the index is the universe" deserves a sentence. An object whose document is on
+disk but not yet indexed is invisible to a query today only as a candidate; after this change it is
+also invisible as a traversal target, a parent, or a strong dependency. Indexing is per document and
+atomic, the pass that indexes the referrer normally indexes the target, and a traversal query is
+`isSimple = false` so the next pass's hint re-executes it regardless. Convergence is not in question,
+only the moment at which a freshly written target appears, and the client's working set answers that
+moment for local writes already.
+
+## Performance model
+
+- Select and filter over a type partition: an index seek on `(spaceId, typeDXN)`, then one rowid
+  lookup into `objectData` per candidate with `json_extract` on JSONB. For a versioned type the
+  prototype's `EXPLAIN` reads `SEARCH m USING INDEX idx_object_index_typeDXN (spaceId=? AND typeDXN=?)`
+  then `SEARCH d USING INTEGER PRIMARY KEY (rowid=?)`. Zero allocations per candidate on the JS side.
+- A versionless type does not seek today. `buildTypeDxnCondition` emits
+  `typeDXN = :t OR typeDXN LIKE :t || ':%'`, and SQLite answers that with `(spaceId=?)` alone, a scan
+  of the whole space partition; this is how `queryTypes` runs now, so the compiler inherits it. Adding
+  a bounding range in front, `typeDXN >= :t AND typeDXN < :t || ';'` with the exact predicate kept as
+  the residual, gives `(spaceId=? AND typeDXN>? AND typeDXN<?)` and the same rows (verified on a
+  fixture holding `x`, `x:0.1.0`, `x-bar`, `x.y:1.0.0`, `xy`). The legacy `echo:/` and `echo:///`
+  equivalents seek as a plain `IN` list. Phase 2 makes this change to the shared fragment, so the old
+  `queryTypes` path gains it too.
+- Expression indexes are used when the query spells the identical expression. The prototype's
+  `CREATE INDEX idx_status ON objectData(json_extract(body, '$.status'))` produced
+  `SEARCH objectData USING COVERING INDEX idx_status (<expr>=?)`. The compiler therefore emits
+  `json_extract(d.body, '$."status"')` in exactly one spelling, and phase 5 exposes
+  `IndexEngine.ensurePropertyIndex(path)` that creates the index in that spelling.
+- What to measure, before and after each phase:
+  1. `echo-client-e2e/src/query-materialization.bench.ts`, cold query rows. The host half of the load
+     disappears; the client half (hydration) remains and is the working set's business.
+  2. A new `echo-host` bench: a type query with one property predicate over 10k and 100k indexed
+     objects, reporting `sqlTime`, `rows`, `documentsLoaded` from `ExecutionTrace`.
+  3. The idle Composer query set: `QueryServiceImpl` notes 80 active queries of which 10 are unique.
+     Sum of `executionTime` across one invalidation batch, before and after.
+  4. Shared-worker heap after a query storm, with the `test-perf-leaks` tooling: the repo cache should
+     no longer hold documents that only a query touched.
+
+## Rollout
+
+Each phase is a PR, or a small stack. Tests are not rewritten to fit the new executor; where a test
+encodes one of the semantic changes above (string collation, mixed-type comparison) the change is
+made visible in the test and called out in the changeset.
+
+### Phase 0: measure and harness
+
+- Baseline the four measurements above and record them in `echo-client-e2e/BENCHMARKS.md`.
+- New `echo-host` bench: a type query with one property predicate over 10k and 100k indexed
+  objects, reporting `ExecutionTrace.executionTime`, `documentsLoaded` and `indexHits`.
+- `DX_ECHO_QUERY_EXECUTOR=memory|sql`, read once in `QueryExecutor`; once the `sql` value exists,
+  CI runs `echo-client-e2e:test` (222 query tests) under both.
+- A `fast-check` property test in `echo-host` (already a dependency of `blade-runner`): random
+  filters over a fixed property set against a seeded space; the two executors must agree row for row.
+
+### Phase 1: storage, no executor change
+
+- `objectData` store in `@dxos/index-core`: `src/migrations/object-data/0001_init.sql`, manifest,
+  `object_data_migrations` history table, `ObjectDataIndex implements Index` writing `jsonb(body)`
+  and merging feed partial blocks onto the prior body as `FtsIndex.update` does.
+  `IndexEngine.#update` runs it before `fts` and `reverseRef`; `IndexEngine.migrate` reads
+  `sqlite_version()` and dies below 3.45.0. The four non-negotiable migration tests from the
+  sql-migrations design (legacy database, `IF NOT EXISTS`, manifest coverage, second run no-op).
+- `parentId`, `sourceId`, `targetId` on `objectMeta` as a code migration probing `PRAGMA table_info`
+  (the `0007_convergence_key.ts` pattern), indexes with `spaceId` leading, filled by
+  `EntityMetaIndex.update`; `queryChildren` and `queryRelations` switch to them.
+- `reverseRef.propPathNormalized`, same mechanism, filled by `ReverseRefIndex.update`.
+- Backfill: a tracker migration retiring the `fts6` and `reverseRef2` cursors; a
+  `hasCompleteBodies()` check on `IndexEngine`; `QueryServiceImpl` awaits `updateIndexes()` before a
+  query's first execution while it is false. Time it on the 1,700-document profile from the
+  client-startup-timeout project and record the number.
+- `querySnapshotsJSON` served from `objectData` (`json(body)`); the `FtsIndex` version deleted.
+
+### Phase 2: compiler, first coverage, behind the flag
+
+- `SqlPlanCompiler` in `@dxos/index-core/src/query/`: `compile(plan, context)` returning a
+  `Statement.Fragment` plus result shape; list parameters passed as one JSON array and read with
+  `json_each`.
+- Every selector: wildcard, type (including inverted, with the seekable versionless predicate
+  above), id, timestamp, incoming reference, text with the `LIKE` fallback; feed windows through the
+  existing `buildQueueWindow`; `SelectStep.limit`.
+- `FilterDeletedStep` as the recursive `dep` CTE, both modes.
+- `FilterStep` for `object` (typename, id, props, foreignKeys, metaKey, the metaVersion pre-pass),
+  `compare`, `in`, `contains` (scalar and strict structural), `range`, `tag`, `timestamp`,
+  `has-parent`, `mnemonic`, `not`, `and`, `or`.
+- `OrderStep`, `LimitStep`, `SkipStep`, projection; the `changed` diff and `getResults` read rows.
+- Executor dispatch: the compiled path when the plan is within coverage, the legacy path otherwise,
+  gated by the flag. `ExecutionTrace` gains `sql`, `rows`, `sqlTime` and `explain`.
+- Compiler unit tests snapshotting the SQL per step; `index-core:test-browser` covers wa-sqlite.
+- Decide open question 1 (separate table or column) from the 100k bench.
+
+### Phase 3: full coverage, legacy deleted
+
+- `TraverseStep`: outgoing reference (`json_each` on the body), incoming reference (`reverseRef` and
+  `propPathNormalized`), relation and hierarchy in both directions.
+- `UnionStep` (`UNION`, identity `(spaceId, documentId, objectId)`) and `SetDifferenceStep`
+  (`EXCEPT` on `objectId`).
+- `in-query` as a shared subquery CTE; `child-of` as the ancestor CTE at depth 10; the strong
+  dependency filter as the recursive existence CTE.
+- `AggregateStep`: coalesce-chain group keys, window aggregates, the two-level `DENSE_RANK`,
+  group-aware limit and skip.
+- Delete the in-memory path: the step methods, `QueryItem`, the host's use of `filterMatchDoc`, the
+  flag. Stop sending `documentJson` for document rows.
+- Client alignment in `working-set-executor.ts`: code-unit natural order, the adopted string
+  collation for property order, child-of depth 10.
+- Changeset naming the collation and mixed-type comparison changes.
+
+### Phase 4: EDGE
+
+- `Indexer.execPlan(ctx, plan)` RPC in `edge/packages/services/db-service`; `data-service.ts` plans
+  with the `QueryPlanner` from `@dxos/echo-host/query`.
+- Delete `db-service/src/worker/query/` (executor, planner fork, `filter-match.ts`, `plan.ts`).
+- Catalog bump to the dxos release carrying the compiler, after the `db-service` workerd suite is
+  green through a linked build (`pnpm link-packages ../dxos --all --install`).
+- Resolve open question 5 first.
+
+### Phase 5: indexes and storage
+
+- `IndexEngine.ensurePropertyIndex(path)`, creating
+  `CREATE INDEX IF NOT EXISTS ... ON objectData(json_extract(body, '$."<path>"'))` in the compiler's
+  exact spelling; a test asserts the use through `EXPLAIN QUERY PLAN`.
+- Contentless `ftsIndex` (`content=''`, `contentless_delete=1`) once nothing reads `snapshot`; a
+  migration retiring the FTS cursor for the rebuild.
+- `DeletionResolver` in garbage collection reads the `dep` CTE instead of loading documents.
+- `EXPLAIN QUERY PLAN` attached to traces by default in dev.
+
+Verification per phase: `moon run index-core:test` and `index-core:test-browser`,
+`moon run echo-host:test`, `moon run echo-client-e2e:test`; for phase 4 edge's `db-service` workerd
+suite through the linked build.
+
+## Risks
+
+- **Backfill duration on large profiles.** Fifty documents per pass with a `loadDoc` each. If the
+  1,700-document profile takes tens of seconds, queries are gated for that long on first open after
+  upgrade. Mitigation: the gate blocks queries only; measure in phase 1 and raise the per-pass limit
+  for the backfill if needed.
+- **Storage growth.** Every object's body is stored in `objectData`, and until phase 5 also in
+  `ftsIndex`. JSONB is about a fifth smaller than the text copy. Document objects gain a stored body
+  they did not have outside FTS. Phase 5 removes the duplicate.
+- **Plan quality on large partitions.** A property predicate over a 100k-row type is a scan of that
+  partition inside SQLite. It is the same scan the executor does today in JS after loading 100k
+  documents, so it is strictly better, but not fast until phase 5's expression indexes. The bench in
+  the performance model is the gate.
+- **Recursive CTE cost.** Bounded by depth 10 times the working set, each hop an indexed seek once
+  `parentId` exists. Without the normalized columns it is a per-hop scan of the space, which the
+  prototype `EXPLAIN` showed; hence the columns are in phase 1, not later.
+- **SQLite version drift.** The DO runtime's version is not pinned anywhere we control. The
+  `migrate()` assertion turns a silent JSONB failure into a loud open-time error, and edge's linked
+  workerd suite runs before the catalog bump.
+- **Semantic drift between the two executors during phases 2 and 3.** The differential harness is the
+  control; the flag is removed the moment coverage is complete so the window is short.
+- **Filter nodes that resist SQL.** `metaVersion` is the only one found, handled by the two-statement
+  form. If another appears, the rule is a pre-pass that resolves it to literals, never a post-filter in
+  JS over candidates.
+
+## Open questions
+
+1. `objectData` as its own table, or `body` as a column on `objectMeta`. Decide with the 100k-row
+   bench in phase 2: if the rowid join costs more than the widened metadata scans save, fold it in.
+2. Collation for string ordering: BINARY as proposed, or `NOCASE`. BINARY matches `natural` and the
+   client can reproduce it exactly; `NOCASE` reads better in lists but is ASCII-only.
+3. `metaVersion` resolution: the two-statement pre-pass as proposed, or projecting `@meta.version` out
+   of the final rows and filtering in JS. The pre-pass keeps `LIMIT` exact; the post-filter does not.
+4. Backfill policy: gate queries as proposed, or serve the legacy executor until `objectData` is
+   complete. Gating is simpler and the legacy path is scheduled for deletion.
+5. Whether EDGE's clients read `documentJson` for document rows. The functions runtime proxies
+   `execQuery` to edge's data service, and edge's executor sends a body for every row today. Confirm
+   the consumer is the same `IndexQuerySource` before phase 4 drops it there too.
+
+## References
+
+- Executor and planner: `packages/core/echo/echo-host/src/query/{query-executor,query-planner,plan,group-by}.ts`
+- Host services: `packages/core/echo/echo-host/src/db-host/{query-service,echo-host,deletion,invalidation-hint}.ts`
+- Indexes: `packages/core/echo/index-core/src/{index-engine,index-tracker}.ts`,
+  `packages/core/echo/index-core/src/indexes/{entity-meta-index,fts-index,reverse-ref-index}.ts`,
+  `packages/core/echo/index-core/src/migrations/**`
+- Filter semantics: `packages/core/echo/echo/src/internal/Filter/match.ts`, AST in
+  `packages/core/echo/echo-protocol/src/query/ast.ts`
+- Client: `packages/core/echo/echo-client/src/client/index-query-source-provider.ts`,
+  `packages/core/echo/echo-client/src/query/{working-set-executor,graph-query-context,query-result}.ts`
+- EDGE: `edge/packages/services/db-service/src/worker/{query,indexer}/`
+- Prior art: `.agents/projects/sql-migrations/DESIGN.md`, `plans/feed-query-path/PLAN.md`,
+  `packages/core/echo/echo-host/docs/GARBAGE_COLLECTION.md`, `echo-client-e2e/BENCHMARKS.md`
+
+## Implementation notes
+
+What landed, and where it departs from the proposal above.
+
+- **The compiler lives in `echo-host`, not `index-core`**: `packages/core/echo/echo-host/src/query/sql/compile.ts`.
+  `QueryPlan` and `QueryPlanner` are `echo-host` modules and `index-core` cannot depend on
+  `echo-host` (the dependency runs the other way), so putting the compiler in `index-core` first
+  means moving the plan types there. That move is the first step of phase 4, since EDGE is the
+  consumer that needs it; until then the compiler imports the index fragments it shares
+  (`buildSourceCondition`, `buildTypeDxnCondition`, `buildQueueWindow`, `buildFtsCondition`) from
+  `index-core`.
+- **Backfill is a fresh cursor set, not cursor retirement.** `objectData` is a dependent index
+  named `objectData1` in `IndexEngine.update`, run before `fts6`; on an upgraded database its
+  cursors are empty, so every document and feed block is re-presented through it and
+  `objectMeta`'s normalized id columns fill in the same pass. The reverse-reference index name
+  bumped `reverseRef2` to `reverseRef3` for `propPathNormalized`, with tracker migration 0004
+  dropping the orphaned rows. `IndexEngine.update` reads the source once and writes `objectMeta`
+  once for all three dependent indexes when their cursor sets agree (the steady state); only while
+  one index lags, as during this backfill, does each diff against its own cursors in its own pass.
+- **The query gate** is `QueryServiceProps.hasCompleteBodies`; `QueryServiceImpl` awaits
+  `updateIndexes()` before a query's first execution while it is false and caches `true` once seen.
+- **The in-memory path is deleted.** It went once both benchmark runs were recorded (the `memory`
+  column in `BENCHMARKS.md` comes from `c5294281`). `QueryExecutor` now depends only on the
+  `SqlClient` runtime: it compiles the plan, runs the statement and diffs the rows for `changed`,
+  with no `IndexEngine`, `AutomergeHost` or `SpaceStateManager` dependency.
+- **Three-valued logic** was the one class of bug the differential test found: `NOT (json_type(b, p)
+= 'text' AND ...)` is `NULL` for a missing property, and a `NULL` predicate drops the row where
+  the matcher's `!==` keeps it. Every type test is `COALESCE(json_type(...), 'missing')` for this
+  reason (`sql/differential.test.ts` is the guard).
+- **`metaVersion`** resolves as the two-statement pre-pass (open question 3), reusing `matchMetaKey`
+  from `@dxos/echo/internal` rather than adding a `semver` dependency to `echo-host`.
+- **Traversals dedupe** on `recordId` (`GROUP BY`), where the legacy executor could yield the same
+  target twice when two anchors referenced it; the client deduplicated by id anyway.
+- **The versionless type predicate seeks.** `buildTypeDxnCondition` bounds each form with
+  `typeDXN >= form AND typeDXN < form || ';'` ahead of the exact `= OR LIKE` residual, so both the
+  compiler and the legacy `queryTypes` path get `(spaceId=? AND typeDXN>? AND typeDXN<?)` instead
+  of a partition scan.
+- **Not done here**: phase 4 (EDGE indexer DO) and phase 5 (`ensurePropertyIndex`, contentless
+  `ftsIndex`, `DeletionResolver` on the `dep` CTE). Benchmark results:
+  `echo-client-e2e/BENCHMARKS.md`, "Query executor: memory vs sql".
````

## Also changed

20 hunks across 7 files the walkthrough above does not describe.

```diff file=packages/core/echo/echo-client/src/testing/echo-test-builder.ts lines=15-94
@@ -15,7 +15,7 @@ import isEqual from 'fast-deep-equal';

 import { type Context, Resource } from '@dxos/context';
 import { type Entity, Filter, Obj, Query, type Type } from '@dxos/echo';
-import { EchoHost } from '@dxos/echo-host';
+import { EchoHost, type QueryExecutorMode } from '@dxos/echo-host';
 import { createIdFromSpaceKey } from '@dxos/echo-protocol';
 import { TestSchema } from '@dxos/echo/testing';
 import { EffectEx } from '@dxos/effect';
@@ -43,6 +43,8 @@ type PeerOptions = {
   assignQueuePositions?: boolean;
   /** Path to a file-based SQLite database for persistence tests. Uses in-memory SQLite when omitted. */
   storagePath?: string;
+  /** Host query evaluation path; defaults to the environment's `DX_ECHO_QUERY_EXECUTOR`, else `memory`. */
+  queryExecutor?: QueryExecutorMode;
 };

 export class EchoTestBuilder extends Resource {
@@ -86,6 +88,7 @@ export class EchoTestPeer extends Resource {
   private readonly _registry: Entity.Unknown[];
   private readonly _assignQueuePositions?: boolean;
   private readonly _storagePath?: string;
+  private readonly _queryExecutor?: QueryExecutorMode;
   private readonly _clients = new Set<EchoClient>();
   private _echoHost!: EchoHost;
   private _echoClient!: EchoClient;
```

```diff file=packages/core/echo/echo-host/src/db-host/query-service.ts lines=19-239
@@ -19,7 +19,7 @@ import { QueryService } from '@dxos/protocols/rpc';
 import { trace } from '@dxos/tracing';

 import { type AutomergeHost } from '../automerge/index.ts';
-import { QueryExecutor } from '../query/index.ts';
+import { type ExecutionTrace, QueryExecutor, type QueryExecutorMode } from '../query/index.ts';
 import { type InvalidationHint, mergeHints } from './invalidation-hint.ts';
 import type { SpaceStateManager } from './space-state-manager.ts';

@@ -36,6 +36,16 @@ export type QueryServiceProps = {
    * fallback, so the index is their only source of truth.
    */
   updateIndexes: () => Promise<void>;
+
+  /**
+   * True once every indexed object has a snapshot. The compiled executor reads that store rather
+   * than loading documents, so while it is still filling after upgrade a query awaits indexing
+   * before its first execution. Ignored on the in-memory path, which loads documents itself.
+   */
+  hasCompleteSnapshots?: () => Promise<boolean>;
+
+  /** Evaluation path for every query this service creates; see {@link QueryExecutorMode}. */
+  executor?: QueryExecutorMode;
 };

 /**
@@ -208,6 +233,7 @@ export class QueryServiceImpl extends Resource implements QueryService.Handlers
         queryId: request.queryId ?? raise(new Error('query id required')),
         query: parsedQuery,
         reactivity: request.reactivity,
+        executor: this._params.executor,
         spaceStateManager: this._params.spaceStateManager,
       }),
       dirty: true,
```

```diff file=packages/core/echo/echo-host/src/query/query-executor.ts lines=3-2601
@@ -3,8 +3,8 @@
 //

 import type { AutomergeUrl, DocumentId } from '@automerge/automerge-repo';
-import type * as Effect from 'effect/Effect';
-import type * as SqlClient from 'effect/unstable/sql/SqlClient';
+import * as Effect from 'effect/Effect';
+import * as SqlClient from 'effect/unstable/sql/SqlClient';

 import { ContextDisposedError, LifecycleState, Resource } from '@dxos/context';
 import { type Obj, Query } from '@dxos/echo';
@@ -42,6 +42,25 @@ import { QueryError } from './errors.ts';
 import { type GroupAggregates, GroupBy, type GroupKeyValue } from './group-by.ts';
 import { QueryPlan } from './plan.ts';
 import { QueryPlanner, filterContainsInQuery } from './query-planner.ts';
+import { type CompiledRow, compilePlan, planReadsObjectMeta } from './sql/index.ts';
+
+/**
+ * Which evaluation path answers queries: `memory` loads the objects a plan touches and evaluates
+ * every step in JS; `sql` compiles the plan into one SQLite statement over the index tables and
+ * loads nothing. `memory` is the default — the compiled path is opt-in per host through
+ * {@link QueryExecutorOptions.executor}, else by the `DX_ECHO_QUERY_EXECUTOR` environment variable.
+ */
+export type QueryExecutorMode = 'sql' | 'memory';
+
+export const resolveQueryExecutorMode = (explicit?: QueryExecutorMode): QueryExecutorMode => {
+  if (explicit) {
+    return explicit;
+  }
+  const fromEnv =
+    import.meta.env?.DX_ECHO_QUERY_EXECUTOR ??
+    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DX_ECHO_QUERY_EXECUTOR;
+  return fromEnv === 'sql' ? 'sql' : 'memory';
+};

 type QueryExecutorOptions = {
   indexEngine: IndexEngine;
@@ -52,6 +71,7 @@ type QueryExecutorOptions = {
   queryId: string;
   query: QueryAST.Query;
   reactivity: QueryReactivity;
+  executor?: QueryExecutorMode;
 };

 type QueryExecutionResult = {
@@ -114,6 +134,12 @@ type QueryItem = {
    * `AggregateStep` kept one member per group and the result ships only `groupKey`/`aggregates`.
    */
   collapsed?: { size: number };
+
+  /**
+   * The shipped form, already built by a `SqlStep` from the row SQLite returned. Such an item
+   * carries no document, data or meta, so it is only ever produced by the plan's last step.
+   */
+  result?: QueryService.QueryResult;
 };

 const QueryItem = Object.freeze({
@@ -311,6 +337,11 @@ export type ExecutionTrace = {
   documentLoadTime: number;

   children: ExecutionTrace[];
+
+  /** The compiled statement, on the `sql` path. */
+  sql?: string;
+  /** `EXPLAIN QUERY PLAN` of that statement, when execution tracing is on. */
+  explain?: string[];
 };

 export const ExecutionTrace = Object.freeze({
@@ -381,6 +412,7 @@ declare global {

   interface ImportMetaEnv {
     DX_TRACE_QUERY_EXECUTION: string;
+    DX_ECHO_QUERY_EXECUTOR: string;
   }
 }

@@ -832,6 +918,9 @@ export class QueryExecutor extends Resource {
       case 'AggregateStep':
         ({ workingSet: newWorkingSet, trace } = await this._execAggregateStep(step, workingSet));
         break;
+      case 'SqlStep':
+        ({ workingSet: newWorkingSet, trace } = await this._execSqlStep(step));
+        break;
       default:
         throw new Error(`Unknown step type: ${(step as any)._tag}`);
     }
@@ -2426,3 +2542,60 @@ function filterContainsTimestamp(filter: QueryAST.Filter): boolean {
  * resolution across every occurrence of the same subquery within an `execQuery` run.
  */
 const _inQueryCacheKey = (node: QueryAST.FilterInQuery): string => `${JSON.stringify(node.subquery)}\0${node.property}`;
+
+/**
+ * A compiled row as a working-set item. The shipped form is built here rather than in
+ * `getResults`, since the row already carries everything the client needs and the item carries no
+ * document to derive it from. A collapsed group stands for its members, so it ships no object
+ * fields and its id is the serialized group key.
+ */
+const compiledRowToItem = (row: CompiledRow): QueryItem => {
+  const result: QueryService.QueryResult =
+    row.aggregates !== null && row.groupKey !== null
+      ? {
+          id: row.groupKey,
+          spaceId: row.spaceId,
+          rank: row.rank,
+          groupKey: row.groupKey,
+          groupCount: row.groupCount ?? undefined,
+          aggregates: row.aggregates,
+        }
+      : {
+          id: row.objectId,
+          spaceId: row.spaceId,
+          documentId: row.documentId !== '' ? row.documentId : undefined,
+          queueId: row.queueId !== '' ? row.queueId : undefined,
+          queueNamespace: row.queueNamespace !== '' ? row.queueNamespace : undefined,
+          rank: row.rank,
+          documentJson: row.documentJson ?? undefined,
+          groupKey: row.groupKey ?? undefined,
+          groupCount: row.groupCount ?? undefined,
+        };
+  return {
+    objectId: row.objectId,
+    spaceId: row.spaceId,
+    documentId: row.documentId !== '' ? (row.documentId as DocumentId) : null,
+    queueId: row.queueId !== '' ? (row.queueId as EntityId) : null,
+    queueNamespace: row.queueNamespace !== '' ? row.queueNamespace : null,
+    doc: null,
+    data: null,
+    rank: row.rank,
+    createdAt: row.createdAt,
+    updatedAt: row.updatedAt,
+    result,
+  };
+};
+
+/** Whether two compiled rows would ship the same record, for reactive change detection. */
+const _sameCompiledResult = (
+  a: QueryService.QueryResult | undefined,
+  b: QueryService.QueryResult | undefined,
+): boolean =>
+  a?.id === b?.id &&
+  a?.spaceId === b?.spaceId &&
+  a?.documentId === b?.documentId &&
+  a?.queueId === b?.queueId &&
+  a?.queueNamespace === b?.queueNamespace &&
+  a?.groupKey === b?.groupKey &&
+  a?.groupCount === b?.groupCount &&
+  a?.aggregates === b?.aggregates;
```

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.test.ts lines=9-15
@@ -9,7 +9,7 @@ import * as Layer from 'effect/Layer';
 import * as Reactivity from 'effect/unstable/reactivity/Reactivity';
 import * as SqlClient from 'effect/unstable/sql/SqlClient';

-import { ATTR_DELETED, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';
+import { ATTR_DELETED, ATTR_PARENT, ATTR_RELATION_SOURCE, ATTR_RELATION_TARGET, ATTR_TYPE } from '@dxos/echo/internal';
 import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';

 import { ConvergenceKeyIntentStore } from '../convergence-key-intent-store.ts';
```

```diff file=packages/core/echo/index-core/src/indexes/entity-meta-index.ts lines=247-556
@@ -218,7 +247,7 @@ export interface NaturalQueueWindow {
  * Empty when there is no window, so the unwindowed query keeps its previous shape (and its
  * unspecified row order).
  */
-const buildQueueWindow = (sql: SqlClient.SqlClient, window: QueueWindow | undefined): Statement.Fragment => {
+export const buildQueueWindow = (sql: SqlClient.SqlClient, window: QueueWindow | undefined): Statement.Fragment => {
   if (window === undefined) {
     return sql``;
   }
@@ -426,15 +455,18 @@ export class EntityMetaIndex implements Index {
               source: string | null;
               target: string | null;
               parent: string | null;
+              parentId: string | null;
+              sourceId: string | null;
+              targetId: string | null;
               convergenceKey: string | null;
             };
             let existing: readonly ExistingRow[];
             if (documentId) {
               existing =
-                yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent, convergenceKey FROM objectMeta WHERE spaceId = ${spaceId} AND documentId = ${documentId} AND objectId = ${objectId} LIMIT 1`;
+                yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent, parentId, sourceId, targetId, convergenceKey FROM objectMeta WHERE spaceId = ${spaceId} AND documentId = ${documentId} AND objectId = ${objectId} LIMIT 1`;
             } else if (queueId) {
               existing =
-                yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent, convergenceKey FROM objectMeta WHERE spaceId = ${spaceId} AND queueId = ${queueId} AND objectId = ${objectId} LIMIT 1`;
+                yield* sql<ExistingRow>`SELECT recordId, entityKind, typeDXN, source, target, parent, parentId, sourceId, targetId, convergenceKey FROM objectMeta WHERE spaceId = ${spaceId} AND queueId = ${queueId} AND objectId = ${objectId} LIMIT 1`;
             } else {
               // Should not happen based on IndexerObject definition (one must be present ideally), but handle gracefully.
               existing = [];
@@ -512,6 +548,9 @@ export class EntityMetaIndex implements Index {
                     source = ${source},
                     target = ${target},
                     parent = ${parent},
+                    parentId = ${parentId},
+                    sourceId = ${sourceId},
+                    targetId = ${targetId},
                     convergenceKey = ${convergenceKey},
                     updatedAt = ${updatedAtTimestamp},
                     queuePosition = ${queuePosition ?? null}
```

```diff file=packages/core/echo/index-core/src/indexes/reverse-ref-index.ts lines=13-19
@@ -13,7 +13,7 @@ import { ATTR_META } from '@dxos/echo/internal';
 import { DXN, EID, type EntityId, type SpaceId, URI } from '@dxos/keys';

 import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/reverse-ref/index.ts';
-import { type EntityPropPath, EscapedPropPath, chunkArray } from '../utils.ts';
+import { type EntityPropPath, EscapedPropPath, chunkArray, normalizePropPath } from '../utils.ts';
 import type { Index, IndexerObject } from './interface.ts';

 /**
```

```diff file=packages/core/echo/index-core/src/migrations/entity-meta/index.ts lines=13-19
@@ -13,6 +13,7 @@ import queuePosition from './0004_queue_position.sql?raw';
 import queueObjectId from './0005_queue_object_id.sql?raw';
 import queueObjectIdBySpace from './0006_queue_object_id_by_space.sql?raw';
 import { addConvergenceKey } from './0007_convergence_key.ts';
+import { addNormalizedIds } from './0008_normalized_ids.ts';

 /**
  * Columns added to `objectMeta` after it first shipped, with the DDL that adds them. Databases in
```

Generated or binary, not shown: .changeset/echo-query-sql-executor.md.
