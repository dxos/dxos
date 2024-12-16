//
// Copyright 2024 DXOS.org
//

import type { CypherQuery } from './ast';
import { cypherQuery } from './combinators';

export type ParsedQuery = {
  ast: CypherQuery;
};

export const parseCypherQuery = (query: string): ParsedQuery => {
  const parseResult = cypherQuery.parse(query);
  if (parseResult.isOk) {
    return { ast: parseResult.value };
  } else {
    throw new Error(`Failed to parse query: ${parseResult}`);
  }
};
