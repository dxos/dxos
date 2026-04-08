//
// Copyright 2026 DXOS.org
//

import { LRLanguage } from '@codemirror/language';

import { parser } from './gen/mdl';

/**
 * Language definition for the interior of Deus fenced blocks.
 * Uses the generated Lezer LR parser for structural parsing (completion, linting).
 * Syntax highlighting is handled separately by the regex-based ViewPlugin in fences.ts
 * so that it is immune to LR error-recovery false positives on prose content.
 */
export const mdlBlockLanguage = LRLanguage.define({
  name: 'deus-block',
  parser: parser.configure({}),
  languageData: {
    commentTokens: { line: '#' },
  },
});
