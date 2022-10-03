//
// Copyright 2022 DXOS.org
//

import { ESLint } from 'eslint';
import markdownItContainer from 'markdown-it-container';
import type Token from 'markdown-it/lib/token';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import prettier from 'prettier';
import ts from 'typescript';
import { Plugin } from 'vuepress';

const require = createRequire(import.meta.url);
// TODO(wittjosiah): Consider adding the following rules to the global config:
//   - https://eslint.org/docs/latest/rules/newline-before-return
//   - https://eslint.org/docs/latest/rules/arrow-parens#as-needed
const eslint = new ESLint();
const prettierConfig = {
  parser: 'typescript',
  singleQuote: true,
  jsxSingleQuote: true
};
const tsConfig = {
  target: ts.ScriptTarget.ESNext,
  allowJs: true,
  jsx: ts.JsxEmit.Preserve
};

export const showcasePlugin = async (): Promise<Plugin> => {
  const demoFileNames = await readdir(join(__dirname, '../demos'));
  const demos = await Promise.all(demoFileNames.map(async fileName => {
    const name = fileName.split('.')[0];
    const filePath = require.resolve(`../demos/${fileName}`);
    const rawSource = await readFile(filePath, 'utf-8');
    // Remove copyright and default export.
    const tsSource = rawSource
      .trim()
      .split('\n')
      .slice(4, -1)
      .join('\n');
    const transpiledSource = prettier.format(
      ts.transpile(tsSource, tsConfig),
      prettierConfig
    );
    const [{ messages }] = await eslint.lintText(transpiledSource, { filePath: filePath.replace('.tsx', '.jsx') });
    const jsSource = messages
      .filter(({ ruleId }) => ruleId !== '@dxos/rules/header')
      .reduce((source, { fix }) => {
        if (!fix) {
          return source;
        }

        return source.slice(0, fix.range[0]) + fix.text + source.slice(fix.range[1]);
      }, transpiledSource);

    return {
      name,
      tsSource,
      jsSource
    };
  }));

  // Based on https://github.com/BuptStEve/vuepress-plugin-demo-code/blob/master/src/node/index.js.
  const render = (tokens: Token[], idx: number, { highlight }: any) => {
    const { nesting } = tokens[idx];
    if (nesting === -1) {
      return '</Showcase>\n';
    }

    const demo = demos.find(({ name }) => name === tokens[idx + 2].content);
    if (!demo) {
      throw new Error('Demo not found.');
    }

    const demoJson = encodeURIComponent(
      JSON.stringify({
        ...demo,
        tsSource: highlight(demo.tsSource, 'typescript'),
        jsSource: highlight(demo.jsSource, 'javascript')
      })
    );

    return `<Showcase demoJson="${demoJson}">\n`;
  };

  return {
    name: 'showcase-plugin',
    extendsMarkdown: md => {
      md.use(markdownItContainer, 'showcase', { render });
    }
  };
};
