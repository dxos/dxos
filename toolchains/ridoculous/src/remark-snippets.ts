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
 */
// TODO(burdon): Create test.
export const remarkSnippets = ({ baseDir = process.cwd() }: Options = {}) => (tree: any) => {
  visit(tree, 'code', (node) => {
    const match = node.value.trim().match(/@import (.+)/);
    if (match) {
      const [file, hash] = match[1].split('#');
      try {
        const content = fs.readFileSync(path.join(baseDir, file), 'utf8');

        // Type.
        const { ext } = path.parse(file);
        const { lang, parser } = langType[ext];
        if (lang) {
          node.lang = lang;
          node.value = parser?.(content, { hash }) ?? content;
        }
      } catch (err) {
        log(String(err));
      }
    }
  });
};
