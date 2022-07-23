//
// Copyright 2022 DXOS.org
//

import { TSDocParser } from '@microsoft/tsdoc';
import debug from 'debug';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as protobuf from 'protocol-buffers-schema';
import { visit } from 'unist-util-visit';

const log = debug('dxos:ridoculous:error');

/**
 * Util to remove trailing blank lines.
 */
// TODO(burdon): Factor out.
const removeTrailing = (content: string) => {
  const lines = content.split('\n');
  let n;
  for (n = lines.length - 1; n > 0; n--) {
    if (lines[n].trim() !== '') {
      break;
    }
  }
  if (n < lines.length - 1) {
    lines.splice(n + 1);
    content = lines.join('\n');
  }

  return content;
};

/**
 * Util to create regexp from set of parts to aid comprehension.
 */
// TODO(burdon): Factor out.
const regex = (parts: RegExp[]) => {
  const [first, ...rest] = parts;
  return new RegExp(rest.reduce((res, p) => res + p.source, first.source));
};

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

export interface Options {
  baseDir?: string
}

/**
 * Import snippets.
 * See https://www.gatsbyjs.com/plugins/gatsby-remark-embed-snippet/?=snippet
 * Snippets are contains within comment blocks.
 * The resulting code snippet is inserted above or replaces an existing block.
 */
// TODO(burdon): Create test.
export const remarkSnippets = ({ baseDir = process.cwd() }: Options = {}) => (tree: any) => {
  visit(tree, 'html', (node, i, parent) => {
    // Match: <!-- @code ./foo/bar.ts#hash -->
    const reg = regex([
      /<!--\s*/, // Opening comment.
      /@(.+)\s/, // Group: directive (e.g., `code`).
      /([^#\s]+)/, // Group: file
      /(?:#(.+))?/, // Group hash (optional; note outer # is in non-capturing group).
      /\s*-->/ // Closing comment.
    ]);

    const match = node.value.trim().match(reg);
    if (match) {
      const [, directive, file, hash] = match;
      log('snippet:', [directive, file, hash]);
      try {
        const next = parent.children[i! + 1];
        switch (directive) {
          case 'code': {
            const content = fs.readFileSync(path.join(baseDir, file), 'utf8');
            const { ext } = path.parse(file);
            const { lang, parser } = langType[ext];
            if (lang) {
              // TODO(burdon): Update previous node.
              node.append();
              // console.log(node);
              // node.lang = lang;
              // node.value = removeTrailing(parser?.(content, { hash }) ?? content);
            }

            break;
          }

          default: {
            throw new Error(`Invalid directive: ${directive}`);
          }
        }
      } catch (err) {
        log(String(err));
      }
    }
  });
};
