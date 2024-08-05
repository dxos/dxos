//
// Copyright 2024 DXOS.org
//

import { type LexicalCommand } from 'lexical';

export const INSERT_ITEM_COMMAND: LexicalCommand<{
  item: any;
}> = {
  type: 'INSERT_ITEM',
};
