//
// Copyright 2026 DXOS.org
//

'use strict';

/**
 * ESLint rule to prevent the per-instance `QueryResult.atom` getter from being used inline on a
 * fresh `query(...)` call.
 *
 * `database.query(filter)` (and `queue.query(...)`, `registry.query(...)`) constructs a NEW
 * QueryResult every call, so `database.query(filter).atom` creates a new atom — and a new query
 * subscription — on every evaluation. Inside graph-builder connectors/actions and other atom
 * computes, which re-run on each reactive change, that subscription leaks: it is never released and
 * accumulates without bound (the type-create / plugin-enable freeze).
 *
 * Use the memoized `QueryResult.atom(queryable, query)` family from `@dxos/echo`, which keys the
 * atom by the queryable identifier and serialized query so the same query reuses one subscription.
 * The per-instance getter remains valid when accessed on a QueryResult held stable across renders
 * (e.g. behind a `useMemo`) — that is `held.atom`, not `held.query(...).atom`.
 *
 * @example
 * // bad
 * get(space.db.query(filter).atom);
 *
 * // good
 * get(QueryResult.atom(space.db, filter));
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow `.query(...).atom`; use the memoized QueryResult.atom(queryable, query) family.',
      recommended: true,
    },
    messages: {
      noInlineQueryAtom:
        'Avoid `.query(...).atom`: it builds a new QueryResult (and leaks a subscription) on every ' +
        'evaluation. Use the memoized `QueryResult.atom(queryable, query)` family from @dxos/echo instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        const isAtomGetter =
          node.property.type === 'Identifier' &&
          node.property.name === 'atom' &&
          node.object.type === 'CallExpression' &&
          node.object.callee.type === 'MemberExpression' &&
          node.object.callee.property.type === 'Identifier' &&
          node.object.callee.property.name === 'query';

        if (isAtomGetter) {
          context.report({
            node,
            messageId: 'noInlineQueryAtom',
          });
        }
      },
    };
  },
};
