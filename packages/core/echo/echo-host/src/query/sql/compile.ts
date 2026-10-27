//
// Copyright 2026 DXOS.org
//

import * as SqlClient from 'effect/sql/SqlClient';
import type * as Statement from 'effect/sql/Statement';

import {
  EncodedReference,
  EscapedPropPath,
  QueryAST,
  isEncodedReference,
  referenceIndexKey,
} from '@dxos/echo-protocol';
import { ATTR_META } from '@dxos/echo/internal';
import {
  type QueueRef,
  type QueueWindow,
  buildFtsCondition,
  buildQueueWindow,
  buildSourceCondition,
  buildTypeDxnCondition,
  normalizePropPath,
} from '@dxos/index-core';
import { DXN, EID, EntityId, type SpaceId } from '@dxos/keys';

import { QueryError } from '../errors.ts';
import { QueryPlan } from '../plan.ts';

/**
 * Depth bounds shared with the in-memory executor and `DeletionResolver`, so a query and garbage
 * collection agree on what counts as deleted or reachable.
 */
const MAX_DEPTH_FOR_DELETION_TRACING = 10;
const MAX_DEPTH_FOR_CHILD_OF_TRACING = 10;
const MAX_DEPTH_FOR_STRONG_DEP_TRACING = 10;

/** Keeps union branches ordered after one another without renumbering their rows. */
const UNION_BRANCH_STRIDE = 1_000_000_000;

/**
 * A working-set row's own metadata is a rowid lookup. `NOT INDEXED` keeps it one: given a `WHERE`
 * on `queueId` the planner would otherwise drive from `objectMeta` through the queue-position index
 * and probe the working set, a scan of every document instead of one seek per row.
 *
 * `objectMeta` indexes the joins below name explicitly. Without `ANALYZE` statistics SQLite rates an
 * equality on `queueId` (the leading column of the queue-position index, true of every document
 * row) as cheap as a seek on `(spaceId, objectId)`, and picks it; the traversal then scans every
 * document per reference. The names are fixed by the entity-meta migrations.
 */
const INDEX_SPACE_OBJECT = 'idx_object_index_objectId';
const INDEX_SPACE_TYPE = 'idx_object_index_typeDXN';
const INDEX_SPACE_QUEUE_OBJECT = 'idx_object_index_queueObjectId';
const INDEX_SPACE_PARENT = 'idx_object_index_parentId';
const INDEX_SPACE_SOURCE = 'idx_object_index_sourceId';
const INDEX_SPACE_TARGET = 'idx_object_index_targetId';

/** One row of a compiled query's final projection. */
export type CompiledRow = {
  recordId: number;
  objectId: EntityId;
  spaceId: SpaceId;
  documentId: string;
  queueId: string;
  queueNamespace: string;
  rank: number;
  createdAt: number | null;
  updatedAt: number | null;
  documentJson: string | null;
  /** JSON text of the group key; present iff the plan aggregates. */
  groupKey: string | null;
  groupCount: number | null;
  /**
   * JSON text of the scalar aggregate values, present iff the row stands for a whole group: the
   * query declared no `items` aggregate, so one member represents its group and `objectId` is the
   * serialized key rather than an object.
   */
  aggregates: string | null;
  /** JSON heads of the backing the row ships, present iff the index copy is at the document's saved heads. */
  heads: string | null;
  /** JSON heads the index copy was read at: the row's version, whether or not it backs the row. */
  versionHeads: string | null;
  /** A feed item's block position: the row's version. */
  queuePosition: number | null;
  /**
   * JSON array of the traversal edges that reached the row, one `{hop, from, to, kind, property, holder,
   * holderHeads}` per edge; present iff the plan is a linear traversal chain.
   */
  edges: string | null;
  /** JSON array of a collapsed group's members, each `{id, documentId, heads, position, contribution}`. */
  manifest: string | null;
};

/** Edges one row may carry: past it the row's derivation is left unknown, as a fan-in hub would overflow it. */
export const MAX_EDGES_PER_ROW = 512;

/**
 * Builds the plan of an `in-query` subquery. Injected rather than imported, because the planner
 * owns plan building and calls this compiler — importing it back would make the two modules cyclic.
 */
export type PlanSubquery = (query: QueryAST.Query) => QueryPlan.Plan;

export type CompiledQuery = {
  statement: Statement.Statement<CompiledRow>;
  /** The statement's SQL text with placeholders, for traces. */
  sql: string;
  /** The compiled plan: one `SqlStep` standing for every step the statement absorbed. */
  plan: QueryPlan.Plan;
};

/**
 * A working set as one CTE. Every relation carries the same columns so steps compose:
 * `recordId`, `objectId`, `spaceId`, `rank`, `ord` (position), and after an `AggregateStep` also
 * `groupKey`, `groupOrd`, `groupCount` plus one `agg_<name>` column per scalar aggregate.
 */
type Relation = {
  name: string;
  grouped?: GroupedShape;
};

type GroupedShape = {
  /** Result field names of every non-`items` aggregate, orderable as group columns. */
  aggregateNames: readonly string[];
  /** One row per group, carrying its aggregates, because the query asked for no members. */
  collapsed: boolean;
  /**
   * The keyed members of a collapsed group and each one's share of its scalar aggregates, over the `k`
   * (member), `m` (meta) and `d` (body) aliases, from which the final projection lists the group's manifest.
   */
  manifest?: { keyed: Relation; contribution: Fragment };
};

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const UNTYPED_INDEX_TYPE = 'type';

type Fragment = Statement.Fragment;

/**
 * Compiles a {@link QueryPlan.Plan} into one SQLite statement over the index tables.
 *
 * The compiler is a single pass over the plan's steps; each step becomes a CTE over the previous
 * one, and the final `SELECT` projects the identity of each row. It holds no state beyond the
 * CTE counter and the parameter-free fragments it builds, so one instance compiles one plan.
 */
export class SqlPlanCompiler {
  readonly #sql: SqlClient.SqlClient;
  readonly #ctes: Fragment[] = [];
  #counter = 0;
  /** Distinct `in-query` subqueries already compiled this plan, keyed as the executor caches them. */
  readonly #subqueries = new Map<string, string>();
  /** Whether any select in the plan scopes a space with its feeds, which lets a traversal reach feed items. */
  #includeAllFeeds = false;
  readonly #planSubquery: PlanSubquery;
  /** Depth of `#compilePlan` calls; 1 is the query's own chain, deeper is a union branch or a subquery. */
  #nesting = 0;
  /** The edge relation of each traversal on the query's own chain, by hop. */
  readonly #hops: Relation[] = [];
  /** Whether a traversal ran inside a union branch or subquery, whose derivations the chain cannot state. */
  #nestedTraversal = false;
  #feedCutoffs: ReadonlyMap<string, number> = new Map();

  constructor(sql: SqlClient.SqlClient, planSubquery: PlanSubquery) {
    this.#sql = sql;
    this.#planSubquery = planSubquery;
  }

  compile(plan: QueryPlan.Plan, options: CompileOptions = {}): CompiledQuery {
    const sql = this.#sql;
    this.#feedCutoffs = options.feedCutoffs ?? new Map();
    this.#includeAllFeeds = planIncludesAllFeeds(plan);
    let root = this.#compilePlan(plan, undefined);
    if (options.strongDependencyFilter !== false) {
      root = this.#compileStrongDependencyFilter(root);
    }
    const final = this.#final(root);
    const withClause = sql.join(', ', false)(this.#ctes);
    const statement = sql<CompiledRow>`WITH RECURSIVE ${withClause} ${final}`;
    const [text, params] = statement.compile();
    return {
      statement,
      sql: text,
      plan: QueryPlan.Plan.make([{ _tag: 'SqlStep', sql: text, params, steps: plan.steps }]),
    };
  }

  #fresh(prefix: string): string {
    return `${prefix}${this.#counter++}`;
  }

