//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { LanguageDescription, LanguageSupport } from '@codemirror/language';

import { mdlBlockLanguage } from './syntax';
import { mdlFenceHighlight } from './fences';

/**
 * LanguageDescription for MDL fenced block bodies.
 * All Deus blocks use ```mdl fences; the block type is the first body line.
 * Pass this to createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }).
 */
export const mdlBlockDescription = LanguageDescription.of({
  name: 'deus-block',
  alias: ['mdl'],
  support: new LanguageSupport(mdlBlockLanguage),
});

/**
 * CodeMirror extensions for Deus .mdl block-body highlighting and fence decoration.
 * Does NOT include the Markdown language itself — pass mdlBlockDescription to
 * createMarkdownExtensions() instead so it merges cleanly with the standard language set.
 */
export const deus = (): Extension => mdlFenceHighlight;
