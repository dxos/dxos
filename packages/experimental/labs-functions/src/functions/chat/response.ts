//
// Copyright 2023 DXOS.org
//

import { DocumentType, StackType, type BlockType, TextV0Type, SectionType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { AST } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { type RequestContext } from './context';
import { type ParseResult } from './parser';

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
      blocks.push({ timestamp, content: E.object(TextV0Type, { content: pre }) });
    }

    const processed = this.processResult(result);
    if (processed) {
      blocks.push(...processed);
    }

    if (post) {
      blocks.push({ timestamp, content: E.object(TextV0Type, { content: post }) });
    }

    return blocks;
  }

  processResult(result: ParseResult): BlockType[] | undefined {
    const timestamp = new Date().toISOString();
    const { data, content, type, kind } = result;

    //
    // Add to stack.
    //
    if (this._context.object?.__typename === StackType.typename) {
      // TODO(burdon): Insert based on prompt config.
      log.info('adding section to stack', { stack: this._context.object.id });

      const formatFenced = (type: string, content: string) => {
        const tick = '```';
        return `${tick}${type}\n${content}\n${tick}\n`;
      };

      const formattedContent =
        type !== 'markdown' && kind === 'fenced'
          ? '# Generated content\n\n' + formatFenced(type, content.trim())
          : content;

      this._context.object.sections.push(
        E.object(SectionType, {
          object: E.object(DocumentType, {
            content: E.object(TextV0Type, { content: formattedContent }),
          }),
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
                data[name.toString()] = E.object(TextV0Type, { content: value });
              }
            }

            const object = E.object(schema.schema, data);
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
        content: E.object(TextV0Type, { content }),
      },
    ];
  }
}
