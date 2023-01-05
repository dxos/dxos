//
// Copyright 2022 DXOS.org
//

import directive from '@linkedmd/markdown-it-directive';
import memoize from 'lodash.memoize';
import MdIt from 'markdown-it';
import { readFile } from 'node:fs/promises';
import { EOL } from 'node:os';
import remarkParse from 'remark-parse';
import remarkPrettier from 'remark-prettier';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { loadConfig as _loadConfig } from './config.js';
import { loadTypedocJson as _loadTypedocJson } from './loadTypedocJson.js';
import { Stringifier, packagesInProject, findReflection } from './templates/api/util.t/index.js';

// TODO(wittjosiah): Factor out.
// Copied from https://github.com/kevin940726/remark-code-import/blob/379d0f2008b66d8b8674a9b971998583ffb65161/src/index.ts.
const extractLines = (
  content: string,
  fromLine: number | undefined,
  hasDash: boolean,
  toLine: number | undefined,
  preserveTrailingNewline = false
) => {
  const lines = content.split(EOL);
  const start = fromLine || 1;
  let end;
  if (!hasDash) {
    end = start;
  } else if (toLine) {
    end = toLine;
  } else if (lines[lines.length - 1] === '' && !preserveTrailingNewline) {
    end = lines.length - 1;
  } else {
    end = lines.length;
  }
  return lines.slice(start - 1, end).join('\n');
};

// Based on https://github.com/kevin940726/remark-code-import/blob/379d0f2008b66d8b8674a9b971998583ffb65161/src/index.ts.
const parseDemo = (label: string) => {
  const res = /^demo=(?<path>.+?)(?:(?:#(?:L(?<from>\d+)(?<dash>-)?)?)(?:L(?<to>\d+))?)?$/.exec(label);
  if (!res || !res.groups || !res.groups.path) {
    throw new Error(`Unable to parse file path ${label}`);
  }
  const demo = res.groups.path.split('#')[0];
  const fromLine = res.groups.from ? parseInt(res.groups.from, 10) : undefined;
  const hasDash = !!res.groups.dash || fromLine === undefined;
  const toLine = res.groups.to ? parseInt(res.groups.to, 10) : undefined;

  return {
    demo,
    fromLine,
    hasDash,
    toLine
  };
};

export namespace Remark {
  /**
   * Use this directive statement in a remark stack to process `apidoc` directives and emit generated API documentation within the directive fences. See https://www.npmjs.com/package/remark-directive.
   * For example:
   * ```md
   * :::apidoc[@dxos/client.Client]{.methods level=2}
   * // contents will be replaced by the methods of Client from @dxos/client
   * // and headings will start at level 2
   * :::
   * ```
   * @returns a remark compatible plugin
   */
  export const apiDocGenerateDirective = () => {
    const loadConfig = memoize(_loadConfig);
    const loadTypedocJson = memoize(_loadTypedocJson, (c) => c.typedocJsonPath);
    return async (tree: any, vfile: any) => {
      const config = await loadConfig();
      const api = await loadTypedocJson(config);
      const stringifier = new Stringifier(api);
      const requests: any[] = [];
      visit(tree, (node) => {
        if (node.type === 'containerDirective') {
          if (node.name === 'apidoc') {
            requests.push(node);
          }
        }
      });
      const promises = requests.map(async (node) => {
        const directiveLabelNode = node?.children?.find((c: any) => !!c?.data?.directiveLabel);
        const label = directiveLabelNode?.children?.find((c: any) => c.type === 'text')?.value;
        if (!label) {
          console.warn(`invalid apidoc directive, no [label] found in ${vfile.path}`);
          return tree;
        }
        const [packageName, symbolName] = label.split('.');
        const pkage = packagesInProject(api)?.find((p) => p.name === packageName);
        if (!pkage) {
          console.warn(`package ${packageName} not found while processing directive in ${vfile.path}`);
          return tree;
        }
        const symbol = findReflection(pkage, (node) => node.name === symbolName);
        if (!symbol) {
          console.warn(
            `symbol ${symbol} of package ${packageName} not found while processing directive in ${vfile.path}`
          );
          return tree;
        }
        const content = stringifier.stringify(symbol, {
          subset: node.attributes?.class,
          level: node?.attributes?.level ? Number(node?.attributes?.level) : undefined,
          headers: !!node?.attributes.headers
        });
        const insertedAst = await unified().use(remarkParse).use(remarkPrettier).parse(content);
        node.children = [directiveLabelNode, ...insertedAst.children];
      });
      await Promise.all(promises);
      return tree;
    };
  };

  export const showcaseGenerateDirective = () => {
    return async (tree: any, vfile: any) => {
      const requests: any[] = [];

      visit(tree, (node) => {
        if (node.type === 'containerDirective') {
          if (node.name === 'showcase') {
            requests.push(node);
          }
        }
      });

      await Promise.all(
        requests.map(async (node) => {
          const directiveLabelNode = node?.children?.find((c: any) => !!c?.data?.directiveLabel);
          const label = directiveLabelNode?.children?.find((c: any) => c.type === 'text')?.value;
          if (!label) {
            console.warn(`invalid showcase directive, no [label] found in ${vfile.path}`);
            return tree;
          }
          const { demo, fromLine, hasDash, toLine } = parseDemo(label);
          const filePath = `./src/demos/${demo}.tsx`;
          const fileContents = await readFile(filePath, 'utf-8');
          const trimmedContents = extractLines(fileContents, fromLine, hasDash, toLine);
          const content = `\`\`\`tsx\n${trimmedContents}\n\`\`\``;
          const insertedAst = await unified().use(remarkParse).use(remarkPrettier).parse(content);
          node.children = [directiveLabelNode, ...insertedAst.children];
        })
      );

      return tree;
    };
  };
}

export namespace MarkdownIt {
  export const apiDocRenderDirective = (md: MdIt) => {
    md.use(directive);
    md.use((md) => {
      (md as any).blockDirectives.apidoc = (
        state: any,
        content: any,
        contentTitle: any,
        inlineContent: any,
        dests: any,
        attrs: any,
        contentStartLine: any,
        contentEndLine: any,
        contentTitleStart: any,
        contentTitleEnd: any,
        inlineContentStart: any,
        inlineContentEnd: any,
        directiveStartLine: any,
        directiveEndLine: any
      ) => {
        const token = state.push('html_block', '', 0);
        token.map = [directiveStartLine, directiveEndLine];
        const rendered = md.render(content);
        token.content = rendered;
      };
    });
  };

  export const showcaseRenderDirective = (md: MdIt) => {
    md.use(directive);
    md.use((md) => {
      (md as any).blockDirectives.showcase = (
        state: any,
        content: any,
        contentTitle: any,
        inlineContent: any,
        dests: any,
        attrs: any,
        contentStartLine: any,
        contentEndLine: any,
        contentTitleStart: any,
        contentTitleEnd: any,
        inlineContentStart: any,
        inlineContentEnd: any,
        directiveStartLine: any,
        directiveEndLine: any
      ) => {
        const token = state.push('html_block', '', 0);
        token.map = [directiveStartLine, directiveEndLine];
        const { demo } = parseDemo(inlineContent);
        const rendered = md.render(content);
        // TODO(wittjosiah): Move Showcase component out of docs.
        token.content = `<Showcase demo="${demo}" />\n${rendered}`;
      };
    });
  };
}
