//
// Copyright 2023 DXOS.org
//

import { CollectionType, DocumentType, TextType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { AST, create, type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { type RequestContext } from './context';
import { type ParseResult } from './parser';

type BlockType = {
  timestamp: string;
  content?: string;
  object?: EchoReactiveObject<any>;
};

// TODO(burdon): Create variant of StringOutputParser.
//  https://js.langchain.com/docs/modules/model_io/output_parsers/json_functions
export class ResponseBuilder {
  constructor(
    private _space: Space,
    private _context: RequestContext,
  ) {}

  build(result: ParseResult): BlockType[] | undefined {
    const blocks: BlockType[] = [];
    const { timestamp, pre, post } = result;
    log('build', { result });

    if (pre) {
      blocks.push({ timestamp, content: pre });
    }

    const processed = this.processResult(result);
    if (processed) {
      blocks.push(...processed);
    }

    if (post) {
      blocks.push({ timestamp, content: post });
    }

    return blocks;
  }

  processResult(result: ParseResult): BlockType[] | undefined {
    const timestamp = new Date().toISOString();
    const { data, content, type, kind } = result;

    //
    // Add to collection.
    //
    // TODO(burdon): Skip.
    const stack = false;
    if (stack && this._context.object instanceof CollectionType) {
      // TODO(burdon): Insert based on prompt config.
      log.info('adding to collection', { collection: this._context.object.id });

      const formatFenced = (type: string, content: string) => {
        const tick = '```';
        return `${tick}${type}\n${content}\n${tick}\n`;
      };

      const formattedContent =
        type !== 'markdown' && kind === 'fenced'
          ? '# Generated content\n\n' + formatFenced(type, content.trim())
          : content;

      this._context.object.objects.push(
        create(DocumentType, {
          content: create(TextType, { content: formattedContent }),
          threads: [],
        }),
      );

      return undefined;
    }

    //
    // Convert JSON data to objects.
    //
    if (result.type === 'json') {
      const blocks: BlockType[] = [];
      Object.entries(data).forEach(([type, array]) => {
        const schema = this._context.schema?.get(type);
        if (schema) {
          for (const obj of array as any[]) {
            const data: Record<string, any> = {};
            for (const { name, type } of schema.getProperties()) {
              const value = obj[name];
              if (value !== undefined && value !== null && AST.isStringKeyword(type)) {
                data[name.toString()] = create(TextType, { content: value });
              }
            }

            const object = create(schema.schema, data);
            blocks.push({ timestamp, object });
          }
        }
      });

      if (blocks.length) {
        return blocks;
      }
    }

    //
    // Default
    //
    return [
      {
        timestamp,
        content,
      },
    ];
  }
}
