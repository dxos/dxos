//
// Copyright 2024 DXOS.org
//

import { $isRangeSelection, type LexicalNode, type TextNode } from 'lexical';

import { type QueryData, type TypeAheadSelection } from '../typeahead/types';
import $isSimpleText from '../typeahead/utils/$isSimpleText';

export default (selection: TypeAheadSelection | null): QueryData | null => {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const node = selection.getNodes()[0];
  if (!$isSimpleText(node)) {
    return null;
  }

  const anchor = selection.anchor;
  const offset = anchor.offset;

  let insertionBeginOffset = -1;
  let insertionBeginTextNode: LexicalNode | null = null;
  let positionBeginOffset = -1;
  let positionBeginTextNode: LexicalNode | null = null;

  {
    let currentOffset = offset - 1;
    let currentTextNode: LexicalNode | null = node;
    let currentText = node.getTextContent();

    if (currentTextNode !== null) {
      while (true) {
        for (currentOffset; currentOffset >= 0; currentOffset--) {
          const char = currentText.charAt(currentOffset);

          if (isBoundaryChar(char)) {
            // We've found the beginning of this expression.
            break;
          }

          positionBeginOffset = currentOffset;
          positionBeginTextNode = currentTextNode;
        }

        const previousTextNode: TextNode | null = currentTextNode.getPreviousSibling();
        if (previousTextNode === null || !$isSimpleText(previousTextNode)) {
          break;
        }

        currentTextNode = previousTextNode;
        currentText = previousTextNode.getTextContent();
        currentOffset = currentText.length - 1;
      }
    }

    if (insertionBeginTextNode === null) {
      // Edge case; replace the whole text (e.g. "SU|" -> "SUM")
      insertionBeginOffset = positionBeginOffset;
      insertionBeginTextNode = positionBeginTextNode;
    }
  }

  let expression = '';

  let insertionEndOffset = -1;
  let insertionEndTextNode: LexicalNode | null = null;
  let positionEndTextNode: LexicalNode | null = null;

  {
    let currentOffset = positionBeginOffset;
    let currentTextNode: LexicalNode | null = positionBeginTextNode;
    let currentText = positionBeginTextNode?.getTextContent() ?? '';

    if (currentTextNode !== null) {
      while (true) {
        for (currentOffset; currentOffset < currentText.length; currentOffset++) {
          const char = currentText.charAt(currentOffset);
          if (isBoundaryChar(char)) {
            if (insertionEndTextNode === null) {
              insertionEndTextNode = currentTextNode;
              insertionEndOffset = currentOffset;
            }

            if (positionEndTextNode === null) {
              positionEndTextNode = currentTextNode;
            }

            break;
          }

          if (positionEndTextNode === null) {
            expression += char;
          }
        }

        const nextTextNode: TextNode | null = currentTextNode.getNextSibling();
        if (nextTextNode === null) {
          // We've reached the end of the text.
          break;
        } else if (!$isSimpleText(nextTextNode)) {
          // Don't try to parse complex nodes.
          break;
        } else {
          const nextTextContent = nextTextNode.getTextContent() || '';
          const nextChar = nextTextContent.charAt(0);
          if (isBoundaryChar(nextChar)) {
            // If the next node is a boundary, end on the current node.
            break;
          }
        }

        currentTextNode = nextTextNode;
        currentText = nextTextNode.getTextContent();
        currentOffset = 0;
      }
    }

    if (insertionEndTextNode === null) {
      insertionEndOffset = currentOffset;
      insertionEndTextNode = currentTextNode;
    }

    if (positionEndTextNode === null) {
      positionEndTextNode = currentTextNode;
    }
  }

  if (insertionBeginTextNode === null) {
    insertionBeginTextNode = node;
    insertionBeginOffset = offset;
  }
  if (insertionEndTextNode === null) {
    insertionEndTextNode = node;
    insertionEndOffset = offset;
  }

  return {
    query: expression,
    textRange: {
      beginOffset: insertionBeginOffset,
      beginTextNode: insertionBeginTextNode,
      endOffset: insertionEndOffset,
      endTextNode: insertionEndTextNode,
    },
  };
};

const isBoundaryChar = (char: string): boolean => char.match(/[\s().,'"=]/) !== null;
