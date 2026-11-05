//
// Copyright 2026 DXOS.org
//

import { THEMES } from './palette.mjs';

const theme = (name) => {
  const { surface, fg, muted, code } = THEMES[name];
  return {
    name: `echo-${name}`,
    type: name,
    colors: { 'editor.background': surface, 'editor.foreground': fg },
    tokenColors: [
      { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: muted, fontStyle: 'italic' } },
      { scope: ['keyword', 'storage', 'storage.type', 'keyword.operator.new'], settings: { foreground: code.keyword } },
      { scope: ['string', 'string.quoted', 'punctuation.definition.string'], settings: { foreground: code.string } },
      { scope: ['constant.numeric', 'constant.language'], settings: { foreground: code.constant } },
      {
        scope: [
          'entity.name.type',
          'entity.name.class',
          'support.type',
          'support.class',
          'entity.other.inherited-class',
        ],
        settings: { foreground: code.type },
      },
      {
        scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'],
        settings: { foreground: code.fn },
      },
      { scope: ['variable.other.property', 'meta.object-literal.key'], settings: { foreground: fg } },
      { scope: ['punctuation', 'keyword.operator'], settings: { foreground: muted } },
    ],
  };
};

export const codeThemes = [theme('dark'), theme('light')];
