//
// Copyright 2024 DXOS.org
//

import { type LexicalNode } from 'lexical';

import CodeTextNode from '../CodeNode';

export default (node: LexicalNode | null | undefined): node is CodeTextNode => node instanceof CodeTextNode;
