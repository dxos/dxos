//
// Copyright 2022 DXOS.org
//

import directive from '@linkedmd/markdown-it-directive';
import memoize from 'lodash.memoize';
import MdIt from 'markdown-it';
import remarkParse from 'remark-parse';
import remarkPrettier from 'remark-prettier';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import { loadConfig as _loadConfig } from './config.js';
import { loadTypedocJson as _loadTypedocJson } from './loadTypedocJson.js';
import { Stringifier, packagesInProject, findReflection } from './templates/api/util.t/index.js';

export namespace Remark {
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
}