  #define(prefix: string, body: Fragment, grouped?: GroupedShape): Relation {
    const name = this.#fresh(prefix);
    this.#ctes.push(this.#sql`${this.#sql.literal(name)} AS (${body})`);
    return { name, grouped };
  }

  #ref(relation: Relation): Fragment {
    return this.#sql.literal(relation.name);
  }

  #compilePlan(plan: QueryPlan.Plan, input: Relation | undefined): Relation {
    const sql = this.#sql;
    this.#nesting++;
    try {
      let current: Relation =
        input ??
        this.#define(
          'empty',
          sql`SELECT NULL AS recordId, NULL AS objectId, NULL AS spaceId, 1.0 AS rank, 0 AS ord WHERE 0`,
        );
      for (const step of plan.steps) {
        current = this.#compileStep(step, current);
      }
      return current;
    } finally {
      this.#nesting--;
    }
  }

  #compileStep(step: QueryPlan.Step, ws: Relation): Relation {
    switch (step._tag) {
      case 'ClearWorkingSetStep':
        return this.#define('empty', this.#sql`SELECT * FROM ${this.#ref(ws)} WHERE 0`, ws.grouped);
      case 'SelectStep':
        return this.#compileSelect(step, ws);
      case 'FilterStep':
        return this.#compileFilter(step, ws);
      case 'FilterDeletedStep':
        return this.#compileFilterDeleted(step, ws);
      case 'TraverseStep':
        return this.#compileTraverse(step, ws);
      case 'UnionStep':
        return this.#compileUnion(step, ws);
      case 'SetDifferenceStep':
        return this.#compileSetDifference(step, ws);
      case 'OrderStep':
        return this.#compileOrder(step, ws);
      case 'LimitStep':
        return this.#compileLimitSkip(ws, { limit: step.limit });
      case 'SkipStep':
        return this.#compileLimitSkip(ws, { skip: step.skip });
      case 'AggregateStep':
        return this.#compileAggregate(step, ws);
      default:
        throw new QueryError({ message: `Unknown step type: ${(step as { _tag: string })._tag}`, context: {} });
    }
  }

  //
  // Select.
  //

  #compileSelect(step: QueryPlan.SelectStep, ws: Relation): Relation {
    const sql = this.#sql;
    const spaceScopes = step.scope.filter((scope): scope is QueryAST.SpaceScope => scope._tag === 'space');
    const spaces = spaceScopes.map((scope) => scope.spaceId as SpaceId);
    const queues = step.scope.filter((scope): scope is QueryAST.FeedScope => scope._tag === 'feed');
    const includeAllQueues = spaceScopes.some((scope) => scope.includeAllFeeds === true);
    const queueRefs = withFeedCutoffs(
      extractQueueRefs(queues.map((scope) => String(scope.feedUri))),
      this.#feedCutoffs,
    );
    const scope = buildSourceCondition(sql, spaces, includeAllQueues, queueRefs);
    const window = buildQueueWindow(sql, extractQueueWindow(step));

    let base: Fragment;
    switch (step.selector._tag) {
      case 'WildcardSelector':
        base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope}${window}`;
        break;
      case 'TypeSelector': {
        if (step.selector.typename.length === 0) {
          base = step.selector.inverted
            ? sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope}${window}`
            : sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
          break;
        }
        const typeCondition = buildTypeDxnCondition(sql, step.selector.typename);
        // Pinned: over a space the planner otherwise seeks `(spaceId, queueId)` and scans the space's
        // documents for the type. One feed is the exception: the type index would read that type in
        // every feed of the space (a chat's messages among every chat's), where the feed seek reads
        // only its rows. An inverted select cannot seek the type index, so it is left free.
        const index =
          spaces.length === 0 && queueRefs?.length === 1 && queueRefs[0].spaceId !== undefined
            ? INDEX_SPACE_QUEUE_OBJECT
            : INDEX_SPACE_TYPE;
        base = step.selector.inverted
          ? sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope} AND NOT (${typeCondition})${window}`
          : sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m INDEXED BY ${sql.literal(index)} WHERE ${scope} AND (${typeCondition})${window}`;
        break;
      }
      case 'IdSelector': {
        const ids = step.selector.objectIds.filter((id) => EntityId.isValid(id));
        base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${scope} AND m.objectId IN (SELECT value FROM json_each(${JSON.stringify(ids)}))`;
        break;
      }
      case 'TimestampSelector': {
        const { updatedAfter, updatedBefore, createdAfter, createdBefore } = step.selector;
        const conditions: Fragment[] = [scope];
        if (updatedAfter != null) {
          conditions.push(sql`m.updatedAt >= ${updatedAfter}`);
        }
        if (updatedBefore != null) {
          conditions.push(sql`m.updatedAt <= ${updatedBefore}`);
        }
        if (createdAfter != null) {
          conditions.push(sql`m.createdAt >= ${createdAfter}`);
        }
        if (createdBefore != null) {
          conditions.push(sql`m.createdAt <= ${createdBefore}`);
        }
        base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE ${sql.and(conditions)}`;
        break;
      }
      case 'IncomingReferenceSelector': {
        const target = referenceIndexKey(step.selector.targetDXN);
        if (target === undefined) {
          base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
          break;
        }
        const pathCondition = this.#propPathCondition(step.selector.property);
        // The index is not scoped by space; the select's scope narrows the referrers, as the
        // executor filtered them after the lookup.
        const spaceCondition =
          spaces.length > 0 ? sql`m.spaceId IN (SELECT value FROM json_each(${JSON.stringify(spaces)}))` : sql`1 = 1`;
        base = sql`SELECT DISTINCT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM reverseRef r JOIN objectMeta m ON m.recordId = r.recordId WHERE r.targetDXN = ${target} AND ${pathCondition} AND ${spaceCondition}`;
        break;
      }
      case 'TextSelector': {
        if (step.selector.searchKind === 'vector') {
          base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
          break;
        }
        const fts = buildFtsCondition(sql, step.selector.text);
        if (fts === undefined) {
          base = sql`SELECT m.recordId, m.objectId, m.spaceId, 1.0 AS rank FROM objectMeta m WHERE 0`;
          break;
        }
        const conditions: Fragment[] = [fts.condition, scope];
        if (step.selector.typename !== null) {
          conditions.push(
            step.selector.typename.length > 0 ? sql`(${buildTypeDxnCondition(sql, step.selector.typename)})` : sql`0`,
          );
        }
        // Both branches read `ftsIndex`, as `FtsIndex.query` does: the index stores the extracted
        // text, so a term below the trigram minimum scans that column rather than another store.
        const rank = fts.ranked ? sql`-bm25(ftsIndex)` : sql`1.0`;
        base = sql`SELECT m.recordId, m.objectId, m.spaceId, ${rank} AS rank FROM ftsIndex f JOIN objectMeta m ON m.recordId = f.rowid WHERE ${sql.and(conditions)}`;
        break;
      }
      default:
        throw new QueryError({
          message: `Unknown selector type: ${(step.selector as { _tag: string })._tag}`,
          context: {},
        });
    }

    // A select appends to the incoming working set. Every plan orders after its last set changer
    // (`QueryPlanner._ensureOrderStep`), so the scan's own order only matters when the planner
    // pushed a limit into this step: then the first rows in natural order (rank for a text search,
    // id otherwise) are the ones kept, and numbering them costs a sort of the candidates.
    const selected = this.#define('sel', base);
    const orderNew = step.selector._tag === 'TextSelector' ? sql`s.rank DESC, s.objectId` : sql`s.objectId`;
    const ord =
      step.limit !== undefined ? sql`${UNION_BRANCH_STRIDE} + ROW_NUMBER() OVER (ORDER BY ${orderNew})` : sql`0`;
    const appended = sql`
      SELECT recordId, objectId, spaceId, rank, ord FROM ${this.#ref(ws)}
      UNION ALL
      SELECT s.recordId, s.objectId, s.spaceId, s.rank, ${ord} AS ord
      FROM ${this.#ref(selected)} s`;
    const union = this.#define('ws', appended);
    if (step.limit === undefined) {
      return union;
    }
    return this.#define('ws', sql`SELECT * FROM ${this.#ref(union)} ORDER BY ord LIMIT ${step.limit}`);
  }

  /** Reverse-reference rows at a property, matching the executor's index-vs-query path rule. */
  #propPathCondition(property: string | null): Fragment {
    const sql = this.#sql;
    if (property === null) {
      return sql`1 = 1`;
    }
    const normalized = EscapedPropPath.escape(normalizePropPath(EscapedPropPath.unescape(property)));
    return sql`(r.propPathNormalized = ${normalized} OR r.propPath = ${property})`;
  }

  //
  // Filter.
  //

  #compileFilter(step: QueryPlan.FilterStep, ws: Relation): Relation {
    const sql = this.#sql;
    if (step.filter.type === 'child-of') {
      return this.#compileChildOf(step.filter, ws);
    }
    const predicate = this.#compileRootPredicate(step.filter);
    return this.#define(
      'ws',
      sql`SELECT w.* FROM ${this.#ref(ws)} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId WHERE ${predicate}`,
      ws.grouped,
    );
  }

  /**
   * A filter at the root of a `FilterStep`, evaluated against the row `m`/`d`. Mirrors
   * `makeFilterMatcher`: `object` checks type, id, props and meta; the rest are boolean
   * composition or local predicates.
   */
  #compileRootPredicate(filter: QueryAST.Filter): Fragment {
    const sql = this.#sql;
    switch (filter.type) {
      case 'object': {
        const conditions: Fragment[] = [];
        if (filter.typename !== null) {
          conditions.push(sql`(${this.#typenameCondition(filter.typename)})`);
        }
        if (filter.id && filter.id.length > 0) {
          conditions.push(sql`m.objectId IN (SELECT value FROM json_each(${JSON.stringify(filter.id)}))`);
        }
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          // `@`-prefixed keys address annotations, never data.
          if (key.startsWith('@')) {
            continue;
          }
          conditions.push(this.#compileValuePredicate(valueFilter, [key]));
        }
        if (filter.foreignKeys && filter.foreignKeys.length > 0) {
          conditions.push(sql`EXISTS (
            SELECT 1 FROM json_each(d.snapshot, ${jsonPathLiteral(sql, [ATTR_META, 'keys'])}) k, json_each(${JSON.stringify(filter.foreignKeys)}) f
            WHERE json_extract(k.value, '$.source') = json_extract(f.value, '$.source') AND json_extract(k.value, '$.id') = json_extract(f.value, '$.id'))`);
        }
        if (filter.metaKey !== undefined) {
          const keyPath = jsonPathLiteral(sql, [ATTR_META, 'key']);
          conditions.push(sql`json_extract(d.snapshot, ${keyPath}) = ${filter.metaKey}`);
          if (filter.metaVersion !== undefined) {
            // Resolving a semver range needs the versions present in the store, so `planDeclinedByCompiler`
            // sends these plans to the in-memory executor before compilation starts.
            throw new QueryError({
              message: 'metaVersion filter is not compilable',
              context: { key: filter.metaKey },
            });
          }
        }
        return conditions.length === 0 ? sql`1 = 1` : sql`(${sql.and(conditions)})`;
      }
      case 'tag': {
        const tagsPath = jsonPathLiteral(sql, [ATTR_META, 'tags']);
        const target = canonicalTag(filter.tag);
        // A tag is an encoded reference or (legacy) a bare URI; both sides compare by entity id.
        return sql`EXISTS (SELECT 1 FROM json_each(d.snapshot, ${tagsPath}) t
          WHERE ${localIdOfUri(sql, tagUriOf(sql, sql`t`))} = ${target})`;
      }
      case 'annotation': {
        // Keys are matched with `json_each` rather than a JSON path, which cannot address every key
        // (e.g. a legacy id containing `"`); a NULL column or absent key is a definite non-match, so
        // `not` keeps entities that never carried the annotation.
        const annotations = sql`json_each(COALESCE(m.annotations, '{}'))`;
        return filter.value === undefined
          ? sql`EXISTS (SELECT 1 FROM ${annotations} a WHERE a.key = ${filter.key})`
          : sql`EXISTS (SELECT 1 FROM ${annotations} a WHERE a.key = ${filter.key} AND ${scalarEquals(sql, sql`a.value`, sql`a.type`, filter.value)})`;
      }
      case 'text-search':
        // The executors behind an index resolve text search in the select; a residual node
        // matches nothing, as the in-memory matcher's `noTextSearch` does.
        return sql`0`;
      case 'timestamp':
        return this.#timestampCondition(filter);
      case 'has-parent':
        return filter.value ? sql`m.parent IS NOT NULL` : sql`m.parent IS NULL`;
      case 'mnemonic':
        return sql`upper(substr(m.objectId, -${EntityId.mnemonicLength})) = ${EntityId.normalizeMnemonic(filter.mnemonic)}`;
      case 'not':
        return sql`NOT (${this.#compileRootPredicate(filter.filter)})`;
      case 'and':
        return filter.filters.length === 0
          ? sql`1 = 1`
          : sql`(${sql.and(filter.filters.map((inner) => this.#compileRootPredicate(inner)))})`;
      case 'or':
        return filter.filters.length === 0
          ? sql`0`
          : sql`(${sql.or(filter.filters.map((inner) => this.#compileRootPredicate(inner)))})`;
      case 'child-of':
        throw new QueryError({ message: 'child-of must be the root of its filter step', context: {} });
      case 'in-query':
        throw new QueryError({ message: 'in-query is valid only inside an object filter', context: {} });
      case 'feed-cursor':
        throw new QueryError({ message: 'feed-cursor filters are lifted onto the select step', context: {} });
      default:
        // Property-level predicates at the root are rejected by the planner; matching nothing
        // mirrors `makeFilterMatcher`'s default arm.
        return sql`0`;
    }
  }

  #timestampCondition(filter: QueryAST.FilterTimestamp): Fragment {
    const sql = this.#sql;
    const column = filter.field === 'updatedAt' ? sql`m.updatedAt` : sql`m.createdAt`;
    // The index treats both bounds as inclusive, whichever operator the filter carries.
    return filter.operator === 'gt' || filter.operator === 'gte'
      ? sql`${column} >= ${filter.value}`
      : sql`${column} <= ${filter.value}`;
  }

  /** `compareTypenameStrings` over the stored `typeDXN`: exact when versioned, every version otherwise. */
  #typenameCondition(typename: string): Fragment {
    const sql = this.#sql;
    const forms: string[] = [typename];
    const dxn = DXN.tryMake(typename);
    if (dxn && DXN.getVersion(dxn) !== undefined) {
      // A stored versionless type matches any expected version.
      forms.push(DXN.make<string>(DXN.getName(dxn)));
    }
    return sql.or(forms.map((form) => sql`(${buildTypeDxnCondition(sql, [form])})`));
  }

  /**
   * A predicate on one property value, mirroring `filterMatchValue`. Comparisons are typed: a
   * value matches a string operand only when it is a string, a number operand only when a number.
   */
  #compileValuePredicate(filter: QueryAST.Filter, path: readonly string[]): Fragment {
    const sql = this.#sql;
    const at = jsonPathLiteral(sql, path);
    const value = sql`json_extract(d.snapshot, ${at})`;
    // Coalesced so a missing property yields a definite `false`, never SQL's NULL: `NOT` over a
    // NULL is NULL, which would drop rows the matcher's `!==` keeps.
    const type = sql`COALESCE(json_type(d.snapshot, ${at}), 'missing')`;
    switch (filter.type) {
      case 'compare': {
        const operand = filter.value;
        switch (filter.operator) {
          case 'eq':
            return this.#equalsOperand(path, operand);
          case 'neq':
            return sql`NOT ${this.#equalsOperand(path, operand)}`;
          case 'gt':
          case 'gte':
          case 'lt':
          case 'lte': {
            const op = { gt: '>', gte: '>=', lt: '<', lte: '<=' }[filter.operator];
            if (typeof operand === 'number') {
              return sql`(${type} IN ('integer', 'real') AND ${value} ${sql.literal(op)} ${operand})`;
            }
            if (typeof operand === 'string') {
              return sql`(${type} = 'text' AND ${value} ${sql.literal(op)} ${operand})`;
            }
            return sql`0`;
          }
          default:
            return sql`0`;
        }
      }
      case 'object': {
        const nested: Fragment[] = [sql`${type} = 'object'`];
        for (const [key, valueFilter] of Object.entries(filter.props ?? {})) {
          nested.push(this.#compileValuePredicate(valueFilter, [...path, key]));
        }
        return sql`(${sql.and(nested)})`;
      }
      case 'in': {
        const values = filter.values.map(normalizeInValue);
        const strings = values.filter((candidate): candidate is string => typeof candidate === 'string');
        const numbers = values.filter((candidate): candidate is number => typeof candidate === 'number');
        const booleans = values.filter((candidate): candidate is boolean => typeof candidate === 'boolean');
        const branches: Fragment[] = [];
        const refOrValue = sql`COALESCE(json_extract(d.snapshot, ${jsonPathLiteral(sql, [...path, '/'])}), ${value})`;
        if (strings.length > 0) {
          branches.push(
            sql`(${type} IN ('text', 'object') AND ${refOrValue} IN (SELECT value FROM json_each(${JSON.stringify(strings)})))`,
          );
        }
        if (numbers.length > 0) {
          branches.push(
            sql`(${type} IN ('integer', 'real') AND ${value} IN (SELECT value FROM json_each(${JSON.stringify(numbers)})))`,
          );
        }
        if (booleans.includes(true)) {
          branches.push(sql`${type} = 'true'`);
        }
        if (booleans.includes(false)) {
          branches.push(sql`${type} = 'false'`);
        }
        if (values.includes(null)) {
          branches.push(sql`${type} = 'null'`);
        }
        return branches.length === 0 ? sql`0` : sql`(${sql.or(branches)})`;
      }
      case 'in-query': {
        const subquery = this.#compileInQuery(filter);
        const refOrValue = sql`COALESCE(json_extract(d.snapshot, ${jsonPathLiteral(sql, [...path, '/'])}), ${value})`;
        return sql`COALESCE(${refOrValue} IN (SELECT v FROM ${sql.literal(subquery)}), 0)`;
      }
      case 'contains': {
        const element = filter.value;
        if (typeof element === 'object' && element !== null && !Array.isArray(element)) {
          return sql`(${type} = 'array' AND EXISTS (SELECT 1 FROM json_each(d.snapshot, ${at}) e WHERE ${structuralMatch(sql, sql`e.value`, element)}))`;
        }
        return sql`(${type} = 'array' AND EXISTS (SELECT 1 FROM json_each(d.snapshot, ${at}) e WHERE ${scalarEquals(sql, sql`e.value`, sql`e.type`, element)}))`;
      }
      case 'range': {
        if (typeof filter.from === 'number' && typeof filter.to === 'number') {
          return sql`(${type} IN ('integer', 'real') AND ${value} >= ${filter.from} AND ${value} <= ${filter.to})`;
        }
        if (typeof filter.from === 'string' && typeof filter.to === 'string') {
          return sql`(${type} = 'text' AND ${value} >= ${filter.from} AND ${value} <= ${filter.to})`;
        }
        return sql`0`;
      }
      case 'not':
        return sql`NOT ${this.#compileValuePredicate(filter.filter, path)}`;
      case 'and':
        return filter.filters.length === 0
          ? sql`1 = 1`
          : sql`(${sql.and(filter.filters.map((inner) => this.#compileValuePredicate(inner, path)))})`;
      case 'or':
        return filter.filters.length === 0
          ? sql`0`
          : sql`(${sql.or(filter.filters.map((inner) => this.#compileValuePredicate(inner, path)))})`;
      default:
        return sql`0`;
    }
  }

  /** Strict equality of a property against an operand, `undefined` meaning "absent". */
  #equalsOperand(path: readonly string[], operand: unknown): Fragment {
    const sql = this.#sql;
    const at = jsonPathLiteral(sql, path);
    const value = sql`json_extract(d.snapshot, ${at})`;
    const type = sql`COALESCE(json_type(d.snapshot, ${at}), 'missing')`;
    if (operand === undefined) {
      return sql`(${type} = 'missing')`;
    }
    if (isEncodedReference(operand)) {
      return sql`(COALESCE(json_extract(d.snapshot, ${jsonPathLiteral(sql, [...path, '/'])}) = ${EncodedReference.toURI(operand)}, 0))`;
    }
    return scalarEquals(sql, value, type, operand);
  }

  /** Compiles the subquery of an `in-query` node once and returns the CTE holding its projection. */
  #compileInQuery(filter: QueryAST.FilterInQuery): string {
    const sql = this.#sql;
    const key = `${JSON.stringify(filter.subquery)}\0${filter.property}`;
    const existing = this.#subqueries.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const subPlan = this.#planSubquery(filter.subquery);
    const result = this.#compilePlan(subPlan, undefined);
    const at = jsonPathLiteral(sql, [filter.property]);
    const refAt = jsonPathLiteral(sql, [filter.property, '/']);
    // Missing and null projected values never broaden the membership set.
    const projection = this.#define(
      'sub',
      sql`SELECT COALESCE(json_extract(d.snapshot, ${refAt}), json_extract(d.snapshot, ${at})) AS v FROM ${this.#ref(result)} w JOIN objectSnapshot d ON d.recordId = w.recordId WHERE json_type(d.snapshot, ${at}) IS NOT NULL AND json_type(d.snapshot, ${at}) != 'null'`,
    );
    this.#subqueries.set(key, projection.name);
    return projection.name;
  }

  //
  // Deleted, child-of, strong deps: recursive walks over the dependency columns.
  //

  #compileFilterDeleted(step: QueryPlan.FilterDeletedStep, ws: Relation): Relation {
    const sql = this.#sql;
    const wsRef = this.#ref(ws);
    // Dependencies whose deletion cascades: the parent chain, plus a relation's endpoints. Each
    // row's direct dependencies are the walk's seeds; rows share them (a collection's items, one
    // parent), so the chain is walked once per distinct seed, not once per row.
    const seedId = sql`CASE f.k WHEN 0 THEN m.parentId WHEN 1 THEN m.sourceId ELSE m.targetId END`;
    const seeds = this.#define(
      'seed',
      // `CAST` gives the column TEXT affinity, without which the probes below cannot seek on it.
      sql`SELECT DISTINCT m.spaceId, CAST(${seedId} AS TEXT) AS seedId
        FROM ${wsRef} w CROSS JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId CROSS JOIN ${fanOut(sql, 3)} f
        WHERE (f.k = 0 OR m.entityKind = 'relation') AND ${seedId} IS NOT NULL`,
    );
    // Each seed's chain to the executor's depth; the seed itself sits at depth 1.
    const chain = this.#define(
      'chain',
      sql`
      SELECT spaceId, seedId, seedId AS depId, 1 AS depth FROM ${this.#ref(seeds)}
      UNION
      SELECT x.spaceId, x.seedId, p.parentId, x.depth + 1
        FROM ${sql.literal(this.#peekName('chain'))} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId
        WHERE x.depth < ${MAX_DEPTH_FOR_DELETION_TRACING} AND p.deleted = 0 AND p.parentId IS NOT NULL`,
    );
    // `CROSS JOIN` keeps the chain outer: the planner otherwise scans every document row and probes the chain.
    const deadSeeds = this.#define(
      'dead',
      sql`SELECT DISTINCT x.spaceId, x.seedId FROM ${this.#ref(chain)} x
        CROSS JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId
        WHERE p.deleted = 1`,
    );
    // One probe per column: an `OR` inside one `EXISTS` cannot seek the dead seeds.
    const dead = (column: Fragment) =>
      sql`EXISTS (SELECT 1 FROM ${this.#ref(deadSeeds)} s WHERE s.spaceId = m.spaceId AND s.seedId = ${column})`;
    const isDeleted = sql`(m.deleted = 1 OR ${dead(sql`m.parentId`)}
      OR (m.entityKind = 'relation' AND (${dead(sql`m.sourceId`)} OR ${dead(sql`m.targetId`)})))`;
    const condition = step.mode === 'only-deleted' ? isDeleted : sql`NOT ${isDeleted}`;
    return this.#define(
      'ws',
      sql`SELECT w.* FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId WHERE ${condition}`,
      ws.grouped,
    );
  }

  /** The name the next `#define` with this prefix will receive, for a recursive CTE's self-reference. */
  #peekName(prefix: string): string {
    return `${prefix}${this.#counter}`;
  }

  #compileChildOf(filter: QueryAST.FilterChildOf, ws: Relation): Relation {
    const sql = this.#sql;
    const parentIds: string[] = [];
    for (const parent of filter.parents) {
      const eid = EID.tryParse(parent);
      const objectId = eid ? EID.getEntityId(eid) : undefined;
      if (objectId) {
        parentIds.push(objectId);
      }
    }
    const maxDepth = filter.transitive ? MAX_DEPTH_FOR_CHILD_OF_TRACING : 1;
    const wsRef = this.#ref(ws);
    // A feed item's parent is its feed when it carries no parent of its own.
    const anc = this.#define(
      'anc',
      sql`
      SELECT w.recordId, m.spaceId, COALESCE(m.parentId, CASE WHEN m.parentId IS NULL AND m.parent IS NULL AND m.queueId != '' THEN m.queueId END) AS ancestorId, 1 AS depth
        FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
      UNION ALL
      SELECT x.recordId, x.spaceId, p.parentId, x.depth + 1
        FROM ${sql.literal(this.#peekName('anc'))} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.ancestorId
        WHERE x.depth < ${maxDepth} AND p.parentId IS NOT NULL`,
    );
    return this.#define(
      'ws',
      sql`SELECT w.* FROM ${wsRef} w WHERE EXISTS (
        SELECT 1 FROM ${this.#ref(anc)} x WHERE x.recordId = w.recordId AND x.ancestorId IS NOT NULL
          AND x.ancestorId IN (SELECT value FROM json_each(${JSON.stringify(parentIds)})))`,
      ws.grouped,
    );
  }

  /**
   * Drops document rows whose strong dependencies (schema object, relation endpoints, parent, tags) are
   * absent from the space's indexed documents, transitively, so they never reach a client that
   * could not hydrate them. Cross-space dependencies are not gated, as `ObjectCore` does not gate them.
   */
  #compileStrongDependencyFilter(ws: Relation): Relation {
    const sql = this.#sql;
    const wsRef = this.#ref(ws);
    // One row's direct strong dependencies: its schema object, parent and a relation's endpoints
    // (one per `f.k`), and the tags in its snapshot's meta.
    const columnDep = (row: string) => {
      const table = sql.literal(row);
      return sql`CASE f.k WHEN 0 THEN ${localIdOfLocalUri(sql, sql`${table}.typeDXN`)} WHEN 1 THEN ${table}.parentId
        WHEN 2 THEN CASE WHEN ${table}.entityKind = 'relation' THEN ${table}.sourceId END
        ELSE CASE WHEN ${table}.entityKind = 'relation' THEN ${table}.targetId END END`;
    };
    const tagsPath = jsonPathLiteral(sql, [ATTR_META, 'tags']);
    const tagId = localIdOfLocalUri(sql, tagUriOf(sql, sql`t`));
    // Materialized: read once for the distinct seeds and once for the rows they condemn.
    const seedsName = this.#fresh('sseed');
    this.#ctes.push(
      sql`${sql.literal(seedsName)} AS MATERIALIZED (
        SELECT w.recordId, m.spaceId, CAST(${columnDep('m')} AS TEXT) AS depId
          FROM ${wsRef} w CROSS JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId CROSS JOIN ${fanOut(sql, 4)} f
          WHERE m.queueId = '' AND ${columnDep('m')} IS NOT NULL
        UNION ALL
        SELECT w.recordId, m.spaceId, ${tagId}
          FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId, json_each(d.snapshot, ${tagsPath}) t
          WHERE m.queueId = '' AND ${tagId} IS NOT NULL)`,
    );
    const seeds = sql.literal(seedsName);
    // A dependency's verdict does not depend on the row that reached it, so each distinct seed's
    // closure is walked once, to the executor's depth; the seed itself sits at depth 1. Each
    // level seeks the dependency row once and fans out to its own dependencies.
    const closure = this.#peekName('sclosure');
    this.#define(
      'sclosure',
      sql`
      SELECT DISTINCT spaceId, depId AS seedId, depId, 1 AS depth FROM ${seeds}
      UNION
      SELECT x.spaceId, x.seedId, ${columnDep('p')}, x.depth + 1
        FROM ${sql.literal(closure)} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId
        CROSS JOIN ${fanOut(sql, 4)} f
        WHERE x.depth < ${MAX_DEPTH_FOR_STRONG_DEP_TRACING} AND ${columnDep('p')} IS NOT NULL
      UNION
      SELECT x.spaceId, x.seedId, ${tagId}, x.depth + 1
        FROM ${sql.literal(closure)} x JOIN ${docRow(sql, 'p')} ON p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId
        JOIN objectSnapshot pd ON pd.recordId = p.recordId, json_each(pd.snapshot, ${tagsPath}) t
        WHERE x.depth < ${MAX_DEPTH_FOR_STRONG_DEP_TRACING} AND ${tagId} IS NOT NULL`,
    );
    const brokenSeeds = this.#define(
      'bseed',
      sql`SELECT DISTINCT x.spaceId, x.seedId FROM ${sql.literal(closure)} x
        WHERE NOT EXISTS (SELECT 1 FROM ${docRow(sql, 'p')} WHERE p.spaceId = x.spaceId AND p.queueId = '' AND p.objectId = x.depId)`,
    );
    const broken = this.#define(
      'broken',
      sql`SELECT s.recordId FROM ${seeds} s JOIN ${this.#ref(brokenSeeds)} b ON b.spaceId = s.spaceId AND b.seedId = s.depId`,
    );
    return this.#define(
      'ws',
      sql`SELECT w.* FROM ${wsRef} w WHERE w.recordId NOT IN (SELECT recordId FROM ${this.#ref(broken)})`,
      ws.grouped,
    );
  }

  //
  // Traversal.
  //

  #compileTraverse(step: QueryPlan.TraverseStep, ws: Relation): Relation {
    const sql = this.#sql;
    const edges = this.#compileTraverseEdges(step, ws);
    if (this.#nesting === 1) {
      this.#hops.push(edges);
    } else {
      this.#nestedTraversal = true;
    }
    // One row per object reached, at the best rank and first position of the anchors reaching it.
    return this.#define(
      'ws',
      sql`SELECT recordId, objectId, spaceId, MIN(rank) AS rank, MIN(ord) AS ord FROM ${this.#ref(edges)} GROUP BY recordId`,
    );
  }

  /**
   * Every edge a traversal crosses, one row per (anchor, object reached, way it was reached): the reached
   * object's identity, the anchor's rank and position, and the edge's kind, property and holder (the object
   * whose document records it), which the final projection ships as the row's derivations.
   */
  #compileTraverseEdges(step: QueryPlan.TraverseStep, ws: Relation): Relation {
    const sql = this.#sql;
    const wsRef = this.#ref(ws);
    const project = (kind: string, property: Fragment, holder: Fragment) =>
      sql`SELECT w.recordId AS fromRecordId, w.objectId AS fromObjectId, t.recordId, t.objectId, t.spaceId, w.rank, w.ord,
        ${kind} AS kind, ${property} AS property, ${holder}.recordId AS holderRecordId, ${holder}.objectId AS holderObjectId`;
    switch (step.traversal._tag) {
      case 'ReferenceTraversal': {
        if (step.traversal.direction === 'outgoing') {
          if (step.traversal.property === null) {
            throw new QueryError({ message: 'Outgoing reference traversal requires a property', context: {} });
          }
          const path = EscapedPropPath.unescape(step.traversal.property);
          const at = jsonPathLiteral(sql, path);
          // The property holds one reference or an array of them; either way each is `{"/": uri}`.
          const refs = sql`json_each(CASE json_type(d.snapshot, ${at}) WHEN 'array' THEN json_extract(d.snapshot, ${at}) ELSE json_array(json_extract(d.snapshot, ${at})) END)`;
          const uri = sql`json_extract(ref.value, '$."/"')`;
          // A target in a feed is reachable only when the plan scopes the space with its feeds.
          const target = this.#includeAllFeeds
            ? sql`objectMeta t INDEXED BY ${sql.literal(INDEX_SPACE_OBJECT)}`
            : docRow(sql, 't');
          const targetKind = this.#includeAllFeeds ? sql`1 = 1` : sql`t.queueId = ''`;
          return this.#define(
            'edges',
            sql`${project('ref', sql`${step.traversal.property}`, sql`w`)} FROM ${wsRef} w
              JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
              JOIN objectSnapshot d ON d.recordId = w.recordId
              JOIN ${refs} ref
              JOIN ${target} ON t.spaceId = COALESCE(${spaceIdOfUri(sql, uri)}, m.spaceId) AND t.objectId = ${localIdOfUri(sql, uri)} AND ${targetKind}
              WHERE ${uri} LIKE 'echo:%'`,
          );
        }
        // Incoming: the reverse index keys targets by their local form; the property narrows the
        // referrer's path.
        const pathCondition = this.#propPathCondition(step.traversal.property);
        return this.#define(
          'edges',
          sql`${project('incoming-ref', sql`r.propPath`, sql`t`)} FROM ${wsRef} w
            JOIN reverseRef r ON r.targetDXN = 'echo:///' || w.objectId
            JOIN objectMeta t ON t.recordId = r.recordId
            WHERE ${pathCondition}`,
        );
      }
      case 'RelationTraversal': {
        switch (step.traversal.direction) {
          case 'relation-to-source':
          case 'relation-to-target': {
            const toSource = step.traversal.direction === 'relation-to-source';
            const column = toSource ? sql`m.source` : sql`m.target`;
            return this.#define(
              'edges',
              sql`${project(toSource ? 'relation-source' : 'relation-target', sql`NULL`, sql`w`)} FROM ${wsRef} w
                JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
                JOIN ${docRow(sql, 't')} ON t.spaceId = COALESCE(${spaceIdOfUri(sql, column)}, m.spaceId) AND t.objectId = ${localIdOfUri(sql, column)} AND t.queueId = ''
                WHERE ${column} IS NOT NULL`,
            );
          }
          case 'source-to-relation':
          case 'target-to-relation': {
            const bySource = step.traversal.direction === 'source-to-relation';
            const column = bySource ? sql`t.sourceId` : sql`t.targetId`;
            const index = sql.literal(bySource ? INDEX_SPACE_SOURCE : INDEX_SPACE_TARGET);
            return this.#define(
              'edges',
              sql`${project(bySource ? 'relation-source' : 'relation-target', sql`NULL`, sql`t`)} FROM ${wsRef} w
                JOIN objectMeta t INDEXED BY ${index} ON t.spaceId = w.spaceId AND ${column} = w.objectId AND t.entityKind = 'relation'`,
            );
          }
        }
        break;
      }
      case 'HierarchyTraversal': {
        if (step.traversal.direction === 'to-parent') {
          return this.#define(
            'edges',
            sql`${project('parent', sql`NULL`, sql`w`)} FROM ${wsRef} w
              JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId
              JOIN ${docRow(sql, 't')} ON t.spaceId = COALESCE(${spaceIdOfUri(sql, sql`m.parent`)}, m.spaceId) AND t.objectId = ${localIdOfUri(sql, sql`m.parent`)} AND t.queueId = ''
              WHERE m.queueId = '' AND m.parent IS NOT NULL`,
          );
        }
        // Children by parent, and a feed's items by queue id (a feed's queue id is its object id).
        // Two seeks rather than one `OR`, which SQLite answers by scanning the space.
        return this.#define(
          'edges',
          sql`${project('child', sql`NULL`, sql`t`)} FROM ${wsRef} w
              JOIN objectMeta t INDEXED BY ${sql.literal(INDEX_SPACE_PARENT)} ON t.spaceId = w.spaceId AND t.parentId = w.objectId
            UNION ALL
            ${project('child', sql`NULL`, sql`t`)} FROM ${wsRef} w
              JOIN objectMeta t INDEXED BY ${sql.literal(INDEX_SPACE_QUEUE_OBJECT)} ON t.spaceId = w.spaceId AND t.queueId = w.objectId`,
        );
      }
    }
    throw new QueryError({
      message: `Unknown traversal type: ${(step.traversal as { _tag: string })._tag}`,
      context: {},
    });
  }

  //
  // Set operations.
  //

  #compileUnion(step: QueryPlan.UnionStep, ws: Relation): Relation {
    const sql = this.#sql;
    const branches = step.plans.map((plan, index) => {
      const result = this.#compilePlan(plan, ws);
      return sql`SELECT recordId, objectId, spaceId, rank, ${index * UNION_BRANCH_STRIDE} + ord AS ord FROM ${this.#ref(result)}`;
    });
    // First occurrence keeps its position, the last occurrence its rank, as the executor's
    // insertion into a `Map` keyed by (space, document, object) did.
    const all = this.#define('all', sql.join(' UNION ALL ', false)(branches));
    return this.#define(
      'ws',
      sql`SELECT recordId, objectId, spaceId, MAX(rank) AS rank, MIN(ord) AS ord FROM ${this.#ref(all)} GROUP BY recordId`,
    );
  }

  #compileSetDifference(step: QueryPlan.SetDifferenceStep, ws: Relation): Relation {
    const sql = this.#sql;
    const source = this.#compilePlan(step.source, ws);
    const exclude = this.#compilePlan(step.exclude, ws);
    return this.#define(
      'ws',
      sql`SELECT s.* FROM ${this.#ref(source)} s WHERE s.objectId NOT IN (SELECT objectId FROM ${this.#ref(exclude)})`,
    );
  }

  //
  // Order, limit, skip, aggregate.
  //

  #compileOrder(step: QueryPlan.OrderStep, ws: Relation): Relation {
    const sql = this.#sql;
    const wsRef = this.#ref(ws);
    const terms = step.order.map((order) => this.#orderTerm(order, ws.grouped));
    const orderBy = terms.length > 0 ? sql.csv(terms) : sql`w.ord`;
    if (ws.grouped) {
      // Groups reorder as wholes by their first member; members keep their order within the group.
      const regrouped = this.#define(
        'grp',
        sql`SELECT w.*, DENSE_RANK() OVER (ORDER BY ${orderBy}, w.groupOrd) AS newGroupOrd
          FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId
          WHERE w.ord = (SELECT MIN(ord) FROM ${wsRef} f WHERE f.groupKey = w.groupKey)`,
      );
      const reordered = this.#define(
        'ws',
        sql`SELECT ${this.#groupedColumns(ws.grouped, sql`w`, sql`g.newGroupOrd`)}
          FROM ${wsRef} w JOIN ${this.#ref(regrouped)} g ON g.groupKey = w.groupKey`,
        ws.grouped,
      );
      const withOrd = this.#define(
        'ws',
        sql`SELECT ${this.#groupedColumns(ws.grouped, sql`w`, sql`w.groupOrd`, sql`ROW_NUMBER() OVER (ORDER BY w.groupOrd, w.ord)`)} FROM ${this.#ref(reordered)} w`,
        ws.grouped,
      );
      return step.limit === undefined ? withOrd : this.#compileLimitSkip(withOrd, { limit: step.limit });
    }
    const ordered = this.#define(
      'ws',
      sql`SELECT w.recordId, w.objectId, w.spaceId, w.rank, ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS ord
        FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId`,
    );
    return step.limit === undefined ? ordered : this.#compileLimitSkip(ordered, { limit: step.limit });
  }

  /** One `ORDER BY` term over the joined row `w`/`m`/`d`, with nulls last as the executor sorts. */
  #orderTerm(order: QueryAST.Order, grouped: GroupedShape | undefined): Fragment {
    const sql = this.#sql;
    const direction = order.direction === 'desc' ? sql`DESC` : sql`ASC`;
    switch (order.kind) {
      case 'natural':
        return sql`w.objectId ${direction}`;
      case 'rank':
        return sql`w.rank ${direction}`;
      case 'timestamp': {
        const column = order.field === 'updatedAt' ? sql`m.updatedAt` : sql`m.createdAt`;
        return sql`COALESCE(${column}, 0) ${direction}`;
      }
      case 'property': {
        if (grouped && grouped.aggregateNames.includes(order.property)) {
          return sql`${sql.literal(aggregateColumn(order.property))} ${direction} NULLS LAST`;
        }
        const at = jsonPathLiteral(sql, [order.property]);
        // Only scalars order; anything else sorts with the nulls, last.
        return sql`CASE WHEN json_type(d.snapshot, ${at}) IN ('text', 'integer', 'real', 'true', 'false') THEN json_extract(d.snapshot, ${at}) END ${direction} NULLS LAST`;
      }
      case 'annotation': {
        // The key and each path segment are matched with `json_each`, as the annotation filter does,
        // since a JSON path cannot address every key; a non-object level yields no row, so NULL.
        const objectOrEmpty = (level: string) =>
          sql`json_each(CASE WHEN ${sql.literal(level)}.type = 'object' THEN ${sql.literal(level)}.value ELSE '{}' END)`;
        const path = order.path ?? [];
        const joins = path.map(
          (segment, index) =>
            sql`JOIN ${objectOrEmpty(index === 0 ? 'a' : `p${index - 1}`)} ${sql.literal(`p${index}`)} ON ${sql.literal(`p${index}`)}.key = ${segment}`,
        );
        const leaf = sql.literal(path.length === 0 ? 'a' : `p${path.length - 1}`);
        // Only scalars order; anything else sorts with the nulls, last.
        return sql`(SELECT CASE WHEN ${leaf}.type IN ('text', 'integer', 'real', 'true', 'false') THEN ${leaf}.value END
          FROM json_each(COALESCE(m.annotations, '{}')) a ${sql.join(' ', false)(joins)}
          WHERE a.key = ${order.key}) ${direction} NULLS LAST`;
      }
      default:
        return sql`w.ord`;
    }
  }

  #compileLimitSkip(ws: Relation, { limit, skip }: { limit?: number; skip?: number }): Relation {
    const sql = this.#sql;
    const wsRef = this.#ref(ws);
    if (ws.grouped) {
      // Group-level paging: whole groups by their ordinal.
      const conditions: Fragment[] = [];
      if (skip !== undefined) {
        conditions.push(sql`w.groupOrd > ${skip}`);
      }
      if (limit !== undefined) {
        conditions.push(sql`w.groupOrd <= ${(skip ?? 0) + limit}`);
      }
      const paged = this.#define('ws', sql`SELECT w.* FROM ${wsRef} w WHERE ${sql.and(conditions)}`, ws.grouped);
      return skip === undefined
        ? paged
        : this.#define(
            'ws',
            sql`SELECT ${this.#groupedColumns(ws.grouped, sql`w`, sql`w.groupOrd - ${skip}`)} FROM ${this.#ref(paged)} w`,
            ws.grouped,
          );
    }
    const limitClause = limit !== undefined ? sql`LIMIT ${limit}` : sql`LIMIT -1`;
    const offsetClause = skip !== undefined ? sql`OFFSET ${skip}` : sql``;
    return this.#define(
      'ws',
      sql`SELECT w.recordId, w.objectId, w.spaceId, w.rank, ROW_NUMBER() OVER (ORDER BY w.ord) AS ord
        FROM (SELECT * FROM ${wsRef} ORDER BY ord ${limitClause} ${offsetClause}) w`,
    );
  }

  #compileAggregate(step: QueryPlan.AggregateStep, ws: Relation): Relation {
    const sql = this.#sql;
    const wsRef = this.#ref(ws);
    const groups = step.aggregates.filter(QueryAST.isGroupKeyAggregate);
    const scalarAggregates = step.aggregates.filter((aggregate) => aggregate.kind !== 'items');
    const collapsed = !step.aggregates.some((aggregate) => aggregate.kind === 'items');
    const itemsOrders = step.aggregates.flatMap((aggregate) =>
      aggregate.kind === 'items' && aggregate.order?.length ? [aggregate.order] : [],
    );
    if (new Set(itemsOrders.map((order) => JSON.stringify(order))).size > 1) {
      throw new QueryError({
        message: 'Multiple `items` aggregates with different `order`s are not supported.',
        context: {},
      });
    }
    const itemsOrder = itemsOrders[0];

    // Group key: one coerced scalar per key entry; a `group` entry falls through its property chain.
    const keyColumns = groups.map(
      (group) => sql`${this.#keyComponent(group)} AS ${sql.literal(keyColumn(group.name))}`,
    );
    const keyJson =
      groups.length === 0
        ? sql`'{}'`
        : sql`json_object(${sql.join(', ', false)(groups.map((group) => sql`${group.name}, ${this.#jsonKeyComponent(group)}`))})`;
    const keyed = this.#define(
      'keyed',
      sql`SELECT w.*, ${keyJson} AS groupKey${keyColumns.length > 0 ? sql`, ${sql.csv(keyColumns)}` : sql``}
        FROM ${wsRef} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId`,
    );

    const aggregateColumns = scalarAggregates.map((aggregate) => {
      const name = sql.literal(aggregateColumn(aggregate.name));
      switch (aggregate.kind) {
        case 'group':
        case 'type':
        case 'timestamp':
        case 'time':
          return sql`k.${sql.literal(keyColumn(aggregate.name))} AS ${name}`;
        case 'sum':
          return sql`TOTAL(${this.#numericProperty(aggregate.property)}) OVER (PARTITION BY k.groupKey) AS ${name}`;
        case 'count':
          return sql`COUNT(*) OVER (PARTITION BY k.groupKey) AS ${name}`;
        case 'max':
          return sql`MAX(${this.#coercedProperty(aggregate.property, sql`k`)}) OVER (PARTITION BY k.groupKey) AS ${name}`;
        case 'min':
          return sql`MIN(${this.#coercedProperty(aggregate.property, sql`k`)}) OVER (PARTITION BY k.groupKey) AS ${name}`;
        default:
          throw new QueryError({ message: 'Unknown aggregate kind', context: {} });
      }
    });
    const stamped = this.#define(
      'agg',
      sql`SELECT k.recordId, k.objectId, k.spaceId, k.rank, k.ord, k.groupKey,
        MIN(k.ord) OVER (PARTITION BY k.groupKey) AS firstOrd,
        COUNT(*) OVER (PARTITION BY k.groupKey) AS groupCount${aggregateColumns.length > 0 ? sql`, ${sql.csv(aggregateColumns)}` : sql``}
        FROM ${this.#ref(keyed)} k JOIN objectMeta m NOT INDEXED ON m.recordId = k.recordId JOIN objectSnapshot d ON d.recordId = k.recordId`,
    );
    const shape: GroupedShape = {
      aggregateNames: scalarAggregates.map((aggregate) => aggregate.name),
      collapsed,
      manifest: collapsed ? this.#manifestShape(keyed, scalarAggregates) : undefined,
    };
    // Groups take the order of their first member; members keep their order, or the `items`
    // aggregate's own order when it declares one. A collapsed set keeps only the first member,
    // which already carries the group's key, count and aggregates.
    const memberOrder = itemsOrder ? sql.csv(itemsOrder.map((order) => this.#orderTerm(order, undefined))) : sql`w.ord`;
    const members = collapsed ? sql`WHERE w.ord = w.firstOrd` : sql``;
    return this.#define(
      'ws',
      sql`SELECT ${this.#groupedColumns(shape, sql`w`, sql`DENSE_RANK() OVER (ORDER BY w.firstOrd)`, sql`ROW_NUMBER() OVER (ORDER BY w.firstOrd, ${memberOrder})`)}
        FROM ${this.#ref(stamped)} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId JOIN objectSnapshot d ON d.recordId = w.recordId ${members}`,
      shape,
    );
  }

  /**
   * Each member's share of the count, sum, min and max aggregates, as the client subtracts it when it holds
   * the member; undefined when the query asks for none.
   */
  #manifestShape(keyed: Relation, aggregates: readonly QueryAST.GroupAggregate[]): GroupedShape['manifest'] {
    const sql = this.#sql;
    const shares = aggregates.flatMap((aggregate) => {
      switch (aggregate.kind) {
        case 'count':
          return [sql`${aggregate.name}, 1`];
        case 'sum':
          return [sql`${aggregate.name}, ${this.#numericProperty(aggregate.property)}`];
        case 'min':
        case 'max':
          return [sql`${aggregate.name}, ${this.#coercedProperty(aggregate.property, sql`k`)}`];
        default:
          return [];
      }
    });
    return shares.length > 0 ? { keyed, contribution: sql`json_object(${sql.join(', ', false)(shares)})` } : undefined;
  }

  /** A group key component in the scalar domain, from the joined `m` (meta) and `d` (body) rows. */
  #keyComponent(aggregate: QueryAST.GroupAggregate): Fragment {
    const sql = this.#sql;
    switch (aggregate.kind) {
      case 'group': {
        const coerced = aggregate.properties.map((property) => this.#coercedProperty(property));
        // `COALESCE` needs two arguments; a single-property chain is the property itself.
        return coerced.length === 1 ? coerced[0] : sql`COALESCE(${sql.join(', ', false)(coerced)})`;
      }
      case 'type':
        return sql`CASE WHEN m.typeDXN = ${UNTYPED_INDEX_TYPE} THEN NULL ELSE m.typeDXN END`;
      case 'timestamp':
        return this.#truncatedTimestamp(aggregate);
      case 'time':
        return this.#truncatedProperty(aggregate);
      default:
        throw new QueryError({ message: 'Not a group key aggregate', context: { kind: aggregate.kind } });
    }
  }

  #truncatedTimestamp(aggregate: QueryAST.GroupAggregate & { kind: 'timestamp' }): Fragment {
    const sql = this.#sql;
    const column = aggregate.field === 'updatedAt' ? sql`m.updatedAt` : sql`m.createdAt`;
    return this.#floorTo(column, aggregate.unit === 'hour' ? HOUR_MS : DAY_MS);
  }

  /** The grouped working-set columns, with `groupOrd` (and optionally `ord`) replaced. */
  #groupedColumns(shape: GroupedShape, row: Fragment, groupOrd: Fragment, ord?: Fragment): Fragment {
    const sql = this.#sql;
    const columns: Fragment[] = [
      sql`${row}.recordId`,
      sql`${row}.objectId`,
      sql`${row}.spaceId`,
      sql`${row}.rank`,
      ord ? sql`${ord} AS ord` : sql`${row}.ord`,
      sql`${row}.groupKey`,
      sql`${groupOrd} AS groupOrd`,
      sql`${row}.groupCount`,
      ...shape.aggregateNames.map((name) => sql`${row}.${sql.literal(aggregateColumn(name))}`),
    ];
    return sql.csv(columns);
  }

  #truncatedProperty(aggregate: QueryAST.GroupAggregate & { kind: 'time' }): Fragment {
    return this.#floorTo(this.#numericProperty(aggregate.property), aggregate.unit === 'hour' ? HOUR_MS : DAY_MS);
  }

  #floorTo(value: Fragment, size: number): Fragment {
    const sql = this.#sql;
    // `CAST` truncates toward zero; stepping back one below a negative fraction makes it a floor.
    const floored = sql`(CAST(${value} AS INTEGER) - (${value} < CAST(${value} AS INTEGER)))`;
    return sql`(${floored} - ((${floored} % ${size}) + ${size}) % ${size})`;
  }

  #numericProperty(property: string): Fragment {
    const sql = this.#sql;
    if (property === 'id') {
      return sql`NULL`;
    }
    const at = jsonPathLiteral(sql, [property]);
    return sql`CASE WHEN json_type(d.snapshot, ${at}) IN ('integer', 'real') THEN json_extract(d.snapshot, ${at}) END`;
  }

  /** A property coerced to the scalar domain (`null` for anything else); `id` is the entity id. */
  #coercedProperty(property: string, row: Fragment = this.#sql`m`): Fragment {
    const sql = this.#sql;
    if (property === 'id') {
      return sql`${row}.objectId`;
    }
    const at = jsonPathLiteral(sql, [property]);
    return sql`CASE WHEN json_type(d.snapshot, ${at}) IN ('text', 'integer', 'real', 'true', 'false') THEN json_extract(d.snapshot, ${at}) END`;
  }

  /** The group key component as JSON, so booleans serialize as `true`/`false` like `JSON.stringify`. */
  #jsonKeyComponent(group: QueryAST.GroupAggregate): Fragment {
    const sql = this.#sql;
    if (group.kind !== 'group') {
      return this.#keyComponent(group);
    }
    const branches = group.properties.map((property) => {
      if (property === 'id') {
        return sql`WHEN m.objectId IS NOT NULL THEN m.objectId`;
      }
      const at = jsonPathLiteral(sql, [property]);
      return sql`WHEN json_type(d.snapshot, ${at}) IN ('true', 'false') THEN json(json_type(d.snapshot, ${at})) WHEN json_type(d.snapshot, ${at}) IN ('text', 'integer', 'real') THEN json_extract(d.snapshot, ${at})`;
    });
    return sql`CASE ${sql.join(' ', false)(branches)} ELSE NULL END`;
  }

  //
  // Final projection.
  //

  #final(ws: Relation): Fragment {
    const sql = this.#sql;
    const aggregates =
      ws.grouped?.collapsed && ws.grouped.aggregateNames.length > 0
        ? sql`json_object(${sql.join(', ', false)(ws.grouped.aggregateNames.map((name) => sql`${name}, w.${sql.literal(aggregateColumn(name))}`))})`
        : ws.grouped?.collapsed
          ? sql`'{}'`
          : sql`NULL`;
    const groupColumns = ws.grouped
      ? sql`w.groupKey AS groupKey, w.groupCount AS groupCount, ${aggregates} AS aggregates`
      : sql`NULL AS groupKey, NULL AS groupCount, NULL AS aggregates`;
    // Grouped once over the members, not per final row, so a set of many groups costs one pass.
    const manifests = ws.grouped?.manifest
      ? this.#define(
          'manifests',
          sql`SELECT k.groupKey, json_group_array(json_object('id', k.objectId, 'documentId', m.documentId, 'heads', json(COALESCE(d.version, d.heads)), 'position', m.queuePosition, 'contribution', ${ws.grouped.manifest.contribution})) AS manifest
            FROM ${this.#ref(ws.grouped.manifest.keyed)} k JOIN objectMeta m NOT INDEXED ON m.recordId = k.recordId JOIN objectSnapshot d ON d.recordId = k.recordId
            GROUP BY k.groupKey`,
        )
      : undefined;
    const rowEdges = this.#rowEdges(ws);
    return sql`SELECT w.recordId, w.objectId, w.spaceId, m.documentId, m.queueId, m.queueNamespace, w.rank AS rank,
      m.createdAt, m.updatedAt, d.heads AS heads, COALESCE(d.version, d.heads) AS versionHeads, m.queuePosition AS queuePosition,
      CASE WHEN m.queueId != '' THEN d.snapshot END AS documentJson,
      ${groupColumns}, ${rowEdges ? sql`re.edges` : sql`NULL`} AS edges, ${manifests ? sql`mf.manifest` : sql`NULL`} AS manifest
      FROM ${this.#ref(ws)} w JOIN objectMeta m NOT INDEXED ON m.recordId = w.recordId LEFT JOIN objectSnapshot d ON d.recordId = w.recordId
      ${rowEdges ? sql`LEFT JOIN ${this.#ref(rowEdges)} re ON re.root = w.recordId` : sql``}
      ${manifests ? sql`LEFT JOIN ${this.#ref(manifests)} mf ON mf.groupKey = w.groupKey` : sql``}
      ORDER BY w.ord`;
  }

  /**
   * The edges that derive each final row of a linear traversal chain, as one JSON array per row: a recursive walk
   * back from the row through each hop's edges into the objects that reached it, grouped in one pass. A row past
   * {@link MAX_EDGES_PER_ROW} edges gets JSON `null`, which the executor reads as an unknown derivation.
   */
  #rowEdges(ws: Relation): Relation | undefined {
    const sql = this.#sql;
    if (this.#hops.length === 0 || this.#nestedTraversal || ws.grouped) {
      return undefined;
    }
    // Materialized: inlined, every recursive step and the final join recompute each hop's edges.
    const allName = this.#fresh('alledges');
    this.#ctes.push(
      sql`${sql.literal(allName)} AS MATERIALIZED (${sql.join(
        ' UNION ALL ',
        false,
      )(this.#hops.map((hop, index) => sql`SELECT ${index + 1} AS hop, e.* FROM ${this.#ref(hop)} e`))})`,
    );
    const all: Relation = { name: allName };
    // `CROSS JOIN` below keeps `reach` outer: probing it instead keys on `hop` alone (its `recordId` has no
    // affinity), which matches every edge of a hop, so each row would scan them all.
    const reach = this.#fresh('reach');
    this.#ctes.push(
      sql`${sql.literal(reach)}(root, hop, recordId) AS (
        SELECT recordId, ${this.#hops.length}, recordId FROM ${this.#ref(ws)}
        UNION
        SELECT r.root, r.hop - 1, e.fromRecordId FROM ${sql.literal(reach)} r JOIN ${this.#ref(all)} e ON e.hop = r.hop AND e.recordId = r.recordId WHERE r.hop > 1
      )`,
    );
    return this.#define(
      'rowedges',
      sql`SELECT r.root, CASE WHEN COUNT(*) > ${MAX_EDGES_PER_ROW} THEN 'null' ELSE json_group_array(json_object('hop', e.hop, 'from', e.fromObjectId, 'to', e.objectId, 'kind', e.kind, 'property', e.property,
          'holder', e.holderObjectId, 'holderHeads', json(COALESCE(hd.version, hd.heads)))) END AS edges
        FROM ${sql.literal(reach)} r CROSS JOIN ${this.#ref(all)} e ON e.hop = r.hop AND e.recordId = r.recordId
        LEFT JOIN objectSnapshot hd ON hd.recordId = e.holderRecordId
        GROUP BY r.root`,
    );
  }
}

