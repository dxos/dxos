//
// Copyright 2024 DXOS.org
//

import type { SerializedElementNode, Spread } from 'lexical';

export type SerializedCodeNode = Spread<
  {
    type: 'code';
    version: 1;
  },
  SerializedElementNode
>;

export type TokenType = 'boolean' | 'error' | 'function' | 'reference';

export type Token = {
  text: string;
  types: TokenType[] | null;
};
