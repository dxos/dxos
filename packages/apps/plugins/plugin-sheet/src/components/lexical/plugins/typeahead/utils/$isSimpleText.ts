//
// Copyright 2024 DXOS.org
//

import { $isTextNode, type LexicalNode } from 'lexical';

export default (node: LexicalNode): boolean =>
  $isTextNode(node) && typeof node.isSimpleText === 'function' && node.isSimpleText();
