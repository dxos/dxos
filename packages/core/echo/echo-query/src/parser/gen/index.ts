//
// Copyright 2025 DXOS.org
//

import { LRParser } from '@lezer/lr';
import { parser } from './query';
import * as terms from './query.terms';

export namespace QueryDSL {
  export const Parser: LRParser = parser;
  export const Node = terms;
  export const Tokens = ['type:', 'AND', 'OR', 'NOT'];
}
