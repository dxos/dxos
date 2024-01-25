//
// Copyright 2023 DXOS.org
//

import { type Message as MessageType, Document as DocumentType, Stack as StackType } from '@braneframe/types';
import { Expando, type Space } from '@dxos/client/echo';
import { Schema, TextObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { type RequestContext } from './context';
import { type ParseResult } from './parser';

// TODO(burdon): Create variant of StringOutputParser.
//  https://js.langchain.com/docs/modules/model_io/output_parsers/json_functions
export class ResponseBuilder {
  constructor(private _space: Space, private _context: RequestContext) {}

  build(result: ParseResult): MessageType.Block[] | undefined {
    const blocks: MessageType.Block[] = [];
    const { timestamp, pre, post } = result;
    log('build', { result });

    if (pre) {
      blocks.push({ timestamp, text: pre });
    }

    const processed = this.processResult(result);
    if (processed) {
      blocks.push(...processed);
    }

    if (post) {
      blocks.push({ timestamp, text: post });
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
      const dataArray = Array.isArray(data) ? data : [data];
      return dataArray.map((data): MessageType.Block => {
        // Create object.
        if (this._context.schema) {
          const { objects: schemas } = this._space.db.query(Schema.filter());
          const schema = schemas.find((schema) => schema.typename === this._context.schema!.typename);
          if (schema) {
            data['@type'] = this._context.schema.typename;
            for (const prop of schema.props) {
              if (data[prop.id!]) {
                if (typeof data[prop.id!] === 'string') {
                  data[prop.id!] = new TextObject(data[prop.id!]);
                }
              }
            }

            const object = new Expando(data, { schema });
            return { timestamp, object };
          }
        }

        // TODO(burdon): Create ref?
        return { timestamp, data: JSON.stringify(data) };
      });
    }

    //
    // Default
    //
    return [
      {
        timestamp,
        text: content,
      },
    ];
  }
}