export type CompileOptions = {
  /**
   * Drop document rows whose strong dependencies are absent from the index (default true); the
   * executor mirrors the client-side gate so dependency-broken objects never reach it.
   */
  strongDependencyFilter?: boolean;
  /** Per feed (keyed `<spaceId>/<feedId>`), the time (unix ms) before which its rows have expired. */
  feedCutoffs?: ReadonlyMap<string, number>;
};

/**
 * Compiles a plan, first resolving every `metaVersion` filter to the literal versions present
 * under its key: semver ranges are not expressible in SQL, and the distinct versions under one
 * registry key are few.
 */
export const compilePlan = (
  sql: SqlClient.SqlClient,
  plan: QueryPlan.Plan,
  planSubquery: PlanSubquery,
  options: CompileOptions = {},
): CompiledQuery => new SqlPlanCompiler(sql, planSubquery).compile(plan, options);

//
// Helpers.
//

const metaVersionKey = (key: string, range: string): string => `${key}\0${range}`;

/** True when any select step, sub-plans included, scopes a space with `includeAllFeeds`. */
const planIncludesAllFeeds = (plan: QueryPlan.Plan): boolean =>
  plan.steps.some((step) => {
    switch (step._tag) {
      case 'SelectStep':
        return step.scope.some((scope) => scope._tag === 'space' && scope.includeAllFeeds === true);
      case 'UnionStep':
        return step.plans.some(planIncludesAllFeeds);
      case 'SetDifferenceStep':
        return planIncludesAllFeeds(step.source) || planIncludesAllFeeds(step.exclude);
      default:
        return false;
    }
  });

