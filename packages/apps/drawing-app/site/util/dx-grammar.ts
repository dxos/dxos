//
// Copyright 2026 DXOS.org
//

/** A TextMate grammar for `.dx`, enough for the docs' code blocks: statements, relation words, strings and comments. */
export const dxGrammar = {
  name: 'dx',
  scopeName: 'source.dx',
  patterns: [
    { name: 'comment.line.number-sign.dx', match: '(^|\\s)#.*$' },
    { name: 'string.quoted.double.dx', match: '"[^"]*"' },
    { name: 'keyword.control.dx', match: '^\\s*(diagram|group|node|edge)\\b' },
    {
      name: 'keyword.operator.word.dx',
      match:
        '\\b(extends|implements|composes|owns|one-to-many|many-to-many|depends-on|right-of|left-of|below|above|same-row|same-col|via|bus|compact)\\b',
    },
    { name: 'keyword.operator.dx', match: '<->|->|--|~' },
    { name: 'variable.parameter.dx', match: '\\b[a-z-]+(?==)' },
    { name: 'constant.numeric.dx', match: '\\b\\d+(\\.\\d+)?\\b' },
  ],
};
