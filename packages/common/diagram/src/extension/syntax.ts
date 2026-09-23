//
// Copyright 2026 DXOS.org
//

import { LRLanguage } from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';

import { parser } from '../dsl/gen/diagram.ts';

//
// Unlike deus's MDL mode — which keeps highlighting on a regex ViewPlugin so prose inside a block
// cannot trip LR error recovery — the diagram grammar covers its whole input, so highlighting comes
// off the tree. The tags are the standard ones, so the editor's existing highlight style colors it
// with no per-language style to maintain.
//

export const diagramLanguage = LRLanguage.define({
  name: 'diagram',
  parser: parser.configure({
    props: [
      styleTags({
        'object elements move remove': tags.definitionKeyword,
        'rect ellipse diamond triangle circle line curve arc text arrow portal': tags.keyword,
        // A quoted id is still an id, not a string.
        'Id/String': tags.variableName,
        'Id': tags.variableName,
        'Ref': tags.propertyName,
        'Label': tags.string,
        'String': tags.string,
        'Number': tags.number,
        'Size': tags.number,
        'AttrName': tags.attributeName,
        'AttrValue': tags.attributeValue,
        'Unbound': tags.null,
        'Comment': tags.lineComment,
        '-> @ ..': tags.operator,
        '=': tags.definitionOperator,
        ',': tags.separator,
        '{ }': tags.brace,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: '#' },
    closeBrackets: { brackets: ['{', '"'] },
  },
});