export const planDeclinedByCompiler = (plan: QueryPlan.Plan, planSubquery: PlanSubquery): boolean =>
  planSelectsChanges(plan) ||
  planReadsObjectMeta(plan, planSubquery) ||
  collectMetaVersionFilters(plan, planSubquery).length > 0;

const planSelectsChanges = (plan: QueryPlan.Plan): boolean =>
  plan.steps.some((step) => step._tag === 'SelectStep' && step.selector._tag === 'ChangesSelector');

const planReadsObjectMeta = (plan: QueryPlan.Plan, planSubquery: PlanSubquery): boolean => {
  const readsMeta = (filter: QueryAST.Filter): boolean => {
    if (filter.type === 'object') {
      if (filter.foreignKeys !== undefined || filter.metaKey !== undefined) {
        return true;
      }
      if (Object.values(filter.props ?? {}).some(readsMeta)) {
        return true;
      }
    }
    if (filter.type === 'tag') {
      return true;
    }
    if (filter.type === 'and' || filter.type === 'or') {
      return filter.filters.some(readsMeta);
    }
    if (filter.type === 'not') {
      return readsMeta(filter.filter);
    }
    if (filter.type === 'in-query') {
      // The subquery carries no scope of its own, so it cannot be planned here; walk its AST.
      let found = false;
      QueryAST.visit(filter.subquery, (node) => {
        if ((node.type === 'select' || node.type === 'filter') && readsMeta(node.filter)) {
          found = true;
        }
      });
      return found;
    }
    return false;
  };
  return plan.steps.some((step) => {
    switch (step._tag) {
      case 'FilterStep':
        return readsMeta(step.filter);
      case 'UnionStep':
        return step.plans.some((nested) => planReadsObjectMeta(nested, planSubquery));
      case 'SetDifferenceStep':
        return planReadsObjectMeta(step.source, planSubquery) || planReadsObjectMeta(step.exclude, planSubquery);
      default:
        return false;
    }
  });
};

