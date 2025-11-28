//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';

import type { Filter as Filter$, Order as Order$, Query as Query$, QueryAST } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';

import * as Filter from './Filter';

class QueryClass implements Query$.Any {
  private static variance: Query$.Any['~Query'] = {} as Query$.Any['~Query'];

  constructor(public readonly ast: QueryAST.Query) {}

  '~Query' = QueryClass.variance;

  select(filter: Filter$.Any | Filter$.Props<any>): Query$.Any {
    if (Filter.is(filter)) {
      return new QueryClass({
        type: 'filter',
        selection: this.ast,
        filter: filter.ast,
      });
    } else {
      return new QueryClass({
        type: 'filter',
        selection: this.ast,
        filter: Filter.props(filter).ast,
      });
    }
  }

  reference(key: string): Query$.Any {
    return new QueryClass({
      type: 'reference-traversal',
      anchor: this.ast,
      property: key,
    });
  }

  referencedBy(target: Schema.Schema.All | string, key: string): Query$.Any {
    assertArgument(typeof target === 'string', 'target');
    assertArgument(!target.startsWith('dxn:'), 'target');
    return new QueryClass({
      type: 'incoming-references',
      anchor: this.ast,
      property: key,
      typename: target,
    });
  }

  sourceOf(relation: Schema.Schema.All | string, predicates?: Filter$.Props<unknown> | undefined): Query$.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'outgoing',
      filter: Filter.type(relation, predicates).ast,
    });
  }

  targetOf(relation: Schema.Schema.All | string, predicates?: Filter$.Props<unknown> | undefined): Query$.Any {
    return new QueryClass({
      type: 'relation',
      anchor: this.ast,
      direction: 'incoming',
      filter: Filter.type(relation, predicates).ast,
    });
  }

  source(): Query$.Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'source',
    });
  }

  target(): Query$.Any {
    return new QueryClass({
      type: 'relation-traversal',
      anchor: this.ast,
      direction: 'target',
    });
  }

  orderBy(...order: Order$.Any[]): Query$.Any {
    return new QueryClass({
      type: 'order',
      query: this.ast,
      order: order.map((o) => o.ast),
    });
  }

  options(options: QueryAST.QueryOptions): Query$.Any {
    return new QueryClass({
      type: 'options',
      query: this.ast,
      options,
    });
  }
}

export const is = (value: unknown): value is Query$.Any => {
  return typeof value === 'object' && value !== null && '~Query' in value;
};

export const fromAst = (ast: QueryAST.Query): Query$.Any => {
  return new QueryClass(ast);
};

export const select = <F extends Filter$.Any>(filter: F): Query$.Query<Filter$.Type<F>> => {
  return new QueryClass({
    type: 'select',
    filter: filter.ast,
  });
};

export const type = (schema: Schema.Schema.All | string, predicates?: Filter$.Props<unknown>): Query$.Any => {
  return new QueryClass({
    type: 'select',
    filter: Filter.type(schema, predicates).ast,
  });
};

export const all = (...queries: Query$.Any[]): Query$.Any => {
  if (queries.length === 0) {
    throw new TypeError(
      'Query.all combines results of multiple queries, to query all objects use Query.select(Filter.everything())',
    );
  }
  return new QueryClass({
    type: 'union',
    queries: queries.map((q) => q.ast),
  });
};

export const without = <T>(source: Query$.Query<T>, exclude: Query$.Query<T>): Query$.Query<T> => {
  return new QueryClass({
    type: 'set-difference',
    source: source.ast,
    exclude: exclude.ast,
  });
};
