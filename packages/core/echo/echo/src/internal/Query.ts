//
// Copyright 2025 DXOS.org
//

import { type QueryAST } from '@dxos/echo-protocol';

/**
 * Returns a human-readable string representation of a Filter AST.
 */
export const prettyFilter = (filter: QueryAST.Filter): string => {
  switch (filter.type) {
    case 'object': {
      const parts: string[] = [];
      if (filter.typename !== null) {
        parts.push(String(filter.typename));
      }
      if (filter.id !== undefined && filter.id.length > 0) {
        parts.push(`id: [${filter.id.join(', ')}]`);
      }
      const propEntries = Object.entries(filter.props);
      if (propEntries.length > 0) {
        const propsStr = propEntries.map(([k, v]) => `${k}: ${prettyFilter(v)}`).join(', ');
        parts.push(`{ ${propsStr} }`);
      }
      if (filter.foreignKeys !== undefined && filter.foreignKeys.length > 0) {
        parts.push(`foreignKeys: [${filter.foreignKeys.map((fk) => JSON.stringify(fk)).join(', ')}]`);
      }
      return parts.length > 0 ? `Filter.type(${parts.join(', ')})` : 'Filter.everything()';
    }
    case 'compare':
      return `Filter.${filter.operator}(${JSON.stringify(filter.value)})`;
    case 'in':
      return `Filter.in([${filter.values.map((v) => JSON.stringify(v)).join(', ')}])`;
    case 'contains':
      return `Filter.contains(${JSON.stringify(filter.value)})`;
    case 'tag':
      return `Filter.tag(${JSON.stringify(filter.tag)})`;
    case 'range':
      return `Filter.range(${JSON.stringify(filter.from)}, ${JSON.stringify(filter.to)})`;
    case 'text-search':
      return filter.searchKind
        ? `Filter.textSearch(${JSON.stringify(filter.text)}, ${JSON.stringify(filter.searchKind)})`
        : `Filter.textSearch(${JSON.stringify(filter.text)})`;
    case 'timestamp':
      return `Filter.${filter.field}.${filter.operator}(${filter.value})`;
    case 'not':
      return `Filter.not(${prettyFilter(filter.filter)})`;
    case 'and':
      return `Filter.and(${filter.filters.map(prettyFilter).join(', ')})`;
    case 'or':
      return `Filter.or(${filter.filters.map(prettyFilter).join(', ')})`;
  }
};

/**
 * Returns a human-readable string representation of a Query AST.
 */
export const prettyQuery = (query: QueryAST.Query): string => {
  switch (query.type) {
    case 'select':
      return `Query.select(${prettyFilter(query.filter)})`;
    case 'filter':
      return `${prettyQuery(query.selection)}.select(${prettyFilter(query.filter)})`;
    case 'reference-traversal':
      return `${prettyQuery(query.anchor)}.reference(${JSON.stringify(query.property)})`;
    case 'incoming-references': {
      const args: string[] = [];
      if (query.typename !== null) {
        args.push(String(query.typename));
      }
      if (query.property !== null) {
        args.push(JSON.stringify(query.property));
      }
      return `${prettyQuery(query.anchor)}.referencedBy(${args.join(', ')})`;
    }
    case 'relation': {
      const method =
        query.direction === 'outgoing' ? 'sourceOf' : query.direction === 'incoming' ? 'targetOf' : 'relationOf';
      const filterStr = query.filter !== undefined ? prettyFilter(query.filter) : '';
      return `${prettyQuery(query.anchor)}.${method}(${filterStr})`;
    }
    case 'relation-traversal':
      return `${prettyQuery(query.anchor)}.${query.direction}()`;
    case 'hierarchy-traversal':
      return query.direction === 'to-parent'
        ? `${prettyQuery(query.anchor)}.parent()`
        : `${prettyQuery(query.anchor)}.children()`;
    case 'union':
      return `Query.all(${query.queries.map(prettyQuery).join(', ')})`;
    case 'set-difference':
      return `Query.without(${prettyQuery(query.source)}, ${prettyQuery(query.exclude)})`;
    case 'order': {
      const orders = query.order.map((o) => {
        if (o.kind === 'natural') {
          return 'Order.natural()';
        } else if (o.kind === 'rank') {
          return `Order.rank(${JSON.stringify(o.direction)})`;
        } else {
          return `Order.property(${JSON.stringify(o.property)}, ${JSON.stringify(o.direction)})`;
        }
      });
      return `${prettyQuery(query.query)}.orderBy(${orders.join(', ')})`;
    }
    case 'options': {
      const opts = query.options;
      const parts: string[] = [];
      if (opts.deleted !== undefined) {
        parts.push(`deleted: ${JSON.stringify(opts.deleted)}`);
      }
      return `${prettyQuery(query.query)}.options({ ${parts.join(', ')} })`;
    }
    case 'from': {
      if (query.from._tag === 'scope') {
        const scope = query.from.scope;
        const parts: string[] = [];
        if (scope.spaceIds !== undefined) {
          parts.push(`spaceIds: [${scope.spaceIds.map((s) => JSON.stringify(s)).join(', ')}]`);
        }
        if (scope.queues !== undefined) {
          parts.push(`queues: [${scope.queues.map(String).join(', ')}]`);
        }
        if (scope.allQueuesFromSpaces !== undefined) {
          parts.push(`allQueuesFromSpaces: ${scope.allQueuesFromSpaces}`);
        }
        return `${prettyQuery(query.query)}.from({ ${parts.join(', ')} })`;
      }
      return `${prettyQuery(query.query)}.from(${prettyQuery(query.from.query)})`;
    }
    case 'limit':
      return `${prettyQuery(query.query)}.limit(${query.limit})`;
  }
};
