//
// Copyright 2026 DXOS.org
//

import { type QueryAST } from '@dxos/echo-protocol';
import { EID, type SpaceId } from '@dxos/keys';

import { UnsupportedQueryError } from '../errors.ts';

/**
 * A compiled change query: one statement over the recorded changes of objects' documents. Each row is
 * a change record, or, for an aggregate, one group's fields by name.
 */
export type CompiledChanges = {
  readonly sql: string;
  readonly params: readonly unknown[];
  readonly grouped: boolean;
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** A change record's fields, as columns of the change table. */
const COLUMNS: Record<string, string> = {
  key: 'hash',
  time: 'time',
  actor: 'actor',
  seq: 'seq',
  ops: 'ops',
};

/** Whether a query selects changes (`Filter.changes`) rather than objects. */
export const isChangesQuery = (query: QueryAST.Query): boolean => {
  switch (query.type) {
    case 'select':
      return query.filter.type === 'changes';
    case 'order':
    case 'limit':
    case 'skip':
    case 'options':
    case 'from':
    case 'aggregate':
      return isChangesQuery(query.query);
    default:
      return false;
  }
};

/**
 * Compiles a change query: a `Filter.changes` select, under any of order, limit, skip and one aggregate
 * (group, time bucket, count, sum, min, max), each applied in SQL.
 */
export const compileChanges = (query: QueryAST.Query, options: { spaceId: SpaceId }): CompiledChanges => {
  const params: unknown[] = [];
  const bind = (value: unknown): string => {
    params.push(value);
    return '?';
  };
  let grouped = false;
  let groupColumns = new Map<string, string>();

  const columnOf = (property: string): string => {
    if (grouped) {
      const column = groupColumns.get(property);
      if (!column) {
        throw new UnsupportedQueryError(`ordering change groups by ${property}`);
      }
      return column;
    }
    const column = COLUMNS[property];
    if (!column) {
      throw new UnsupportedQueryError(`change record property ${property}`);
    }
    return column;
  };

  const build = (node: QueryAST.Query): string => {
    switch (node.type) {
      case 'select': {
        if (node.filter.type !== 'changes') {
          throw new UnsupportedQueryError('a changes select combined with other filters');
        }
        // Bound in the order they appear in the statement.
        const space = bind(options.spaceId);
        const targets = (node.filter.targets ?? []).flatMap((target) => {
          const eid = EID.tryParse(target);
          const id = eid && EID.getEntityId(eid);
          return id ? [id] : [];
        });
        const narrowed =
          node.filter.targets === undefined
            ? ''
            : ` AND objectId IN (SELECT value FROM json_each(${bind(JSON.stringify(targets))}))`;
        return `SELECT hash, actor, seq, time, ops FROM echo_sqlite_changes WHERE spaceId = ${space}${narrowed}`;
      }
      case 'options':
      case 'from':
        return build(node.query);
      case 'order': {
        const inner = build(node.query);
        const terms = node.order.map((order) => {
          if (order.kind !== 'property') {
            throw new UnsupportedQueryError(`ordering changes by ${order.kind}`);
          }
          return `${columnOf(order.property)} ${order.direction === 'desc' ? 'DESC' : 'ASC'}`;
        });
        return `SELECT * FROM (${inner}) ORDER BY ${terms.join(', ')}`;
      }
      case 'limit':
        return `SELECT * FROM (${build(node.query)}) LIMIT ${bind(node.limit)}`;
      case 'skip':
        return `SELECT * FROM (${build(node.query)}) LIMIT -1 OFFSET ${bind(node.skip)}`;
      case 'aggregate': {
        const inner = build(node.query);
        const keys: string[] = [];
        const select = node.aggregates.map((aggregate, index) => {
          const column = `agg${index}`;
          groupColumns.set(aggregate.name, column);
          switch (aggregate.kind) {
            case 'group': {
              const expression = columnOf(aggregate.properties[0]);
              keys.push(column);
              return `${expression} AS ${column}`;
            }
            case 'time': {
              const size = aggregate.unit === 'hour' ? HOUR_MS : DAY_MS;
              keys.push(column);
              return `(${columnOf(aggregate.property)} / ${size}) * ${size} AS ${column}`;
            }
            case 'count':
              return `COUNT(*) AS ${column}`;
            case 'sum':
              return `TOTAL(${columnOf(aggregate.property)}) AS ${column}`;
            case 'max':
              return `MAX(${columnOf(aggregate.property)}) AS ${column}`;
            case 'min':
              return `MIN(${columnOf(aggregate.property)}) AS ${column}`;
            default:
              throw new UnsupportedQueryError(`a ${aggregate.kind} aggregate over changes`);
          }
        });
        grouped = true;
        groupColumns = new Map(groupColumns);
        const groupBy = keys.length > 0 ? ` GROUP BY ${keys.join(', ')}` : '';
        return `SELECT ${select.join(', ')} FROM (${inner})${groupBy}`;
      }
      default:
        throw new UnsupportedQueryError(`${node.type} over changes`);
    }
  };

  const statement = build(query);
  if (!grouped) {
    return { sql: statement, params, grouped };
  }
  // Grouped rows carry positional columns; each is named back to its aggregate, the names bound first
  // since they precede the inner statement's parameters in the text.
  const names = [...groupColumns];
  return {
    sql: `SELECT json_object(${names.map(([, column]) => `?, ${column}`).join(', ')}) AS record FROM (${statement})`,
    params: [...names.map(([name]) => name), ...params],
    grouped,
  };
};
