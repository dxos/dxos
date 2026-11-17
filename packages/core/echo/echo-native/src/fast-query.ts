//
// Copyright 2026 DXOS.org
//

import { type QueryAST } from '@dxos/echo-protocol';
import { DXN, type SpaceId } from '@dxos/keys';

/** A statement for the engine and its parameters. */
export type FastQuery = { readonly sql: string; readonly params: readonly unknown[] };

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
  for (const filter of filters) {
    if (filter.foreignKeys !== undefined || filter.metaKey !== undefined || filter.metaVersion !== undefined) {
      return undefined;
    }
    if (filter.id !== undefined) {
      if (filter.id.length === 0) {
        conditions.push('0');
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
      const condition = propCondition(key, inner, params);
      if (condition === undefined) {
        return undefined;
      }
      conditions.push(condition);
    }
  }
  const where = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
  return {
    sql: `SELECT ${COLUMNS} FROM objectMeta m CROSS JOIN objectSnapshot s ON s.recordId = m.recordId
WHERE m.spaceId = ? AND m.queueId = '' AND m.deleted = 0${where}
ORDER BY m.objectId, m.recordId`,
    params,
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

/** The JSON path of a top-level property, quoted as the compiler quotes it. */
const pathOf = (key: string): string => `$."${key.replaceAll('"', '""')}"`;

/**
 * A scalar comparison on one top-level property, with the compiler's strict typing (a number never
 * equals a string), or undefined for anything else.
 */
const propCondition = (key: string, filter: QueryAST.Filter, params: unknown[]): string | undefined => {
  const path = pathOf(key);
  const type = `json_type(s.snapshot, '${path.replaceAll("'", "''")}')`;
  const value = `json_extract(s.snapshot, '${path.replaceAll("'", "''")}')`;
  const typed = (operator: string, operand: unknown): string | undefined => {
    if (typeof operand === 'number') {
      params.push(operand);
      return `COALESCE(${type} IN ('integer', 'real') AND ${value} ${operator} ?, 0)`;
    }
    if (typeof operand === 'string') {
      params.push(operand);
      return `COALESCE(${type} = 'text' AND ${value} ${operator} ?, 0)`;
    }
    return undefined;
  };
  switch (filter.type) {
    case 'compare': {
      const operand = filter.value;
      if (filter.operator === 'eq') {
        if (typeof operand === 'boolean') {
          return `COALESCE(${type} = '${operand ? 'true' : 'false'}', 0)`;
        }
        return typed('=', operand);
      }
      switch (filter.operator) {
        case 'gt':
          return typed('>', operand);
        case 'gte':
          return typed('>=', operand);
        case 'lt':
          return typed('<', operand);
        case 'lte':
          return typed('<=', operand);
        default:
          return undefined;
      }
    }
    case 'range': {
      // One type test and one extraction for both bounds: each JSON function re-parses the snapshot.
      if (typeof filter.from === 'number' && typeof filter.to === 'number') {
        params.push(filter.from, filter.to);
        return `COALESCE(${type} IN ('integer', 'real') AND ${value} BETWEEN ? AND ?, 0)`;
      }
      if (typeof filter.from === 'string' && typeof filter.to === 'string') {
        params.push(filter.from, filter.to);
        return `COALESCE(${type} = 'text' AND ${value} BETWEEN ? AND ?, 0)`;
      }
      return undefined;
    }
    default:
      return undefined;
  }
};