/** Every `(metaKey, metaVersion)` pair in the plan, sub-plans and subqueries included. */
const collectMetaVersionFilters = (
  plan: QueryPlan.Plan,
  planSubquery: PlanSubquery,
): [key: string, range: string][] => {
  const found: [string, string][] = [];
  const visitFilter = (filter: QueryAST.Filter): void => {
    switch (filter.type) {
      case 'object':
        if (filter.metaKey !== undefined && filter.metaVersion !== undefined) {
          found.push([filter.metaKey, filter.metaVersion]);
        }
        for (const nested of Object.values(filter.props)) {
          visitFilter(nested);
        }
        break;
      case 'in-query':
        visitPlan(planSubquery(filter.subquery));
        break;
      case 'not':
        visitFilter(filter.filter);
        break;
      case 'and':
      case 'or':
        filter.filters.forEach(visitFilter);
        break;
      default:
        break;
    }
  };
  const visitPlan = (visited: QueryPlan.Plan): void => {
    for (const step of visited.steps) {
      switch (step._tag) {
        case 'FilterStep':
          visitFilter(step.filter);
          break;
        case 'UnionStep':
          step.plans.forEach(visitPlan);
          break;
        case 'SetDifferenceStep':
          visitPlan(step.source);
          visitPlan(step.exclude);
          break;
        default:
          break;
      }
    }
  };
  visitPlan(plan);
  return found;
};

