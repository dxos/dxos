//
// Copyright 2024 DXOS.org
//

import { $isLineBreakNode, type LexicalNode } from 'lexical';

export default (initialNode: LexicalNode, initialOffset: number): [text: string | null, cursorIndex: number] => {
  let startNode: LexicalNode | null = null;
  let cursorIndex = -1;

  let currentNode: LexicalNode | null = initialNode;
  while (currentNode !== null) {
    if ($isLineBreakNode(currentNode)) {
      break;
    } else {
      startNode = currentNode;

      if (currentNode === initialNode) {
        cursorIndex = initialOffset;
      } else {
        cursorIndex += currentNode.getTextContent().length;
      }
    }

    currentNode = currentNode.getPreviousSibling();
  }

  if (startNode === null) {
    return [null, -1];
  }

  let text = '';

  currentNode = startNode;
  while (currentNode !== null) {
    if ($isLineBreakNode(currentNode)) {
      break;
    } else {
      text += currentNode.getTextContent();
    }

    currentNode = currentNode.getNextSibling();
  }

  return [text, cursorIndex];
};
