//
// Copyright 2026 DXOS.org
//

import { Language, defineLanguageFacet } from '@codemirror/language';
import { parser } from './parser';

const languageData = defineLanguageFacet({ commentTokens: { line: '#' } });

/**
 * Language definition for the interior of Deus fenced blocks.
 * Uses the base Language class since our parser is hand-written (not an LRParser).
 * Will switch to LRLanguage once the Lezer grammar is generated.
 */
export const mdlBlockLanguage = new Language(languageData, parser, [], 'deus-block');