/**
 * A JSON path literal for SQLite's JSON functions, every key quoted so a dot or bracket in a key
 * cannot change the path. Emitted as a literal, not a parameter, so an expression index on the
 * same spelling can serve the predicate.
 */
const jsonPathLiteral = (sql: SqlClient.SqlClient, path: readonly string[]): Fragment => {
  const escaped = path.map((key) => `."${key.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join('');
  return sql.literal(`'$${escaped.replaceAll("'", "''")}'`);
};

const keyColumn = (name: string): string => `key_${columnSuffix(name)}`;
const aggregateColumn = (name: string): string => `agg_${columnSuffix(name)}`;

/**
 * A result field name as a column identifier. Names come from the query author and only have to be
 * unique within the statement, so one that is already identifier-safe is kept for readability and
 * anything else is hex-encoded; the distinct prefixes keep the two classes from colliding. Encoding
 * rather than rejecting is what keeps `aggregate({ 'last-at': … })` working on both executors.
 */
const columnSuffix = (name: string): string =>
  /^[A-Za-z0-9_]+$/.test(name)
    ? `s_${name}`
    : `u_${name
        .split('')
        .map((unit) => unit.charCodeAt(0).toString(16).padStart(4, '0'))
        .join('')}`;

/** `filterMatchValue`'s `in` normalization: a reference compares by its URI. */
const normalizeInValue = (value: unknown): unknown =>
  isEncodedReference(value) ? EncodedReference.toURI(value) : value;

/** `matchesTag`'s canonical form: the entity id of an `echo:` URI, the URI itself otherwise. */
const canonicalTag = (tag: string): string => {
  const eid = EID.tryParse(tag);
  return (eid && EID.getEntityId(eid)) || tag;
};

/**
 * Strict equality of a JSON value (`value`/`type` are `json_extract`/`json_type` over it) with a
 * literal, typed as JS `===` is: a number never equals a string, `true` never equals `1`.
 */
const scalarEquals = (sql: SqlClient.SqlClient, value: Fragment, type: Fragment, operand: unknown): Fragment => {
  if (operand === null) {
    return sql`(${type} = 'null')`;
  }
  if (typeof operand === 'boolean') {
    return sql`(${type} = ${operand ? 'true' : 'false'})`;
  }
  if (typeof operand === 'number') {
    return sql`(${type} IN ('integer', 'real') AND ${value} = ${operand})`;
  }
  if (typeof operand === 'string') {
    return sql`(${type} = 'text' AND ${value} = ${operand})`;
  }
  return sql`0`;
};

/**
 * `structuralMatch` with `strict` on: the element has exactly the operand's keys, each equal.
 * Nested objects recurse; arrays and other non-scalars never match, as in the matcher.
 */
const structuralMatch = (sql: SqlClient.SqlClient, element: Fragment, operand: Record<string, unknown>): Fragment => {
  const keys = Object.keys(operand);
  const conditions: Fragment[] = [
    sql`json_type(${element}) = 'object'`,
    sql`(SELECT count(*) FROM json_each(${element})) = ${keys.length}`,
  ];
  for (const key of keys) {
    const at = jsonPathLiteral(sql, [key]);
    const nested = operand[key];
    if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
      conditions.push(structuralMatch(sql, sql`json_extract(${element}, ${at})`, nested as Record<string, unknown>));
    } else {
      conditions.push(
        scalarEquals(
          sql,
          sql`json_extract(${element}, ${at})`,
          sql`COALESCE(json_type(${element}, ${at}), 'missing')`,
          nested,
        ),
      );
    }
  }
  return sql`(${sql.and(conditions)})`;
};

