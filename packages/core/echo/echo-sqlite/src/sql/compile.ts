//
// Copyright 2026 DXOS.org
//

import { type QueryAST, isEncodedReference } from '@dxos/echo-protocol';
import { DXN, EID, type SpaceId } from '@dxos/keys';

import { UnsupportedQueryError } from '../errors.ts';
import { type Fragment, join, jsonPath, raw, sql } from './fragment.ts';

/**
 * A compiled query: one read-only statement returning `(id, body)` rows in result order.
 */
export type CompiledQuery = {
  readonly sql: string;
  readonly params: readonly unknown[];
};

type DeletedMode = NonNullable<QueryAST.QueryOptions['deleted']>;

/** Parent chains, and therefore deletion cascade and `child-of`, are followed to this depth. */
const MAX_DEPTH = 10;

/**
 * Compiles a query AST to one `WITH RECURSIVE` statement: each AST node is a CTE of `(id, rank, ord)`
 * rows, and the final SELECT joins the result ids back to their bodies.
 *
 * Compilation is pure — it never reads the store — so any clause that would need a read to express
 * (feeds, aggregates, semver ranges) throws {@link UnsupportedQueryError} instead of degrading to an
 * in-memory evaluation.
 *
 * Joins are `CROSS JOIN` throughout: SQLite keeps their written order, so each step walks its input
 * working set and seeks the entity/ref indexes instead of the unanalyzed planner scanning a space.
 */
export const compileQuery = (query: QueryAST.Query, options: { spaceId: SpaceId }): CompiledQuery => {
  const compiler = new Compiler(options.spaceId);
  const root = compiler.node(query, 'exclude');
  const statement = sql`WITH RECURSIVE ${join(compiler.ctes, ',\n')}
SELECT e.id AS id, e.body AS body FROM ${raw(root)} w
CROSS JOIN echo_entities e ON e.space_id = ${options.spaceId} AND e.id = w.id
ORDER BY w.ord, w.id`;
  return { sql: statement.sql, params: statement.params };
};

class Compiler {
  readonly ctes: Fragment[] = [];
  /** CTEs whose `ord` is constant, so id alone orders them and an index can supply that order. */
  readonly #unordered = new Set<string>();
  #counter = 0;

  constructor(private readonly _spaceId: SpaceId) {}

