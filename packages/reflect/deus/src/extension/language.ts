//
// Copyright 2026 DXOS.org
//

import { LanguageDescription, LanguageSupport } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { type SpecIndex } from '../spec-index/spec-index.ts';
import { codeFenceHighlight } from './code.ts';
import { mdlFenceHighlight } from './fences.ts';
import { mdlLint } from './lint.ts';
import { mdlBlockLanguage } from './syntax.ts';

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
 * CodeMirror extensions for Spec .mdl block-body highlighting and fence decoration, and for the
 * highlighting of fenced code in other languages.
 * Given an `index`, it also lints spec references and dependencies against it.
 * Does NOT include the Markdown language itself — pass mdlBlockDescription to
 * createMarkdownExtensions() instead so it merges cleanly with the standard language set.
 */
export const mdl = ({ index }: { index?: SpecIndex | (() => SpecIndex | undefined) } = {}): Extension =>
  index ? [mdlFenceHighlight, codeFenceHighlight, mdlLint(index)] : [mdlFenceHighlight, codeFenceHighlight];
