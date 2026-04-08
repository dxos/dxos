//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { LanguageDescription, LanguageSupport } from '@codemirror/language';

import { mdlBlockLanguage } from './syntax';
import { mdlHighlight } from './highlight';
import { mdlFenceHighlight } from './fences';
import { BLOCK_TYPES } from './constants';

/**
 * LanguageDescription for MDL fenced block bodies.
 * Pass this to createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] })
 * so the MDL inner grammar is used for all known block types.
 */
export const mdlBlockDescription = LanguageDescription.of({
  name: 'deus-block',
  alias: [...BLOCK_TYPES],
  support: new LanguageSupport(mdlBlockLanguage),
});

/**
 * CodeMirror extensions for Deus .mdl block-body highlighting and fence decoration.
 * Does NOT include the Markdown language itself — pass mdlBlockDescription to
 * createMarkdownExtensions() instead so it merges cleanly with the standard language set.
 */
export const deus = (): Extension => [mdlHighlight, mdlFenceHighlight];
