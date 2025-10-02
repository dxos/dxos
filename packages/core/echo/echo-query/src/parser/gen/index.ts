//
// Copyright 2025 DXOS.org
//

import { parser } from './query';
import * as terms from './query.terms';

export namespace QueryDSL {
  export const Parser = parser;
  export const Node = terms;
}
