//
// Copyright 2024 DXOS.org
//

import { delimitedIndent, foldInside, foldNodeProp, indentNodeProp, LRLanguage } from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';

// @ts-ignore
import parser from './formula.grammar?raw';

export const spreadsheetLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: delimitedIndent({ closing: ')', align: false }),
      }),
      foldNodeProp.add({
        Application: foldInside,
      }),
      styleTags({
        Identifier: tags.variableName,
        Boolean: tags.bool,
        String: tags.string,
        LineComment: tags.lineComment,
        '( )': tags.paren,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: ';' },
  },
});
