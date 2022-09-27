//
// Copyright 2022 DXOS.org
//

import markdownItContainer from 'markdown-it-container';
import type Token from 'markdown-it/lib/token';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import prettier from 'prettier';
import ts from 'typescript';
import { Plugin } from 'vuepress';

const require = createRequire(import.meta.url);
// Based on https://github.com/anuraghazra/vscode-strip-ts-copy/blob/main/src/extension.ts
const prettierConfig = { parser: 'babel-ts' };
const tsConfig = {
  target: ts.ScriptTarget.ESNext,
  allowJs: true,
  jsx: ts.JsxEmit.Preserve
};

// Based on https://github.com/BuptStEve/vuepress-plugin-demo-code/blob/master/src/node/index.js.
export const showcasePlugin = (): Plugin => {
  const showcaseCodeMark = 'showcase';

  const render = (tokens: Token[], idx: number, { highlight }: any) => {
    const { nesting } = tokens[idx];
    if (nesting === -1) {
      return '</Showcase>\n';
    }

    const name = tokens[idx + 2].content;
    const filePath = require.resolve(`../demos/${name}.tsx`);
    const source = readFileSync(filePath, 'utf-8')
      .trim()
      .split('\n')
      .slice(3) // Remove copyright.
      .join('\n');
    const tsSource = highlight(source, 'typescript');
    // TODO(wittjosiah): Run eslint as well for spacing.
    const transpiledSource = prettier.format(ts.transpile(source, tsConfig), prettierConfig);
    const jsSource = highlight(transpiledSource, 'javascript');

    const demo = {
      name,
      tsSource,
      jsSource
    };

    return `<Showcase demoJson="${encodeURIComponent(JSON.stringify(demo))}">\n`;
  };

  return {
    name: 'showcase-plugin',
    extendsMarkdown: md => {
      md.use(markdownItContainer, showcaseCodeMark, { render });
    }
  };
};
