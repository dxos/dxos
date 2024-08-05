//
// Copyright 2024 DXOS.org
//

import { type LexicalNode } from 'lexical';

import getLineTextAndCursorPosition from './getLineTextAndCursorPosition';
import parseTokens from '../../code/utils/parseTokens';

export default (initialNode: LexicalNode, initialOffset: number): string[] | null => {
  const [text, cursorIndex] = getLineTextAndCursorPosition(initialNode, initialOffset);
  if (text === null) {
    return null;
  }

  const tokens = parseTokens(text);
  if (tokens === null) {
    return null;
  }

  let currentIndex = 0;
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const token = tokens[tokenIndex];

    currentIndex += token.text.length;

    if (currentIndex >= cursorIndex) {
      return token.types;
    }
  }

  return null;
};
