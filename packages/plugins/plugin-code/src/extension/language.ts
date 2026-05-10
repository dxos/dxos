//
// Copyright 2026 DXOS.org
//

import { LanguageDescription, LanguageSupport } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { mdlFenceHighlight } from './fences';
import { mdlBlockLanguage } from './syntax';

/**
 * LanguageDescription for MDL fenced block bodies.
 * All Spec blocks use ```mdl fences; the block type is the first body line.
 * Pass this to createMarkdownExtensions({ codeLanguages: [mdlBlockDescription] }).
 */
export const mdlBlockDescription = LanguageDescription.of({
  name: 'spec-block',
  alias: ['mdl'],
  support: new LanguageSupport(mdlBlockLanguage),
});

/**
 * CodeMirror extensions for Spec .mdl block-body highlighting and fence decoration.
 * Does NOT include the Markdown language itself — pass mdlBlockDescription to
 * createMarkdownExtensions() instead so it merges cleanly with the standard language set.
 */
export const mdl = (): Extension => mdlFenceHighlight;