/** `k` = 0..count-1, joined to a row to emit one output per dependency column after a single seek. */
const fanOut = (sql: SqlClient.SqlClient, count: number): Fragment =>
  sql`(${sql.literal(Array.from({ length: count }, (_, index) => `SELECT ${index} AS k`).join(' UNION ALL '))})`;

/** `objectMeta` aliased for a document-row point lookup by (space, queue, object), with the index pinned. */
const docRow = (sql: SqlClient.SqlClient, alias: string): Fragment =>
  sql`objectMeta ${sql.literal(alias)} INDEXED BY ${sql.literal(INDEX_SPACE_QUEUE_OBJECT)}`;

/**
 * The URI of one `json_each` element of `meta.tags`: an encoded reference, or (legacy) a bare URI, whose
 * text `json_extract` would reject as malformed JSON — so the element's type picks the read.
 */
const tagUriOf = (sql: SqlClient.SqlClient, element: Fragment): Fragment =>
  sql`CASE ${element}.type WHEN 'object' THEN json_extract(${element}.value, '$."/"') WHEN 'text' THEN ${element}.value END`;

/** The entity id of an `echo:` URI (the text after its last slash), `NULL` for any other text. */
const localIdOfUri = (sql: SqlClient.SqlClient, uri: Fragment): Fragment =>
  sql`CASE WHEN ${uri} LIKE 'echo:%' THEN substr(${uri}, length(rtrim(${uri}, replace(${uri}, '/', ''))) + 1) ELSE ${uri} END`;