  node(query: QueryAST.Query, deleted: DeletedMode): string {
    switch (query.type) {
      case 'select': {
        // A typed select walks the type index, which also yields id order for paging.
        const index =
          query.filter.type === 'object' && query.filter.typename !== null
            ? raw(' INDEXED BY echo_entities_type')
            : raw('');
        const name = this.#cte(sql`SELECT e.id AS id, 0 AS rank, 0 AS ord FROM echo_entities e${index}
WHERE e.space_id = ${this._spaceId} AND ${this.#visible('e', deleted)} AND ${this.#filter(query.filter, 'e')}`);
        this.#unordered.add(name);
        return name;
      }

      case 'filter': {
        const selection = this.node(query.selection, deleted);
        return this.#cte(sql`SELECT w.id, w.rank, w.ord FROM ${raw(selection)} w
CROSS JOIN echo_entities e ON e.space_id = ${this._spaceId} AND e.id = w.id
WHERE ${this.#filter(query.filter, 'e')}`);
      }

      case 'options':
        return this.node(query.query, query.options.deleted ?? deleted);

      case 'from':
        return this.#from(query, deleted);

      case 'reference-traversal': {
        const anchor = this.node(query.anchor, deleted);
        return this.#cte(sql`SELECT t.id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN echo_refs r ON r.space_id = ${this._spaceId} AND r.source_id = a.id AND r.prop_path = ${query.property}
CROSS JOIN echo_entities t ON t.space_id = ${this._spaceId} AND t.id = r.target_id
WHERE ${this.#visible('t', deleted)} GROUP BY t.id`);
      }

      case 'incoming-references': {
        const anchor = this.node(query.anchor, deleted);
        const property = query.property === null ? raw('') : sql` AND r.prop_path = ${query.property}`;
        const typename = query.typename === null ? raw('') : sql` AND ${this.#typename('s', query.typename)}`;
        return this.#cte(sql`SELECT s.id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN echo_refs r INDEXED BY echo_refs_target ON r.space_id = ${this._spaceId} AND r.target_id = a.id${property}
CROSS JOIN echo_entities s ON s.space_id = ${this._spaceId} AND s.id = r.source_id
WHERE ${this.#visible('s', deleted)}${typename} GROUP BY s.id`);
      }

      case 'relation': {
        const anchor = this.node(query.anchor, deleted);
        const filter = query.filter === undefined ? raw('') : sql` AND ${this.#filter(query.filter, 'rel')}`;
        // Separate seeks per endpoint column: an OR across two indexed columns makes SQLite scan.
        const columns =
          query.direction === 'outgoing'
            ? ['source_id']
            : query.direction === 'incoming'
              ? ['target_id']
              : ['source_id', 'target_id'];
        const branches = columns.map(
          (column) => sql`SELECT rel.id AS id, a.rank AS rank, a.ord AS ord FROM ${raw(anchor)} a
CROSS JOIN echo_entities rel ON rel.space_id = ${this._spaceId} AND rel.${raw(column)} = a.id AND rel.kind = 'relation'
WHERE ${this.#visible('rel', deleted)}${filter}`,
        );
        return this.#cte(
          sql`SELECT id, MAX(rank) AS rank, MIN(ord) AS ord FROM (${join(branches, '\nUNION ALL\n')}) GROUP BY id`,
        );
      }

      case 'relation-traversal': {
        const anchor = this.node(query.anchor, deleted);
        const endpoint =
          query.direction === 'source'
            ? raw('t.id = rel.source_id')
            : query.direction === 'target'
              ? raw('t.id = rel.target_id')
              : raw('t.id IN (rel.source_id, rel.target_id)');
        return this.#cte(sql`SELECT t.id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN echo_entities rel ON rel.space_id = ${this._spaceId} AND rel.id = a.id AND rel.kind = 'relation'
CROSS JOIN echo_entities t ON t.space_id = ${this._spaceId} AND ${endpoint}
WHERE ${this.#visible('t', deleted)} GROUP BY t.id`);
      }

      case 'hierarchy-traversal': {
        const anchor = this.node(query.anchor, deleted);
        if (query.direction === 'to-parent') {
          return this.#cte(sql`SELECT p.id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN echo_entities c ON c.space_id = ${this._spaceId} AND c.id = a.id
CROSS JOIN echo_entities p ON p.space_id = ${this._spaceId} AND p.id = c.parent_id
WHERE ${this.#visible('p', deleted)} GROUP BY p.id`);
        }
        return this.#cte(sql`SELECT c.id, MAX(a.rank) AS rank, MIN(a.ord) AS ord FROM ${raw(anchor)} a
CROSS JOIN echo_entities c ON c.space_id = ${this._spaceId} AND c.parent_id = a.id
WHERE ${this.#visible('c', deleted)} GROUP BY c.id`);
      }

      case 'union': {
        const branches = query.queries.map((branch) => raw(`SELECT id, rank, ord FROM ${this.node(branch, deleted)}`));
        return this.#cte(
          sql`SELECT id, MAX(rank) AS rank, MIN(ord) AS ord FROM (${join(branches, '\nUNION ALL\n')}) GROUP BY id`,
        );
      }

      case 'set-difference': {
        const source = this.node(query.source, deleted);
        const exclude = this.node(query.exclude, deleted);
        return this.#cte(raw(`SELECT id, rank, ord FROM ${source} WHERE id NOT IN (SELECT id FROM ${exclude})`));
      }

      case 'order': {
        const inner = this.node(query.query, deleted);
        const terms = query.order.map((order) => {
          const direction = raw(order.direction === 'desc' ? 'DESC' : 'ASC');
          switch (order.kind) {
            case 'natural':
              return sql`w.id ${direction}`;
            case 'rank':
              return sql`w.rank ${direction}`;
            case 'timestamp':
              return sql`e.${raw(order.field === 'createdAt' ? 'created_at' : 'updated_at')} ${direction}`;
            case 'property': {
              const path = jsonPath(order.property.split('.'));
              return sql`CASE WHEN json_type(e.body, ${path}) IN ('integer', 'real', 'text')
  THEN json_extract(e.body, ${path}) END ${direction} NULLS LAST`;
            }
          }
        });
        return this.#cte(sql`SELECT w.id, w.rank, ROW_NUMBER() OVER (ORDER BY ${join([...terms, raw('w.id')], ', ')}) AS ord
FROM ${raw(inner)} w CROSS JOIN echo_entities e ON e.space_id = ${this._spaceId} AND e.id = w.id`);
      }

      case 'limit': {
        const inner = this.node(query.query, deleted);
        return this.#cte(sql`SELECT id, rank, ROW_NUMBER() OVER (ORDER BY ord, id) AS ord FROM
(SELECT id, rank, ord FROM ${raw(inner)} ORDER BY ${this.#orderOf(inner)} LIMIT ${query.limit})`);
      }

      case 'skip': {
        const inner = this.node(query.query, deleted);
        return this.#cte(sql`SELECT id, rank, ROW_NUMBER() OVER (ORDER BY ord, id) AS ord FROM
(SELECT id, rank, ord FROM ${raw(inner)} ORDER BY ${this.#orderOf(inner)} LIMIT -1 OFFSET ${query.skip})`);
      }

      case 'aggregate':
        throw new UnsupportedQueryError('aggregate');
    }
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

  #from(query: QueryAST.QueryFromClause, deleted: DeletedMode): string {
    if (query.from._tag === 'query') {
      throw new UnsupportedQueryError('from(query)');
    }
    const ownSpace = query.from.scopes.some((scope) => {
      switch (scope._tag) {
        case 'space':
          return scope.spaceId === undefined || scope.spaceId === this._spaceId;
        case 'feed':
          throw new UnsupportedQueryError('feed scope');
        case 'registry':
          // Registry scopes are answered by the database from its in-process registry, not compiled.
          return false;
      }
    });
    return ownSpace
      ? this.node(query.query, deleted)
      : this.#cte(raw('SELECT NULL AS id, 0 AS rank, 0 AS ord WHERE 0'));
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
 OR (${a}.parent_id IS NOT NULL AND EXISTS (
  WITH RECURSIVE up(id, depth) AS (
    SELECT ${a}.parent_id, 1
    UNION ALL
    SELECT p.parent_id, up.depth + 1 FROM up CROSS JOIN echo_entities p ON p.space_id = ${a}.space_id AND p.id = up.id
    WHERE p.parent_id IS NOT NULL AND up.depth < ${MAX_DEPTH})
  SELECT 1 FROM up CROSS JOIN echo_entities d ON d.space_id = ${a}.space_id AND d.id = up.id WHERE d.deleted = 1))
 OR ((${a}.source_id IS NOT NULL OR ${a}.target_id IS NOT NULL) AND EXISTS (SELECT 1 FROM echo_entities d
  WHERE d.space_id = ${a}.space_id AND d.id IN (${a}.source_id, ${a}.target_id) AND d.deleted = 1)))`;
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
          conditions.push(sql`${a}.id IN (SELECT value FROM json_each(${JSON.stringify(filter.id)}))`);
        }
        for (const [key, valueFilter] of Object.entries(filter.props)) {
          // `@`-prefixed keys address annotations (`@type`, `@meta`), never data.
          if (!key.startsWith('@')) {
            conditions.push(this.#value(valueFilter, sql`${a}.body`, [key]));
          }
        }
        if (filter.foreignKeys && filter.foreignKeys.length > 0) {
          const keys = filter.foreignKeys.map(
            (fk) =>
              sql`(json_extract(k.value, '$.source') = ${fk.source} AND json_extract(k.value, '$.id') = ${fk.id})`,
          );
          conditions.push(
            sql`EXISTS (SELECT 1 FROM json_each(${a}.body, '$."@meta".keys') k WHERE ${join(keys, ' OR ')})`,
          );
        }
        if (filter.metaKey !== undefined) {
          conditions.push(sql`json_extract(${a}.body, '$."@meta".key') = ${filter.metaKey}`);
          if (filter.metaVersion !== undefined) {
            // Only an exact version is expressible without reading which versions exist.
            if (!/^\d+\.\d+\.\d+$/.test(filter.metaVersion)) {
              throw new UnsupportedQueryError(`metaVersion range ${filter.metaVersion}`);
            }
            conditions.push(sql`json_extract(${a}.body, '$."@meta".version') = ${filter.metaVersion}`);
          }
        }
        return conditions.length === 0 ? raw('1') : sql`(${join(conditions, ' AND ')})`;
      }

      case 'tag': {
        const eid = EID.tryParse(filter.tag);
        const target = (eid && EID.getEntityId(eid)) || filter.tag;
        // Tags are encoded refs (or legacy bare URIs); both compare by their entity id.
        const uri = raw(`CASE t.type WHEN 'object' THEN json_extract(t.value, '$."/"') ELSE t.value END`);
        return sql`EXISTS (SELECT 1 FROM json_each(${a}.body, '$."@meta".tags') t
WHERE CASE WHEN ${uri} LIKE 'echo:%' THEN replace(${uri}, rtrim(${uri}, replace(${uri}, '/', '')), '') ELSE ${uri} END = ${target})`;
      }

      case 'text-search': {
        if (filter.searchKind === 'vector') {
          return raw('0');
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
              ? sql`${a}.rowid IN (SELECT rowid FROM echo_fts WHERE echo_fts MATCH ${`"${term.replaceAll('"', '""')}"`})`
              : sql`EXISTS (SELECT 1 FROM echo_fts WHERE echo_fts.rowid = ${a}.rowid AND echo_fts.text LIKE ${`%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`} ESCAPE '\\')`,
          ),
          ' AND ',
        );
      }

      case 'timestamp': {
        const column = raw(`${alias}.${filter.field === 'createdAt' ? 'created_at' : 'updated_at'}`);
        const operator = raw({ gt: '>', gte: '>=', lt: '<', lte: '<=' }[filter.operator]);
        return sql`${column} ${operator} ${filter.value}`;
      }

      case 'child-of': {
        const parents = filter.parents.map((parent) => EID.getEntityId(parent));
        const depth = filter.transitive ? MAX_DEPTH : 1;
        return sql`EXISTS (
  WITH RECURSIVE up(id, depth) AS (
    SELECT ${a}.parent_id, 1 WHERE ${a}.parent_id IS NOT NULL
    UNION ALL
    SELECT p.parent_id, up.depth + 1 FROM up CROSS JOIN echo_entities p ON p.space_id = ${a}.space_id AND p.id = up.id
    WHERE p.parent_id IS NOT NULL AND up.depth < ${depth})
  SELECT 1 FROM up WHERE up.id IN (SELECT value FROM json_each(${JSON.stringify(parents)})))`;
      }

      case 'has-parent':
        return raw(`${alias}.parent_id IS ${filter.value ? 'NOT NULL' : 'NULL'}`);

      case 'mnemonic':
        return sql`upper(substr(${a}.id, ${-filter.mnemonic.length})) = ${filter.mnemonic}`;

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
    const column = raw(`${alias}.type_dxn`);
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
        const projected = normalizedValue(raw('s.body'), filter.property.split('.'));
        return sql`COALESCE(${normalizedValue(body, keys)} IN (SELECT ${projected} FROM ${raw(subquery)} q
CROSS JOIN echo_entities s ON s.space_id = ${this._spaceId} AND s.id = q.id), 0)`;
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
