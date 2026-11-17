//
// Copyright 2026 DXOS.org
//

import { type QueryAST } from '@dxos/echo-protocol';
import { DXN, type SpaceId } from '@dxos/keys';

/** A statement for the engine and its parameters. */
export type FastQuery = {
  readonly sql: string;
  readonly params: readonly unknown[];
  readonly predicates: readonly Predicate[];
};

/**
 * The columns the fast path reads: a row's dependencies come back with it, so the caller can tell
 * whether the deletion cascade could hide the row.
 */
const COLUMNS = `m.objectId AS id, s.snapshot AS body, s.version AS version, m.createdAt AS createdAt, m.updatedAt AS updatedAt,
m.parentId AS parentId, m.sourceId AS sourceId, m.targetId AS targetId`;

/**
 * A flat statement for the commonest queries — by id, by type, and by type with scalar property
 * comparisons — or undefined for anything else, which goes through echo-sqlite's compiler.
 *
 * Why: the compiler tests the deletion cascade (a recursive parent walk and a relation-endpoint
 * lookup) on every candidate row and relies on SQLite short-circuiting it for rows without
 * dependencies. Turso evaluates every subquery of a WHERE clause per row and does not seek on
 * `IN (json_each(?))`, so the compiled statement for a point read costs a scan with two subqueries per
 * row of the space (~500 ms at 1,200 objects). This statement checks only `deleted = 0`; the caller
 * must fall back to the compiled one when any returned row has a parent or relation endpoints, whose
 * deletion the cascade would apply.
 */
export const compileFast = (ast: QueryAST.Query, spaceId: SpaceId): FastQuery | undefined => {
  if (ast.type !== 'select') {
    return undefined;
  }
  const filters = flatten(ast.filter);
  if (!filters) {
    return undefined;
  }
  const conditions: string[] = [];
  const params: unknown[] = [spaceId];
  const predicates: Predicate[] = [];
  for (const filter of filters) {
    if (filter.foreignKeys !== undefined || filter.metaKey !== undefined || filter.metaVersion !== undefined) {
      return undefined;
    }
    if (filter.id !== undefined) {
      if (filter.id.length === 0) {
        conditions.push('0');
      } else if (filter.id.length === 1) {
        // Turso seeks an index on `=` but scans on `IN (?)`, even with one element.
        conditions.push('m.objectId = ?');
        params.push(filter.id[0]);
      } else {
        conditions.push(`m.objectId IN (${filter.id.map(() => '?').join(', ')})`);
        params.push(...filter.id);
      }
    }
    if (filter.typename !== null) {
      const dxn = DXN.tryMake(filter.typename);
      if (dxn && DXN.getVersion(dxn) === undefined) {
        const name = DXN.getName(dxn);
        conditions.push('(m.typeDXN = ? OR (m.typeDXN >= ? AND m.typeDXN < ?))');
        params.push(`dxn:${name}`, `dxn:${name}:`, `dxn:${name};`);
      } else {
        conditions.push('m.typeDXN = ?');
        params.push(filter.typename);
      }
    }
    for (const [key, inner] of Object.entries(filter.props)) {
      const predicate = propPredicate(key, inner);
      if (predicate === undefined) {
        return undefined;
      }
      predicates.push(predicate);
    }
  }
  const where = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
  return {
    sql: `SELECT ${COLUMNS} FROM objectMeta m CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND m.queueId = '' AND m.deleted = 0${where}
ORDER BY m.objectId, m.recordId`,
    params,
    predicates,
  };
};

/** The object filters an `and` of object filters (or one) combines, else undefined. */
const flatten = (filter: QueryAST.Filter): QueryAST.FilterObject[] | undefined => {
  if (filter.type === 'object') {
    return [filter];
  }
  if (filter.type === 'and') {
    const parts = filter.filters.map(flatten);
    return parts.every((part) => part !== undefined) ? parts.flat() : undefined;
  }
  return undefined;
};

/** Operators of a {@link Predicate}; `crate/src/engine.rs` reads the same codes. */
export const PredicateOp = { eq: 0, gt: 1, gte: 2, lt: 3, lte: 4, between: 5 } as const;

/**
 * A comparison on one top-level property, evaluated by the engine on each row's snapshot rather than
 * with SQL JSON functions, which re-parse the snapshot per call. Strictly typed: a number operand
 * matches only numbers, a string only strings, a boolean only booleans.
 */
export type Predicate = {
  readonly key: string;
  readonly op: (typeof PredicateOp)[keyof typeof PredicateOp];
  readonly operands: readonly (number | string | boolean)[];
};

const isScalar = (value: unknown): value is number | string | boolean =>
  typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';

/** The predicate for one property filter, or undefined for a filter the engine does not evaluate. */
const propPredicate = (key: string, filter: QueryAST.Filter): Predicate | undefined => {
  switch (filter.type) {
    case 'compare': {
      const operand = filter.value;
      if (!isScalar(operand) || (typeof operand === 'boolean' && filter.operator !== 'eq')) {
        return undefined;
      }
      switch (filter.operator) {
        case 'eq':
          return { key, op: PredicateOp.eq, operands: [operand] };
        case 'gt':
          return { key, op: PredicateOp.gt, operands: [operand] };
        case 'gte':
          return { key, op: PredicateOp.gte, operands: [operand] };
        case 'lt':
          return { key, op: PredicateOp.lt, operands: [operand] };
        case 'lte':
          return { key, op: PredicateOp.lte, operands: [operand] };
        default:
          return undefined;
      }
    }
    case 'range':
      return (typeof filter.from === 'number' && typeof filter.to === 'number') ||
        (typeof filter.from === 'string' && typeof filter.to === 'string')
        ? { key, op: PredicateOp.between, operands: [filter.from, filter.to] }
        : undefined;
    default:
      return undefined;
  }
};
