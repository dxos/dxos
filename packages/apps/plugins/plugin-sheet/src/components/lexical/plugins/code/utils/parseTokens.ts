//
// Copyright 2024 DXOS.org
//

import { HighlightStyle } from '@codemirror/language';
import { highlightCode, tags } from '@lezer/highlight';
import { spreadsheet } from 'codemirror-lang-spreadsheet';

import { type Token, type TokenType } from '../types';

const { parser } = spreadsheet({}).language;

const style = HighlightStyle.define([
  { tag: tags.name, class: 'function' },
  { tag: tags.bool, class: 'boolean' },
  { tag: tags.color, class: 'reference' },
  { tag: tags.invalid, class: 'error' },
]);

export default (textToParse: string): Token[] | null => {
  const tree = parser.parse(textToParse);

  const tokens: Token[] = [];

  highlightCode(
    textToParse,
    tree,
    style,
    (code, classes) => {
      tokens.push({
        text: code,
        types: classes.split(' ') as TokenType[],
      });
    },
    () => {
      tokens.push({
        text: '\n',
        types: [],
      });
    },
  );

  return tokens;
};
