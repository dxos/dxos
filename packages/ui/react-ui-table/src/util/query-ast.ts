//
// Copyright 2025 DXOS.org
//

import { type QueryAST } from '@dxos/echo';

/**
 * Extracts order clauses from a query AST.
 * Handles nested structures (options, order, etc.).
 */
export const extractOrder = (queryAst: QueryAST.Query): readonly QueryAST.Order[] | undefined => {
  if (queryAst.type === 'order') {
    return queryAst.order;
  }
  if (queryAst.type === 'options') {
    return extractOrder(queryAst.query);
  }
  return undefined;
};
