//
// Copyright 2026 DXOS.org
//

import { LanguageDescription, LanguageSupport, syntaxHighlighting } from '@codemirror/language';
import { type Extension } from '@codemirror/state';

import { diagramComplete } from './complete.ts';
import { diagramHighlightStyle } from './highlight.ts';
import { diagramLint, type LintOptions } from './lint.ts';
import { diagramLanguage } from './syntax.ts';

/**
 * The fence dispatch point. Pass this alongside deus's `mdlBlockDescription` in
 * `createMarkdownExtensions({ codeLanguages: [...] })` and a ```diagram block inside a `.mdl`
 * document parses with the diagram grammar — a sibling of MDL's, not a nesting inside it. See
 * `docs/DSL.md`.
 */
export const diagramBlockDescription = LanguageDescription.of({
  name: 'diagram',
  alias: ['dxd'],
  support: new LanguageSupport(diagramLanguage),
});

/** The whole editing surface for a standalone DSL buffer: mode, highlighting, completion, lint. */
export const diagram = (options: LintOptions = {}): Extension => [
  new LanguageSupport(diagramLanguage),
  syntaxHighlighting(diagramHighlightStyle()),
  diagramComplete,
  diagramLint(options),
];
