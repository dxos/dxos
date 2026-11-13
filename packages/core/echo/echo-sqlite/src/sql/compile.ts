//
// Copyright 2026 DXOS.org
//

import { EscapedPropPath, QueryAST, isEncodedReference } from '@dxos/echo-protocol';
import { DXN, EID, type SpaceId } from '@dxos/keys';

import { UnsupportedQueryError } from '../errors.ts';
import { type Fragment, join, jsonPath, raw, sql } from './fragment.ts';

/**
 * A compiled query: one read-only statement returning `(id, body, version)` rows in result order, and
 * for an aggregate also each row's group (`groupKey`, `groupOrd`, `aggregates`).
 */
export type CompiledQuery = {
  readonly sql: string;
  readonly params: readonly unknown[];
  /** Present when the query aggregates: how to shape its rows into records. */
  readonly grouped?: GroupedShape;
};

/**
 * How an aggregate's rows become records: one record per `groupOrd`, holding the `aggregates` JSON,
 * the group key fields, and under each `items` name the group's member rows in order. A `collapsed`
 * aggregate has no `items`, so its one row per group carries no member to hydrate.
 */
export type GroupedShape = {
  readonly collapsed: boolean;
  readonly items: readonly string[];
};

/**
 * What a select reads: the space's documents, every main-branch feed item, the items of named feeds,
 * and, under `from(query)`, only the rows of that query's CTE.
 */
type QueryScope = {
  readonly documents: boolean;
  readonly allFeeds: boolean;
  readonly feeds: readonly string[];
  readonly within?: string;
};

/** A grouped CTE: its shape, and the column of each scalar aggregate, by name. */
type Grouped = GroupedShape & { readonly columns: ReadonlyMap<string, string> };

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type DeletedMode = NonNullable<QueryAST.QueryOptions['deleted']>;

/** Parent chains, and therefore deletion cascade and `child-of`, are followed to this depth. */
const MAX_DEPTH = 10;

/**
 * Compiles a query AST to one `WITH RECURSIVE` statement over the indexer's tables (`objectMeta`,
 * `objectSnapshot`, `reverseRef`, `ftsIndex`): each AST node is a CTE of `(id, rank, ord)` rows, and the
 * final SELECT joins the result ids back to their snapshots. Only document rows are read; feed items
 * share `objectMeta` with a non-empty `queueId`.
 *
 * Compilation is pure — it never reads the store — so any clause that would need a read to express
 * (feeds, aggregates, semver ranges) throws {@link UnsupportedQueryError} instead of degrading to an
 * in-memory evaluation.
 *
 * Joins are `CROSS JOIN` throughout: SQLite keeps their written order, so each step walks its input
 * working set and seeks the metadata/reference indexes instead of the unanalyzed planner scanning a space.
 */
export const compileQuery = (
  query: QueryAST.Query,
  options: { spaceId: SpaceId; versions?: ReadonlyMap<string, readonly string[]> },
): CompiledQuery => {
  const compiler = new Compiler(options.spaceId, options.versions ?? new Map());
  const root = compiler.node(query, 'exclude');
  const grouped = compiler.grouped.get(root);
  const aggregates =
    grouped && grouped.columns.size > 0
      ? sql`json_object(${join(
          [...grouped.columns].map(([name, column]) => sql`${name}, w.${raw(column)}`),
          ', ',
        )})`
      : raw(`'{}'`);
  const groupColumns = grouped
    ? sql`, w.groupKey AS groupKey, w.groupOrd AS groupOrd, ${aggregates} AS aggregates`
    : raw('');
  const statement = sql`WITH RECURSIVE ${join(compiler.ctes, ',\n')}
SELECT e.objectId AS id, ${body('e')} AS body, ${versionOf('e')} AS version, e.createdAt AS createdAt, e.updatedAt AS updatedAt,
NULLIF(e.queueId, '') AS queueId, NULLIF(e.queueNamespace, '') AS queueNamespace, e.queuePosition AS queuePosition, w.rank AS rank${groupColumns} FROM ${raw(root)} w
CROSS JOIN objectMeta e ON e.recordId = w.rid
ORDER BY ${raw(grouped ? 'w.groupOrd, w.ord, w.id' : 'w.ord, w.id, w.rid')}`;
  return {
    sql: statement.sql,
    params: statement.params,
    grouped: grouped && { collapsed: grouped.collapsed, items: grouped.items },
  };
};

class Compiler {
  readonly ctes: Fragment[] = [];
  /** CTEs an aggregate produced; only `order`, `options` and `from` may wrap one. */
  readonly grouped = new Map<string, Grouped>();
  /** The rows the query being compiled may read; `from` narrows or widens it for its inner query. */
  #scope: QueryScope = { documents: true, allFeeds: false, feeds: [] };
  /** CTEs whose `ord` is constant, so id alone orders them and an index can supply that order. */
  readonly #unordered = new Set<string>();
  #counter = 0;

  constructor(
    private readonly _spaceId: SpaceId,
    /** The stored versions satisfying each meta version range, by {@link versionRangeKey}. */
    private readonly _versions: ReadonlyMap<string, readonly string[]>,
  ) {}

