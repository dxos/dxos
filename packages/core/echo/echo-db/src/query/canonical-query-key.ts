//
// Copyright 2025 DXOS.org
//

import jsonStableStringify from 'json-stable-stringify';

import { QueryAST } from '@dxos/echo-protocol';

/**
 * Strips cosmetic-only fields from a query AST so they don't affect the coalescing key.
 * Removes `debugLabel` from `QueryOptions` nodes and unwraps the `options` node entirely
 * when it becomes semantically empty (i.e. only held a debugLabel).
 */
const stripCosmeticFields = (ast: QueryAST.Query): QueryAST.Query => {
  return QueryAST.map(ast, (node) => {
    if (node.type === 'options') {
      const { debugLabel: _debugLabel, ...rest } = node.options;
      // If the options object is now empty, remove the wrapper entirely.
      if (Object.keys(rest).length === 0) {
        return node.query;
      }
      return { ...node, options: rest };
    }
    return node;
  });
};

/**
 * Computes a stable canonical string key for a query AST.
 *
 * Two queries differing only in cosmetic fields (e.g. `debugLabel`) produce the same key.
 * Two queries differing in any semantic field produce distinct keys.
 */
export const canonicalQueryKey = (ast: QueryAST.Query): string => {
  return jsonStableStringify(stripCosmeticFields(ast)) ?? '';
};
