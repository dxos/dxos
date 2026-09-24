//
// Copyright 2026 DXOS.org
//

import { LRLanguage } from '@codemirror/language';
import { styleTags, tags } from '@lezer/highlight';

import { parser } from '../dsl/gen/diagram.ts';

//
// Unlike deus's MDL mode — which keeps highlighting on a regex ViewPlugin so prose inside a block
// cannot trip LR error recovery — the diagram grammar covers its whole input, so highlighting comes
// off the tree. The tags are the standard ones, so most of a document inherits the editor's own
// palette; `highlight.ts` covers only the two the theme leaves undefined.
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
        // On the leaf, not on `AttrValue`/`Unbound`: a named child with no tag of its own does not
        // inherit its parent's, so tagging the wrapper colours nothing. A numeric or quoted value
        // keeps its own number/string tag; this is the bare enum word (`grey`, `dashed`).
        'Word': tags.attributeValue,
        // `head=triangle`, `head=arrow`, `tail=circle`: schema literals that are also element-kind
        // keywords, so without the path they would colour as keywords while every other enum value
        // colours as a value. Listed in full, like the grammar's own `Word` alternation, so a
        // literal that starts colliding later is already covered.
        'Word/object Word/elements Word/move Word/remove Word/rect Word/ellipse Word/diamond Word/triangle Word/circle Word/line Word/curve Word/arc Word/text Word/arrow Word/portal':
          tags.attributeValue,
        '_': tags.null,
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
