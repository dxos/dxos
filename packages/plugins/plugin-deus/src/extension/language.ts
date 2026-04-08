//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { LanguageDescription, LanguageSupport } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';

import { mdlBlockLanguage } from './syntax';
import { mdlHighlight } from './highlight';
import { mdlFenceHighlight } from './fences';
import { BLOCK_TYPES } from './constants';

// The CM Markdown language uses the info string (the word after the opening fence)
// to look up a language for the block body.
// We register each block type name as an alias pointing to the same inner grammar.
const mdlBlockDescription = LanguageDescription.of({
  name: 'deus-block',
  alias: [...BLOCK_TYPES],
  support: new LanguageSupport(mdlBlockLanguage),
});

/**
 * CodeMirror extension for the Deus .mdl language.
 * Returns the Markdown-based language support plus block-body highlighting.
 */
export const deus = (): Extension => [
  markdown({
    base: markdownLanguage,
    codeLanguages: [mdlBlockDescription],
  }),
  mdlHighlight,
  mdlFenceHighlight,
];
