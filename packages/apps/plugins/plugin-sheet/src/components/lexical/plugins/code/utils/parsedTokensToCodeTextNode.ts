//
// Copyright 2024 DXOS.org
//

import { $createLineBreakNode, $createTextNode, type LexicalNode } from 'lexical';

import $createCodeNode from './$createCodeNode';
import getTokenStyle from './getTokenStyle';
import type CodeNode from '../CodeNode';
import { type Token } from '../types';

export default (tokens: Token[]): CodeNode => {
  const nodes: LexicalNode[] = [];

  tokens.forEach((token) => {
    const type = token.types ? getTokenStyle(token.types) || '' : '';
    const lines = token.text.split(/[\r\n]/);
    return lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        nodes.push($createLineBreakNode());
      }
      if (line !== '') {
        nodes.push($createTextNode(line).setStyle(type));
      }
    });
  });

  return $createCodeNode().append(...nodes);
};