/** The entity id of a space-less `echo:` URI (canonical `echo:///<id>` or legacy `echo:/<id>`), else `NULL`. */
const localIdOfLocalUri = (sql: SqlClient.SqlClient, uri: Fragment): Fragment =>
  sql`CASE WHEN ${uri} LIKE 'echo:///%' THEN substr(${uri}, 9) WHEN ${uri} LIKE 'echo:/%' AND ${uri} NOT LIKE 'echo://%' THEN substr(${uri}, 7) END`;

/** The space id of a space-qualified `echo://<space>/<id>` URI, `NULL` for a local one. */
const spaceIdOfUri = (sql: SqlClient.SqlClient, uri: Fragment): Fragment =>
  sql`CASE WHEN ${uri} LIKE 'echo://%' AND ${uri} NOT LIKE 'echo:///%' AND instr(substr(${uri}, 8), '/') > 0 THEN substr(${uri}, 8, instr(substr(${uri}, 8), '/') - 1) END`;

/**
 * The queues a feed scope names, each carrying the space its URI qualifies it with, so the index
 * seek cannot cross spaces. An unqualified URI matches on its id alone.
 */
const extractQueueRefs = (queues: readonly string[]): QueueRef[] | null => {
  if (queues.length === 0) {
    return null;
  }
  const refs: QueueRef[] = [];
  for (const feedUri of queues) {
    const eid = EID.tryParse(feedUri);
    const queueId = eid ? EID.getEntityId(eid) : undefined;
    if (!eid || !queueId) {
      continue;
    }
    const spaceId = EID.getSpaceId(eid);
    refs.push(spaceId !== undefined ? { queueId, spaceId } : { queueId });
  }
  return refs;
};

/**
 * Bounds each space-qualified queue by its feed's retention cutoff, so the read (and the page limit
 * after it) never counts an expired row. An unqualified queue names no space whose options apply.
 */
export const withFeedCutoffs = (refs: QueueRef[] | null, feedCutoffs: ReadonlyMap<string, number>): QueueRef[] | null =>
  refs?.map((ref) => {
    const updatedSince = ref.spaceId !== undefined ? feedCutoffs.get(`${ref.spaceId}/${ref.queueId}`) : undefined;
    return updatedSince !== undefined ? { ...ref, updatedSince } : ref;
  }) ?? null;

/** Bound below every assigned position, which start at 0. */
const BEFORE_FIRST_POSITION = -1;

/**
 * The index-level window for a select the storage layer can bound itself: a cursor range resumes
 * by position, a `feedScan` reads a capped page in natural order. Mirrors the executor's rule,
 * including treating a non-numeric cursor as unsatisfiable rather than absent.
 */
const extractQueueWindow = (step: QueryPlan.SelectStep): QueueWindow | undefined => {
  const range = step.feedCursorRange;
  if (range === undefined) {
    if (step.feedScan === undefined || step.limit === undefined) {
      return undefined;
    }
    return {
      kind: 'natural',
      direction: step.feedScan.direction,
      limit: step.limit,
      ...(step.feedScan.skip !== undefined ? { skip: step.feedScan.skip } : {}),
      ...(step.feedScan.deleted !== undefined ? { deleted: step.feedScan.deleted } : {}),
    };
  }
  if (!step.scope.every((scope) => scope._tag === 'feed')) {
    throw new QueryError({ message: 'A feed cursor filter can only be used with a feed scope.', context: {} });
  }
  return {
    kind: 'cursor',
    after: range.begin ? parseCursor(range.begin, Number.MAX_SAFE_INTEGER) : BEFORE_FIRST_POSITION,
    ...(range.end ? { before: parseCursor(range.end, BEFORE_FIRST_POSITION) } : {}),
    ...(step.limit !== undefined ? { limit: step.limit } : {}),
  };
};

const parseCursor = (cursor: string, unsatisfiable: number): number => {
  const position = /^\d+$/.test(cursor) ? Number(cursor) : Number.NaN;
  return Number.isSafeInteger(position) ? position : unsatisfiable;
};
