//
// Copyright 2022 DXOS.org
//

import { TSDocParser } from '@microsoft/tsdoc';
import * as fs from 'fs';
import * as path from 'path';
import * as protobuf from 'protocol-buffers-schema';
import { u } from 'unist-builder';

import { removeTrailing, visitDirectives } from './util.js';

type Type = {
  lang: string;
  parser?: (content: string, options: { hash?: string }) => string;
};

const langType: { [key: string]: Type } = {
  '.sh': {
    lang: 'bash'
  },
  '.js': {
    lang: 'javascript'
  },
  '.json': {
    lang: 'json'
  },
  // TODO(burdon): Extract definitions.
  //  https://tsdoc.org
  //  https://www.npmjs.com/package/@microsoft/tsdoc
  //  https://github.com/microsoft/tsdoc
  //  https://github.com/microsoft/tsdoc/blob/main/api-demo/src/simpleDemo.ts
  '.ts': {
    lang: 'ts',
    parser: (content, { hash: def }) => {
      const parser = new TSDocParser();
      parser.parseString(content);
      return content;
    }
  },
  '.proto': {
    lang: 'protobuf',
    parser: (content, { hash: message }) => {
      // Filter given message.
      if (message) {
        // https://www.npmjs.com/package/protocol-buffers-schema
        const schema = protobuf.parse(content);
        schema.messages = schema.messages.filter(({ name }) => name === message);
        schema.imports = [];
        schema.package = '';

        // TODO(burdon): Preserve comments.
        let output = protobuf.stringify(schema);
        output = output.replace(/syntax.*/, ''); // Syntax declaration.
        output = output.replace(/^\s*\n/gm, ''); // Blank lines.
        return output;
      }

      return content;
    }
  },
  '.yml': {
    lang: 'yaml'
  }
};

/**
 * Import snippets.
 * See https://www.gatsbyjs.com/plugins/gatsby-remark-embed-snippet/?=snippet
 * Snippets are contains within comment blocks.
 * The resulting code snippet is inserted above or replaces an existing block.
 */
// eslint-disable-next-line
export function remarkSnippets () {
  const { config } = this.data() ?? {};

  return (tree: any, inputFile) => {
    // visit(tree, 'code', (node, i, parent) => {
    //   console.log('>>>', node);
    // });

    visitDirectives(tree, (directive, args, node, i, parent) => {
      try {
        switch (directive) {
          case 'code': {
            const [file, hash] = args[0].split('#');
            const addLink = args[1] === 'link';

            const { ext } = path.parse(file);
            const { lang, parser } = langType[ext];

            const rootDir = inputFile?.dirname ?? config.baseDir;
            const filePath = path.join(rootDir, file);
            let content = fs.readFileSync(filePath, 'utf-8');

            if (lang) {
              content = removeTrailing(parser?.(content, { hash }) ?? content);

              // Number of existing nodes.
              let existing = 0;

              // Check if the link node already exists.
              const linkNode = parent.children[i! + 1];
              if (
                linkNode?.type === 'paragraph' &&
                linkNode.children[0]?.type === 'html' &&
                linkNode.children[0]?.value === '<sub>'
              ) {
                existing++;
              }

              // Check if the code node already exists.
              const codeNode = parent.children[i! + 1 + existing];
              if (codeNode?.type === 'code') {
                existing++;
              }

              // Nodes to insert.
              const nodes = [];

              if (addLink) {
                const getNodePackage = () => {
                  try {
                    // Test Node package.
                    // E.g., ../../packages/halo/halo-protocol/src/proto/defs/credentials.proto
                    const match = filePath.match(/(.+)\/(src\/.+\/.+)/);
                    const [, pkgDir, relPath] = match ?? [];
                    const { name } = JSON.parse(fs.readFileSync(`${pkgDir}/package.json`, 'utf-8'));
                    return [
                      name,
                      relPath
                    ];
                  } catch (err) {
                    return [];
                  }
                };

                // Get package name.
                const [pkgName, relPath] = getNodePackage();

                nodes.push(
                  u(
                    'paragraph',
                    {},
                    [
                      u('html', { value: '<sub>' }),
                      pkgName ? u('inlineCode', { value: pkgName }) : null,
                      u('link', { url: path.relative(rootDir, filePath) }, [
                        u('inlineCode', {
                          value: `[${relPath ?? path.basename(filePath)}]`
                        })
                      ]),
                      u('html', { value: '</sub>' })
                    ].filter(Boolean)
                  )
                );
              }

              nodes.push(u('code', { lang, value: content }));

              // Replace nodes.
              parent.children.splice(i! + 1, existing, ...nodes);
            }

            break;
          }
        }
      } catch (err) {
        console.error(String(err));
      }
    });
  };
}
