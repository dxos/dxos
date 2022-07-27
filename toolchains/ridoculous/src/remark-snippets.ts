//
// Copyright 2022 DXOS.org
//

import { TSDocParser } from '@microsoft/tsdoc';
import assert from 'assert';
import chalk from 'chalk';
import debug from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import * as protobuf from 'protocol-buffers-schema';
import { u } from 'unist-builder';

import { removeTrailing, visitDirectives } from './util.js';

const log = debug('dxos:ridoculous:debug');
const error = debug('dxos:ridoculous:error');

type Type = {
  lang: string
  parser?: (content: string, options: { hash?: string }) => string
}

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
export function remarkSnippets () {
  const { config } = this.data();
  assert(config);

  return (tree: any, file) => {
    const { baseDir = file.dirname } = config;

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
            const filePath = path.join(baseDir, file);
            log(`Reading snippet: ${chalk.yellow(filePath)}`);

            let content = fs.readFileSync(filePath, 'utf8');
            if (lang) {
              content = removeTrailing(parser?.(content, { hash }) ?? content);

              // Check for code block.
              const next = parent.children[i! + 1];
              const link = parent.children[i! + 2];
              if (next?.type === 'code') {
                Object.assign(next, {
                  lang,
                  value: content
                });
              } else {
                // https://github.com/syntax-tree/unist-builder
                const code = u('code', { lang, value: content });
                parent.children.splice(i! + 1, 0, code);
              }

              // eslint-disable-next-line no-constant-condition
              if (addLink && false) {
                // Check exists.
                const exists = (link?.type === 'paragraph' &&
                  link.children[0]?.type === 'html' &&
                  link.children[0]?.value === '<sup>');

                // TODO(burdon): Create realtive link.
                const newLink = u('paragraph', {}, [
                  u('html', { value: '<sup>' }),
                  u('link', { url: filePath }, [
                    u('text', { value: 'source code' })
                  ]),
                  u('html', { value: '</sup>' })
                ]);

                parent.children.splice(i! + 2, exists ? 1 : 0, newLink);
              }
            }

            break;
          }
        }
      } catch (err) {
        error(String(err));
      }
    });
  };
}