  node(query: QueryAST.Query, deleted: DeletedMode): string {
    switch (query.type) {
      case 'select': {
        checkTimestamps(query.filter);
        // A typed select walks the type index, which also yields id order for paging.
        const index =
          query.filter.type === 'object' && query.filter.typename !== null
            ? raw(' INDEXED BY echo_sqlite_object_type')
            : raw('');
        const name =
          this.#cte(sql`SELECT e.recordId AS rid, e.objectId AS id, ${rankOf(query.filter, 'e')} AS rank, 0 AS ord FROM objectMeta e${index}
WHERE ${this.#source('e')} AND ${this.#visible('e', deleted)} AND ${this.#filter(query.filter, 'e')}`);
        this.#unordered.add(name);
        return name;
      }

      case 'filter': {
        checkTimestamps(query.filter);
        const selection = this.node(query.selection, deleted);
        return this.#cte(sql`SELECT w.rid, w.id, w.rank, w.ord FROM ${raw(selection)} w
CROSS JOIN objectMeta e ON e.recordId = w.rid
WHERE ${this.#filter(query.filter, 'e')}`);
      }

      case 'options':
        return this.node(query.query, query.options.deleted ?? deleted);

      case 'from':
        return this.#from(query, deleted);

      case 'reference-traversal': {
        const anchor = this.node(query.anchor, deleted);
        return this.#cte(sql`SELECT t.recordId AS rid, t.objectId AS id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN reverseRef r ON r.recordId = a.rid AND r.propPathNormalized = ${propPath(query.property)}
CROSS JOIN objectMeta t ON ${this.#target('t', raw(`substr(r.targetDXN, ${LOCAL_REF.length + 1})`))}
WHERE r.targetDXN LIKE ${`${LOCAL_REF}%`} AND ${this.#visible('t', deleted)} GROUP BY t.recordId`);
      }

      case 'incoming-references': {
        const anchor = this.node(query.anchor, deleted);
        const property =
          query.property === null ? raw('') : sql` AND r.propPathNormalized = ${propPath(query.property)}`;
        const typename = query.typename === null ? raw('') : sql` AND ${this.#typename('s', query.typename)}`;
        // `reverseRef` keys targets by their space-less form, so the referrer's space is checked on its row.
        return this.#cte(sql`SELECT s.recordId AS rid, s.objectId AS id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN reverseRef r INDEXED BY idx_reverse_ref_target ON r.targetDXN = ${LOCAL_REF} || a.id${property}
CROSS JOIN objectMeta s ON s.recordId = r.recordId
WHERE s.spaceId = ${this._spaceId} AND ${this.#reachable('s')} AND ${this.#visible('s', deleted)}${typename} GROUP BY s.recordId`);
      }

      case 'relation': {
        const anchor = this.node(query.anchor, deleted);
        const filter = query.filter === undefined ? raw('') : sql` AND ${this.#filter(query.filter, 'rel')}`;
        // Separate seeks per endpoint column: an OR across two indexed columns makes SQLite scan.
        const columns =
          query.direction === 'outgoing'
            ? ['sourceId']
            : query.direction === 'incoming'
              ? ['targetId']
              : ['sourceId', 'targetId'];
        const branches = columns.map(
          (
            column,
          ) => sql`SELECT rel.recordId AS rid, rel.objectId AS id, a.rank AS rank, a.ord AS ord FROM ${raw(anchor)} a
CROSS JOIN objectMeta rel ON rel.spaceId = ${this._spaceId} AND rel.${raw(column)} = a.id AND rel.entityKind = 'relation' AND ${this.#reachable('rel')}
WHERE ${this.#visible('rel', deleted)}${filter}`,
        );
        return this.#cte(
          sql`SELECT rid, MIN(id) AS id, MAX(rank) AS rank, MIN(ord) AS ord FROM (${join(branches, '\nUNION ALL\n')}) GROUP BY rid`,
        );
      }

      case 'relation-traversal': {
        const anchor = this.node(query.anchor, deleted);
        const endpoints =
          query.direction === 'source'
            ? ['sourceId']
            : query.direction === 'target'
              ? ['targetId']
              : ['sourceId', 'targetId'];
        const branches = endpoints.map(
          (column) => sql`SELECT t.recordId AS rid, t.objectId AS id, a.rank AS rank, a.ord AS ord FROM ${raw(anchor)} a
CROSS JOIN objectMeta rel ON rel.recordId = a.rid AND rel.entityKind = 'relation'
CROSS JOIN objectMeta t ON ${this.#target('t', raw(`rel.${column}`))}
WHERE ${this.#visible('t', deleted)}`,
        );
        return this.#cte(
          sql`SELECT rid, MIN(id) AS id, MAX(rank) AS rank, MIN(ord) AS ord FROM (${join(branches, '\nUNION ALL\n')}) GROUP BY rid`,
        );
      }

      case 'hierarchy-traversal': {
        const anchor = this.node(query.anchor, deleted);
        if (query.direction === 'to-parent') {
          // A feed item's parent is its feed: the item names it only by the feed it was appended to.
          return this.#cte(sql`SELECT p.recordId AS rid, p.objectId AS id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN objectMeta c ON c.recordId = a.rid
CROSS JOIN objectMeta p ON ${row('p', this._spaceId, raw(`COALESCE(c.parentId, NULLIF(c.queueId, ''))`))}
WHERE ${this.#visible('p', deleted)} GROUP BY p.recordId`);
        }
        // A feed's children are its items, beside any object parented to it.
        return this.#cte(sql`SELECT rid, MIN(id) AS id, MAX(rank) AS rank, MIN(ord) AS ord FROM (
SELECT c.recordId AS rid, c.objectId AS id, a.rank AS rank, a.ord AS ord FROM ${raw(anchor)} a
CROSS JOIN objectMeta c ON c.spaceId = ${this._spaceId} AND c.parentId = a.id AND ${this.#reachable('c')}
WHERE ${this.#visible('c', deleted)}
UNION ALL
SELECT c.recordId AS rid, c.objectId AS id, a.rank AS rank, a.ord AS ord FROM ${raw(anchor)} a
CROSS JOIN objectMeta c ON c.spaceId = ${this._spaceId} AND c.queueId = a.id AND c.queueBranch IS NULL
WHERE ${this.#visible('c', deleted)}) GROUP BY rid`);
      }

      case 'union': {
        const branches = query.queries.map((branch) =>
          raw(`SELECT rid, id, rank, ord FROM ${this.node(branch, deleted)}`),
        );
        return this.#cte(
          sql`SELECT rid, MIN(id) AS id, MAX(rank) AS rank, MIN(ord) AS ord FROM (${join(branches, '\nUNION ALL\n')}) GROUP BY rid`,
        );
      }

      case 'set-difference': {
        const source = this.node(query.source, deleted);
        const exclude = this.node(query.exclude, deleted);
        return this.#cte(raw(`SELECT rid, id, rank, ord FROM ${source} WHERE rid NOT IN (SELECT rid FROM ${exclude})`));
      }

      case 'order': {
        const inner = this.node(query.query, deleted);
        const grouped = this.grouped.get(inner);
        if (grouped) {
          return this.#orderGroups(inner, grouped, query.order);
        }
        const terms = query.order.map((order) => orderTerm(order, 'e'));
        return this.#cte(sql`SELECT w.rid, w.id, w.rank, ROW_NUMBER() OVER (ORDER BY ${join([...terms, raw('w.id'), raw('w.rid')], ', ')}) AS ord
FROM ${raw(inner)} w CROSS JOIN objectMeta e ON e.recordId = w.rid`);
      }

      case 'limit': {
        const inner = this.node(query.query, deleted);
        const grouped = this.grouped.get(inner);
        if (grouped) {
          return this.#pageGroups(inner, grouped, sql`groupOrd <= ${query.limit}`);
        }
        return this.#cte(sql`SELECT rid, id, rank, ROW_NUMBER() OVER (ORDER BY ord, id, rid) AS ord FROM
(SELECT rid, id, rank, ord FROM ${raw(inner)} ORDER BY ${this.#orderOf(inner)} LIMIT ${query.limit})`);
      }

      case 'skip': {
        const inner = this.node(query.query, deleted);
        const grouped = this.grouped.get(inner);
        if (grouped) {
          return this.#pageGroups(inner, grouped, sql`groupOrd > ${query.skip}`);
        }
        return this.#cte(sql`SELECT rid, id, rank, ROW_NUMBER() OVER (ORDER BY ord, id, rid) AS ord FROM
(SELECT rid, id, rank, ord FROM ${raw(inner)} ORDER BY ${this.#orderOf(inner)} LIMIT -1 OFFSET ${query.skip})`);
      }

      case 'aggregate':
        return this.#aggregate(query, deleted);
    }
  }

  /**
   * The rows a select reads: the space's documents, and the feed items the current scope names —
   * every main-branch item for `includeAllFeeds`, the items of named feeds for a feed scope.
   */
  #source(alias: string): Fragment {
    const a = raw(alias);
    const { feeds, allFeeds, documents, within } = this.#scope;
    const narrowed = within ? raw(` AND ${alias}.recordId IN (SELECT rid FROM ${within})`) : raw('');
    if (allFeeds) {
      return sql`${a}.spaceId = ${this._spaceId} AND ${a}.queueBranch IS NULL${narrowed}`;
    }
    const items =
      feeds.length > 0
        ? sql`(${a}.queueId IN (SELECT value FROM json_each(${JSON.stringify(feeds)})) AND ${a}.queueBranch IS NULL)`
        : undefined;
    const rows = [documents ? sql`${a}.queueId = ''` : undefined, items].filter((fragment) => fragment !== undefined);
    return rows.length === 0 ? raw('0') : sql`${a}.spaceId = ${this._spaceId} AND (${join(rows, ' OR ')})${narrowed}`;
  }

  /** Rows a traversal may reach: documents, and main-branch feed items when the scope includes feeds. */
  #reachable(alias: string): Fragment {
    return this.#scope.allFeeds || this.#scope.feeds.length > 0
      ? raw(`${alias}.queueBranch IS NULL`)
      : raw(`${alias}.queueId = ''`);
  }

  /** The reachable row of the space whose object id is `id`. */
  #target(alias: string, id: Fragment): Fragment {
    return sql`${raw(alias)}.spaceId = ${this._spaceId} AND ${raw(alias)}.objectId = ${id} AND ${this.#reachable(alias)}`;
  }

  /**
   * Groups the input in SQL: each member gets its group key and every scalar aggregate as a window
   * over its group; groups take the order of their first member. With no `items` aggregate, one row
   * stands for each group.
   */
  #aggregate(query: QueryAST.QueryAggregateClause, deleted: DeletedMode): string {
    const inner = this.node(query.query, deleted);
    const keys = query.aggregates.filter(QueryAST.isGroupKeyAggregate);
    const scalars = query.aggregates.filter((aggregate) => aggregate.kind !== 'items');
    const items = query.aggregates.flatMap((aggregate) => (aggregate.kind === 'items' ? [aggregate] : []));
    const orders = new Set(items.flatMap((item) => (item.order?.length ? [JSON.stringify(item.order)] : [])));
    if (orders.size > 1) {
      throw new UnsupportedQueryError('several `items` aggregates with different orders');
    }
    const itemsOrder = items.find((item) => item.order?.length)?.order;
    const limit = items.find((item) => item.limit !== undefined)?.limit;

    const keyJson =
      keys.length === 0
        ? raw(`'{}'`)
        : sql`json_object(${join(
            keys.map((key) => sql`${key.name}, ${jsonKey(key, 'm')}`),
            ', ',
          )})`;
    // `seq` is the input order with id breaking ties, since an unordered select has one `ord` for all.
    const keyed =
      this.#cte(sql`SELECT w.rid, w.id, w.rank, ROW_NUMBER() OVER (ORDER BY w.ord, w.id, w.rid) AS seq, ${keyJson} AS groupKey
FROM ${raw(inner)} w CROSS JOIN objectMeta m ON m.recordId = w.rid`);

    const columns = new Map<string, string>();
    const windows = scalars.map((aggregate, index) => {
      const column = `agg${index}`;
      columns.set(aggregate.name, column);
      const over = raw('OVER (PARTITION BY k.groupKey)');
      switch (aggregate.kind) {
        case 'group':
        case 'type':
        case 'timestamp':
        case 'time':
          return sql`${scalarKey(aggregate, 'm')} AS ${raw(column)}`;
        case 'count':
          return sql`COUNT(*) ${over} AS ${raw(column)}`;
        case 'sum':
          return sql`TOTAL(${numeric(aggregate.property, 'm')}) ${over} AS ${raw(column)}`;
        case 'max':
          return sql`MAX(${coerced(aggregate.property, 'm')}) ${over} AS ${raw(column)}`;
        case 'min':
          return sql`MIN(${coerced(aggregate.property, 'm')}) ${over} AS ${raw(column)}`;
      }
    });
    const memberOrder = itemsOrder
      ? join([...itemsOrder.map((order) => orderTerm(order, 'm')), raw('k.seq')], ', ')
      : raw('k.seq');
    const stamped = this.#cte(sql`SELECT k.rid, k.id, k.rank, k.seq, k.groupKey,
MIN(k.seq) OVER (PARTITION BY k.groupKey) AS firstOrd,
ROW_NUMBER() OVER (PARTITION BY k.groupKey ORDER BY ${memberOrder}) AS memberRank${windows.length > 0 ? sql`, ${join(windows, ', ')}` : raw('')}
FROM ${raw(keyed)} k CROSS JOIN objectMeta m ON m.recordId = k.rid`);

    const collapsed = items.length === 0;
    const members = collapsed
      ? raw('WHERE memberRank = 1')
      : limit !== undefined
        ? sql`WHERE memberRank <= ${limit}`
        : raw('');
    const aggregateColumns = [...columns.values()].map((column) => raw(column));
    const name = this.#cte(sql`SELECT rid, id, rank, groupKey,
DENSE_RANK() OVER (ORDER BY firstOrd) AS groupOrd, memberRank AS ord${aggregateColumns.length > 0 ? sql`, ${join(aggregateColumns, ', ')}` : raw('')}
FROM ${raw(stamped)} ${members}`);
    this.grouped.set(name, { collapsed, items: items.map((item) => item.name), columns });
    return name;
  }

  /** Keeps the groups `condition` selects, numbered again from one so a following page counts from them. */
  #pageGroups(inner: string, grouped: Grouped, condition: Fragment): string {
    const aggregateColumns = [...grouped.columns.values()].map((column) => raw(column));
    const name = this.#cte(sql`SELECT rid, id, rank, groupKey, ord,
DENSE_RANK() OVER (ORDER BY groupOrd) AS groupOrd${aggregateColumns.length > 0 ? sql`, ${join(aggregateColumns, ', ')}` : raw('')}
FROM ${raw(inner)} WHERE ${condition}`);
    this.grouped.set(name, grouped);
    return name;
  }

  /** Reorders whole groups by their aggregate fields; members keep their order inside a group. */
  #orderGroups(inner: string, grouped: Grouped, orders: readonly QueryAST.Order[]): string {
    const terms = orders.map((order) => {
      const column = order.kind === 'property' ? grouped.columns.get(order.property) : undefined;
      if (!column) {
        throw new UnsupportedQueryError(
          `ordering groups by ${order.kind === 'property' ? order.property : order.kind}`,
        );
      }
      return sql`w.${raw(column)} ${raw(order.direction === 'desc' ? 'DESC' : 'ASC')} NULLS LAST`;
    });
    const aggregateColumns = [...grouped.columns.values()].map((column) => raw(`w.${column}`));
    const name = this.#cte(sql`SELECT w.rid, w.id, w.rank, w.groupKey, w.ord,
DENSE_RANK() OVER (ORDER BY ${join([...terms, raw('w.groupOrd')], ', ')}) AS groupOrd${aggregateColumns.length > 0 ? sql`, ${join(aggregateColumns, ', ')}` : raw('')}
FROM ${raw(inner)} w`);
    this.grouped.set(name, grouped);
    return name;
  }

  /** Sort key for paging over a CTE: id alone when `ord` is constant, so no sort step is needed. */
  #orderOf(cte: string): Fragment {
    return raw(this.#unordered.has(cte) ? 'id' : 'ord, id');
  }

  #cte(body: Fragment): string {
    const name = `ws${this.#counter++}`;
    this.ctes.push(sql`${raw(name)} AS (${body})`);
    return name;
  }

  /**
   * Compiles the query under the rows `from` names: the space's documents (with every feed's items
   * for `includeAllFeeds`), the items of named feeds, or the results of another query.
   */
  #from(query: QueryAST.QueryFromClause, deleted: DeletedMode): string {
    const outer = this.#scope;
    try {
      if (query.from._tag === 'query') {
        const within = this.node(query.from.query, deleted);
        this.#scope = { ...outer, within };
        return this.node(query.query, deleted);
      }
      let documents = false;
      let allFeeds = false;
      const feeds: string[] = [];
      for (const scope of query.from.scopes) {
        switch (scope._tag) {
          case 'space':
            if (scope.spaceId === undefined || scope.spaceId === this._spaceId) {
              documents = true;
              allFeeds ||= scope.includeAllFeeds === true;
            }
            break;
          case 'feed': {
            const eid = EID.tryParse(scope.feedUri);
            const feedSpace = eid && EID.getSpaceId(eid);
            const feedId = eid && EID.getEntityId(eid);
            if (feedId && (feedSpace === undefined || feedSpace === this._spaceId)) {
              feeds.push(feedId);
            }
            break;
          }
          case 'registry':
            // Registry scopes are answered by the database from its in-process registry, not compiled.
            break;
        }
      }
      this.#scope = { documents, allFeeds, feeds, within: outer.within };
      return this.node(query.query, deleted);
    } finally {
      this.#scope = outer;
    }
  }

  /**
   * Row visibility for the `deleted` option. A row counts as deleted when it, any ancestor (to
   * {@link MAX_DEPTH}) or a relation endpoint is deleted.
   */
  #visible(alias: string, deleted: DeletedMode): Fragment {
    if (deleted === 'include') {
      return raw('1');
    }
    const a = raw(alias);
    // The parent / endpoint guards short-circuit, so a row with neither costs one column test.
    const isDeleted = sql`(${a}.deleted = 1
 OR (${a}.parentId IS NOT NULL AND EXISTS (
  WITH RECURSIVE up(id, depth) AS (
    SELECT ${a}.parentId, 1
    UNION ALL
    SELECT p.parentId, up.depth + 1 FROM up CROSS JOIN objectMeta p ON p.spaceId = ${a}.spaceId AND p.objectId = up.id AND p.queueId = ''
    WHERE p.parentId IS NOT NULL AND up.depth < ${MAX_DEPTH})
  SELECT 1 FROM up CROSS JOIN objectMeta d ON d.spaceId = ${a}.spaceId AND d.objectId = up.id AND d.queueId = '' WHERE d.deleted = 1))
 OR ((${a}.sourceId IS NOT NULL OR ${a}.targetId IS NOT NULL) AND EXISTS (SELECT 1 FROM objectMeta d
  WHERE d.spaceId = ${a}.spaceId AND d.objectId IN (${a}.sourceId, ${a}.targetId) AND d.queueId = '' AND d.deleted = 1)))`;
    return deleted === 'only' ? isDeleted : sql`NOT ${isDeleted}`;
  }

  /**
   * An entity-level filter over the row aliased `alias`.
   */
  #filter(filter: QueryAST.Filter, alias: string): Fragment {
    const a = raw(alias);
    switch (filter.type) {
      case 'object': {
        const conditions: Fragment[] = [];
        if (filter.typename !== null) {
          conditions.push(this.#typename(alias, filter.typename));
        }
        if (filter.id && filter.id.length > 0) {
          conditions.push(sql`${a}.objectId IN (SELECT value FROM json_each(${JSON.stringify(filter.id)}))`);
        }
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          // `@`-prefixed keys address annotations (`@type`, `@meta`), never data.
          if (!key.startsWith('@')) {
            conditions.push(this.#value(valueFilter, body(alias), [key]));
          }
        }
        if (filter.foreignKeys && filter.foreignKeys.length > 0) {
          const keys = filter.foreignKeys.map(
            (fk) =>
              sql`(json_extract(k.value, '$.source') = ${fk.source} AND json_extract(k.value, '$.id') = ${fk.id})`,
          );
          conditions.push(
            sql`EXISTS (SELECT 1 FROM json_each(${body(alias)}, '$."@meta".keys') k WHERE ${join(keys, ' OR ')})`,
          );
        }
        if (filter.metaKey !== undefined) {
          conditions.push(sql`json_extract(${body(alias)}, '$."@meta".key') = ${filter.metaKey}`);
          if (filter.metaVersion !== undefined) {
            // A range becomes the stored versions satisfying it, which the database reads first.
            const versions = this._versions.get(versionRangeKey(filter.metaKey, filter.metaVersion));
            if (!versions) {
              throw new UnsupportedQueryError(`metaVersion range ${filter.metaVersion} without its versions`);
            }
            conditions.push(
              sql`json_extract(${body(alias)}, '$."@meta".version') IN (SELECT value FROM json_each(${JSON.stringify(versions)}))`,
            );
          }
        }
        return conditions.length === 0 ? raw('1') : sql`(${join(conditions, ' AND ')})`;
      }

      case 'annotation': {
        const keys = ['@meta', 'annotations', filter.key];
        return filter.value === undefined
          ? sql`(json_type(${body(alias)}, ${jsonPath(keys)}) IS NOT NULL)`
          : strictEquals(body(alias), keys, filter.value);
      }

      case 'tag': {
        const eid = EID.tryParse(filter.tag);
        const target = (eid && EID.getEntityId(eid)) || filter.tag;
        // Tags are encoded refs (or legacy bare URIs); both compare by their entity id.
        const uri = raw(`CASE t.type WHEN 'object' THEN json_extract(t.value, '$."/"') ELSE t.value END`);
        return sql`EXISTS (SELECT 1 FROM json_each(${body(alias)}, '$."@meta".tags') t
WHERE CASE WHEN ${uri} LIKE 'echo:%' THEN replace(${uri}, rtrim(${uri}, replace(${uri}, '/', '')), '') ELSE ${uri} END = ${target})`;
      }

      case 'text-search': {
        if (filter.searchKind === 'vector') {
          throw new UnsupportedQueryError('vector search');
        }
        const terms = filter.text
          .toLowerCase()
          .split(/\s+/)
          .filter((term) => term.length > 0);
        if (terms.length === 0) {
          return raw('1');
        }
        return join(
          terms.map((term) =>
            // Trigram FTS answers terms of three or more characters; shorter ones fall back to LIKE.
            term.length >= 3
              ? sql`${a}.recordId IN (SELECT rowid FROM ftsIndex WHERE ftsIndex MATCH ${`"${term.replaceAll('"', '""')}"`})`
              : sql`EXISTS (SELECT 1 FROM ftsIndex WHERE ftsIndex.rowid = ${a}.recordId AND ftsIndex.text LIKE ${`%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`} ESCAPE '\\')`,
          ),
          ' AND ',
        );
      }

      case 'timestamp': {
        const column = raw(`${alias}.${filter.field === 'createdAt' ? 'createdAt' : 'updatedAt'}`);
        const operator = raw({ gt: '>', gte: '>=', lt: '<', lte: '<=' }[filter.operator]);
        return sql`${column} ${operator} ${filter.value}`;
      }

      case 'child-of': {
        const parents = filter.parents.map((parent) => EID.getEntityId(parent));
        const depth = filter.transitive ? MAX_DEPTH : 1;
        return sql`EXISTS (
  WITH RECURSIVE up(id, depth) AS (
    SELECT ${a}.parentId, 1 WHERE ${a}.parentId IS NOT NULL
    UNION ALL
    SELECT p.parentId, up.depth + 1 FROM up CROSS JOIN objectMeta p ON p.spaceId = ${a}.spaceId AND p.objectId = up.id AND p.queueId = ''
    WHERE p.parentId IS NOT NULL AND up.depth < ${depth})
  SELECT 1 FROM up WHERE up.id IN (SELECT value FROM json_each(${JSON.stringify(parents)})))`;
      }

      case 'has-parent':
        return raw(`${alias}.parentId IS ${filter.value ? 'NOT NULL' : 'NULL'}`);

      case 'mnemonic':
        return sql`upper(substr(${a}.objectId, ${-filter.mnemonic.length})) = ${filter.mnemonic}`;

      case 'not':
        return sql`NOT ${this.#filter(filter.filter, alias)}`;

      case 'and':
        return filter.filters.length === 0
          ? raw('1')
          : sql`(${join(
              filter.filters.map((inner) => this.#filter(inner, alias)),
              ' AND ',
            )})`;

      case 'or':
        return filter.filters.length === 0
          ? raw('0')
          : sql`(${join(
              filter.filters.map((inner) => this.#filter(inner, alias)),
              ' OR ',
            )})`;

      case 'compare':
      case 'in':
      case 'range':
      case 'contains':
        // Value predicates only apply to a property; at the entity level they match nothing.
        return raw('0');

      case 'in-query':
      case 'changes':
      case 'feed-cursor':
        throw new UnsupportedQueryError(`${filter.type} filter`);
    }
  }

  /**
   * Typename match with the semantics of `compareTypenameStrings` for the rows this store writes: an
   * unversioned filter matches every version (a range, so it stays an index seek); a versioned one is an
   * exact match, since stored type DXNs (`Entity.getTypeURI`) always carry their version.
   */
  #typename(alias: string, typename: string): Fragment {
    const column = raw(`${alias}.typeDXN`);
    const dxn = DXN.tryMake(typename);
    if (!dxn) {
      return sql`${column} = ${typename}`;
    }
    const name = DXN.getName(dxn);
    return DXN.getVersion(dxn) === undefined
      ? sql`(${column} = ${`dxn:${name}`} OR (${column} >= ${`dxn:${name}:`} AND ${column} < ${`dxn:${name};`}))`
      : sql`${column} = ${typename}`;
  }

  /**
   * A value-level filter against the JSON at `keys` inside `body`, with the semantics of
   * `filterMatchValue`: strict typing, no cross-type coercion, and never NULL (so `NOT` is safe).
   */
  #value(filter: QueryAST.Filter, body: Fragment, keys: readonly string[]): Fragment {
    const path = jsonPath(keys);
    const type = sql`json_type(${body}, ${path})`;
    const value = sql`json_extract(${body}, ${path})`;
    switch (filter.type) {
      case 'compare': {
        const operand = filter.value;
        switch (filter.operator) {
          case 'eq':
            return strictEquals(body, keys, operand);
          case 'neq':
            // A reference literal is an object, which `!==` never finds equal to a stored value.
            return isEncodedReference(operand) ? raw('1') : sql`NOT ${strictEquals(body, keys, operand)}`;
          default: {
            const operator = raw({ gt: '>', gte: '>=', lt: '<', lte: '<=' }[filter.operator]);
            return typedCompare(type, value, operator, operand);
          }
        }
      }

      case 'in': {
        const values = filter.values.map((item) => (isEncodedReference(item) ? item['/'] : item));
        return sql`COALESCE(EXISTS (SELECT 1 FROM json_each(${JSON.stringify(values)}) j
WHERE ${normalizedType(raw('j.type'))} = ${storedType(body, keys)} AND j.value IS ${normalizedValue(body, keys)}), 0)`;
      }

      case 'range':
        return sql`(${typedCompare(type, value, raw('>='), filter.from)} AND ${typedCompare(type, value, raw('<='), filter.to)})`;

      case 'contains': {
        const element =
          typeof filter.value === 'object' && filter.value !== null && !Array.isArray(filter.value)
            ? structuralEquals(raw('j.value'), [], filter.value)
            : elementEquals(filter.value);
        return sql`COALESCE(${type} = 'array' AND EXISTS (SELECT 1 FROM json_each(${body}, ${path}) j WHERE ${element}), 0)`;
      }

      case 'object': {
        const props = Object.entries(filter.props).map(([key, inner]) => this.#value(inner, body, [...keys, key]));
        return sql`COALESCE(${type} IN ('object', 'array')${props.length > 0 ? sql` AND ${join(props, ' AND ')}` : raw('')}, 0)`;
      }

      case 'in-query': {
        const subquery = this.node(filter.subquery, 'exclude');
        const projected = normalizedValue(snapshotOf('s'), filter.property.split('.'));
        return sql`COALESCE(${normalizedValue(body, keys)} IN (SELECT ${projected} FROM ${raw(subquery)} q
CROSS JOIN objectMeta s ON s.recordId = q.rid), 0)`;
      }

      case 'not':
        return sql`NOT ${this.#value(filter.filter, body, keys)}`;

      case 'and':
        return filter.filters.length === 0
          ? raw('1')
          : sql`(${join(
              filter.filters.map((inner) => this.#value(inner, body, keys)),
              ' AND ',
            )})`;

      case 'or':
        return filter.filters.length === 0
          ? raw('0')
          : sql`(${join(
              filter.filters.map((inner) => this.#value(inner, body, keys)),
              ' OR ',
            )})`;

      default:
        // The shared matcher treats every other filter as a non-match on a property value.
        return raw('0');
    }
  }
}

/** The local reference prefix `reverseRef.targetDXN` carries for an entity of the same space. */
const LOCAL_REF = 'echo:///';

/** The `objectMeta` row (aliased `alias`) of the document object `id` of the space. */
const row = (alias: string, spaceId: SpaceId, id: Fragment): Fragment =>
  sql`${raw(alias)}.spaceId = ${spaceId} AND ${raw(alias)}.objectId = ${id} AND ${raw(alias)}.queueId = ''`;

/** The JSON snapshot of the `objectMeta` row aliased `alias`, read by its primary key. */
const snapshotOf = (alias: string): Fragment =>
  raw(`(SELECT snapshot FROM objectSnapshot WHERE objectSnapshot.recordId = ${alias}.recordId)`);

const body = snapshotOf;

/** The document heads (JSON) the snapshot of the row aliased `alias` was read at. */
const versionOf = (alias: string): Fragment =>
  raw(`(SELECT version FROM objectSnapshot WHERE objectSnapshot.recordId = ${alias}.recordId)`);

/** A dotted property path as the reverse-reference index stores it: escaped, without array indexes. */
const propPath = (property: string): string =>
  EscapedPropPath.escape(property.split('.').filter((segment) => !/^[0-9]+$/.test(segment)));

/**
 * Rejects timestamp filters the host executors reject too: negated ones, and ones combined other than
 * by AND, whose meaning the timestamp index cannot answer.
 */
const checkTimestamps = (filter: QueryAST.Filter, inverted = false, alternative = false): void => {
  switch (filter.type) {
    case 'timestamp':
      if (inverted) {
        throw new UnsupportedQueryError(
          'Negated timestamp filters are not supported. Use Filter.updated/Filter.created with the inverted range instead.',
        );
      }
      if (alternative) {
        throw new UnsupportedQueryError(
          'Query too complex: timestamp filters can only be combined with a single type or property filter via AND. Split complex filters into a subquery.',
        );
      }
      return;
    case 'not':
      return checkTimestamps(filter.filter, !inverted, alternative);
    case 'and':
      return filter.filters.forEach((inner) => checkTimestamps(inner, inverted, alternative));
    case 'or':
      return filter.filters.forEach((inner) => checkTimestamps(inner, inverted, true));
    default:
      return;
  }
};

/**
 * A row's relevance: `-bm25` of its text over the terms the filter searches for (higher is better),
 * and 1 for a row no text search ranks, as the host executors report it.
 */
const rankOf = (filter: QueryAST.Filter, alias: string): Fragment => {
  const terms = searchTerms(filter).filter((term) => term.length >= 3);
  if (terms.length === 0) {
    return raw('1');
  }
  const match = terms.map((term) => `"${term.replaceAll('"', '""')}"`).join(' AND ');
  return sql`COALESCE((SELECT -bm25(ftsIndex) FROM ftsIndex WHERE ftsIndex MATCH ${match} AND ftsIndex.rowid = ${raw(alias)}.recordId), 1)`;
};

/** The full-text terms a filter requires: those under its conjunctions, not under `not` or `or`. */
const searchTerms = (filter: QueryAST.Filter): string[] => {
  switch (filter.type) {
    case 'text-search':
      return filter.searchKind === 'vector'
        ? []
        : filter.text
            .toLowerCase()
            .split(/\s+/)
            .filter((term) => term.length > 0);
    case 'and':
      return filter.filters.flatMap(searchTerms);
    default:
      return [];
  }
};

/** Names a meta key's version range in the map of satisfying versions a compilation takes. */
export const versionRangeKey = (key: string, range: string): string => `${key}\n${range}`;

/** Every meta key and version range the query's filters name. */
export const versionRanges = (query: QueryAST.Query): { key: string; range: string }[] => {
  const ranges: { key: string; range: string }[] = [];
  const visitFilter = (filter: QueryAST.Filter): void => {
    switch (filter.type) {
      case 'object':
        if (filter.metaKey !== undefined && filter.metaVersion !== undefined) {
          ranges.push({ key: filter.metaKey, range: filter.metaVersion });
        }
        Object.values(filter.props).forEach(visitFilter);
        return;
      case 'not':
        return visitFilter(filter.filter);
      case 'and':
      case 'or':
        return filter.filters.forEach(visitFilter);
      case 'in-query':
        return visitQuery(filter.subquery);
      default:
        return;
    }
  };
  const visitQuery = (node: QueryAST.Query): void => {
    QueryAST.visit(node, (child) => {
      if (child.type === 'select' || child.type === 'filter') {
        visitFilter(child.filter);
      } else if (child.type === 'relation' && child.filter) {
        visitFilter(child.filter);
      }
    });
  };
  visitQuery(query);
  return ranges;
};

/** One `ORDER BY` term over the row aliased `alias` (and the working-set row `w`). */
const orderTerm = (order: QueryAST.Order, alias: string): Fragment => {
  const direction = raw(order.direction === 'desc' ? 'DESC' : 'ASC');
  switch (order.kind) {
    case 'natural':
      return sql`${raw(alias)}.objectId ${direction}`;
    case 'rank':
      return sql`w.rank ${direction}`;
    case 'timestamp':
      return sql`${raw(alias)}.${raw(order.field === 'createdAt' ? 'createdAt' : 'updatedAt')} ${direction}`;
    case 'property': {
      const path = jsonPath(order.property.split('.'));
      return sql`CASE WHEN json_type(${body(alias)}, ${path}) IN ('integer', 'real', 'text')
  THEN json_extract(${body(alias)}, ${path}) END ${direction} NULLS LAST`;
    }
    case 'annotation': {
      const path = jsonPath(['@meta', 'annotations', order.key, ...(order.path ?? [])]);
      // Booleans order as the 0/1 `json_extract` returns, as the host executors sort them.
      return sql`CASE WHEN json_type(${body(alias)}, ${path}) IN ('integer', 'real', 'text', 'true', 'false')
  THEN json_extract(${body(alias)}, ${path}) END ${direction} NULLS LAST`;
    }
  }
};

/** A property of the row aliased `alias` in the scalar domain, NULL for anything else; `id` is the entity id. */
const coerced = (property: string, alias: string): Fragment => {
  if (property === 'id') {
    return raw(`${alias}.objectId`);
  }
  const path = jsonPath([property]);
  return sql`CASE WHEN json_type(${body(alias)}, ${path}) IN ('text', 'integer', 'real', 'true', 'false') THEN json_extract(${body(alias)}, ${path}) END`;
};

/** A numeric property of the row aliased `alias`, NULL for anything else. */
const numeric = (property: string, alias: string): Fragment => {
  const path = jsonPath([property]);
  return sql`CASE WHEN json_type(${body(alias)}, ${path}) IN ('integer', 'real') THEN json_extract(${body(alias)}, ${path}) END`;
};

/** Floors a millisecond value to a multiple of `size`, below zero too. */
const floorTo = (value: Fragment, size: number): Fragment => {
  // `CAST` truncates toward zero; stepping back one below a negative fraction makes it a floor.
  const floored = sql`(CAST(${value} AS INTEGER) - (${value} < CAST(${value} AS INTEGER)))`;
  return sql`(${floored} - ((${floored} % ${size}) + ${size}) % ${size})`;
};

/** A group key component as a scalar, from the row aliased `alias`. */
const scalarKey = (
  aggregate: Extract<QueryAST.GroupAggregate, { kind: 'group' | 'type' | 'timestamp' | 'time' }>,
  alias: string,
): Fragment => {
  switch (aggregate.kind) {
    case 'group': {
      const chain = aggregate.properties.map((property) => coerced(property, alias));
      return chain.length === 1 ? chain[0] : sql`COALESCE(${join(chain, ', ')})`;
    }
    case 'type':
      return sql`CASE WHEN ${raw(alias)}.typeDXN = 'type' THEN NULL ELSE ${raw(alias)}.typeDXN END`;
    case 'timestamp':
      return floorTo(
        raw(`${alias}.${aggregate.field === 'updatedAt' ? 'updatedAt' : 'createdAt'}`),
        aggregate.unit === 'hour' ? HOUR_MS : DAY_MS,
      );
    case 'time':
      return floorTo(numeric(aggregate.property, alias), aggregate.unit === 'hour' ? HOUR_MS : DAY_MS);
  }
};

/** A group key component as JSON, so a boolean key reads back as a boolean rather than 0/1. */
const jsonKey = (
  aggregate: Extract<QueryAST.GroupAggregate, { kind: 'group' | 'type' | 'timestamp' | 'time' }>,
  alias: string,
): Fragment => {
  if (aggregate.kind !== 'group') {
    return scalarKey(aggregate, alias);
  }
  const branches = aggregate.properties.map((property) => {
    if (property === 'id') {
      return raw(`WHEN ${alias}.objectId IS NOT NULL THEN ${alias}.objectId`);
    }
    const path = jsonPath([property]);
    return sql`WHEN json_type(${body(alias)}, ${path}) IN ('true', 'false') THEN json(json_type(${body(alias)}, ${path})) WHEN json_type(${body(alias)}, ${path}) IN ('text', 'integer', 'real') THEN json_extract(${body(alias)}, ${path})`;
  });
  return sql`CASE ${join(branches, ' ')} ELSE NULL END`;
};

/** `===` against a JS operand, with an encoded ref compared by URI. */
const strictEquals = (body: Fragment, keys: readonly string[], operand: unknown): Fragment => {
  const path = jsonPath(keys);
  const type = sql`json_type(${body}, ${path})`;
  if (isEncodedReference(operand)) {
    const refPath = jsonPath([...keys, '/']);
    return sql`COALESCE(${type} = 'object' AND (SELECT COUNT(*) FROM json_each(${body}, ${path})) = 1
AND json_type(${body}, ${refPath}) = 'text' AND json_extract(${body}, ${refPath}) = ${operand['/']}, 0)`;
  }
  return scalarEquals(type, sql`json_extract(${body}, ${path})`, operand);
};

/** Strict equality of a JSON (type, value) pair with a JS scalar; objects never compare equal. */
const scalarEquals = (type: Fragment, value: Fragment, operand: unknown): Fragment => {
  if (operand === undefined) {
    return sql`(${type} IS NULL)`;
  }
  if (operand === null) {
    return sql`COALESCE(${type} = 'null', 0)`;
  }
  switch (typeof operand) {
    case 'boolean':
      return sql`COALESCE(${type} = ${operand ? 'true' : 'false'}, 0)`;
    case 'number':
      return sql`COALESCE(${type} IN ('integer', 'real') AND ${value} = ${operand}, 0)`;
    case 'string':
      return sql`COALESCE(${type} = 'text' AND ${value} = ${operand}, 0)`;
    default:
      return raw('0');
  }
};

/** Ordering comparison, only between values of the operand's JSON type. */
const typedCompare = (type: Fragment, value: Fragment, operator: Fragment, operand: unknown): Fragment => {
  switch (typeof operand) {
    case 'number':
      return sql`COALESCE(${type} IN ('integer', 'real') AND ${value} ${operator} ${operand}, 0)`;
    case 'string':
      return sql`COALESCE(${type} = 'text' AND ${value} ${operator} ${operand}, 0)`;
    default:
      return raw('0');
  }
};

/** `===` between a `json_each` element `j` and a JS scalar. */
const elementEquals = (operand: unknown): Fragment => scalarEquals(raw('j.type'), raw('j.value'), operand);

/** `structuralMatch` (strict): same key count, every key present and recursively equal. */
const structuralEquals = (json: Fragment, keys: readonly string[], operand: unknown): Fragment => {
  const path = jsonPath(keys);
  const type = sql`json_type(${json}, ${path})`;
  if (typeof operand !== 'object' || operand === null) {
    return scalarEquals(type, sql`json_extract(${json}, ${path})`, operand);
  }
  if (Array.isArray(operand)) {
    throw new UnsupportedQueryError('array inside a structural contains');
  }
  const entries = Object.entries(operand);
  const members = entries.map(([key, inner]) => structuralEquals(json, [...keys, key], inner));
  return sql`COALESCE(${type} = 'object' AND (SELECT COUNT(*) FROM json_each(${json}, ${path})) = ${entries.length}${
    members.length > 0 ? sql` AND ${join(members, ' AND ')}` : raw('')
  }, 0)`;
};

/** JSON type with integer/real folded to number, since JS does not distinguish them. */
const normalizedType = (type: Fragment): Fragment =>
  sql`(CASE ${type} WHEN 'integer' THEN 'number' WHEN 'real' THEN 'number' ELSE ${type} END)`;

/** {@link normalizedType} of a stored value, reporting an encoded ref as the text of its URI. */
const storedType = (body: Fragment, keys: readonly string[]): Fragment => {
  const path = jsonPath(keys);
  const refPath = jsonPath([...keys, '/']);
  return normalizedType(
    sql`(CASE WHEN json_type(${body}, ${path}) = 'object' AND json_type(${body}, ${refPath}) = 'text' THEN 'text' ELSE json_type(${body}, ${path}) END)`,
  );
};

/** The value `Filter.in` compares: an encoded ref's URI, otherwise the scalar itself. */
const normalizedValue = (body: Fragment, keys: readonly string[]): Fragment => {
  const path = jsonPath(keys);
  const refPath = jsonPath([...keys, '/']);
  return sql`(CASE WHEN json_type(${body}, ${path}) = 'object' THEN json_extract(${body}, ${refPath}) ELSE json_extract(${body}, ${path}) END)`;
};
