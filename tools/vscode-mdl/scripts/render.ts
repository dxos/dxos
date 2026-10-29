//
// Copyright 2026 DXOS.org
//

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { type LanguageRegistration, createHighlighter } from 'shiki';

import { mdlRules } from '../src/palette.ts';
import { contributedGrammars, grammarPaths } from '../src/testing/registry.ts';

/** Renders an `.mdl` file to standalone HTML with the extension's grammar, as VS Code would colour it. */
const main = async () => {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    throw new Error('usage: render.ts <file.mdl> <out.html>');
  }

  const paths = grammarPaths();
  const langs: LanguageRegistration[] = contributedGrammars().map(({ scopeName, injectTo }) => ({
    ...JSON.parse(readFileSync(paths[scopeName], 'utf8')),
    name: scopeName,
    injectTo,
  }));

  const highlighter = await createHighlighter({ themes: ['github-dark'], langs: ['markdown', 'yaml', ...langs] });
  const theme = highlighter.getTheme('github-dark');
  const html = highlighter.codeToHtml(readFileSync(input, 'utf8'), {
    lang: 'text.html.markdown.mdl',
    theme: { ...theme, name: 'mdl', settings: [...(theme.settings ?? []), ...mdlRules()] },
  });

  writeFileSync(
    output,
    `<!doctype html><meta charset="utf-8"><title>${basename(input)}</title>` +
      '<style>body{margin:0;background:#0d1117}pre{margin:0;padding:24px;font:14px/1.5 ui-monospace,Menlo,monospace}</style>' +
      html,
  );
};

void main();
