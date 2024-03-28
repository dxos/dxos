//
// Copyright 2023 DXOS.org
//

import { type Message as MessageType, Document as DocumentType, Stack as StackType } from '@braneframe/types/proto';
import { type Space } from '@dxos/client/echo';
import { Expando, Schema, TextObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
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

  build(result: ParseResult): MessageType.Block[] | undefined {
    const blocks: MessageType.Block[] = [];
    const { timestamp, pre, post } = result;
    log('build', { result });

    if (pre) {
      blocks.push({ timestamp, content: new TextObject(pre) });
    }

    const processed = this.processResult(result);
    if (processed) {
      blocks.push(...processed);
    }

    if (post) {
      blocks.push({ timestamp, content: new TextObject(post) });
    }

    return blocks;
  }

  processResult(result: ParseResult): MessageType.Block[] | undefined {
    const timestamp = new Date().toISOString();
    const { data, content, type, kind } = result;

    //
    // Add to stack.
    //
    if (this._context.object?.__typename === StackType.schema.typename) {
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
        new StackType.Section({
          object: new DocumentType({ content: new TextObject(formattedContent) }),
        }),
      );

      return undefined;
    }

    //
    // Convert JSON data to objects.
    //
    if (result.type === 'json') {
      const blocks: MessageType.Block[] = [];
      Object.entries(data).forEach(([type, array]) => {
        const schema = this._context.schema?.get(type);
        if (schema) {
          for (const obj of array as any[]) {
            const data: Record<string, any> = {
              '@type': schema.typename,
            };

            for (const { id, type } of schema.props) {
              invariant(id);
              const value = obj[id];
              if (value !== undefined && value !== null) {
                switch (type) {
                  // TODO(burdon): Currently only handles string properties.
                  case Schema.PropType.STRING: {
                    data[id] = new TextObject(value);
                    break;
                  }
                }
              }
            }

            const object = new Expando(data, { schema });
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
        content: new TextObject(content),
      },
    ];
  }
}
