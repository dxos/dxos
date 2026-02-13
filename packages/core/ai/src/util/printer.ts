//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';

import { type ContentBlock, type Message } from '@dxos/types';

import { ToolFormatter } from '../ToolFormatter';

type Mode = 'text' | 'json';

// TODO(burdon): Provide structured logger.
export type Logger = (...data: any[]) => void;

export type ConsolePrinterOptions = {
  logger?: Logger;
  mode?: Mode;
  tag?: string;
  /**
   * Blocks to print.
   * @default all
   */
  allowedBlocks?: ContentBlock.Any['_tag'][];
  /**
   * Toolkit to print.
   * @default all
   */
  toolkit?: Toolkit.Any;
};

export class ConsolePrinter {
  #toolkit?: Toolkit.Any;

  logger: Logger;
  mode: Mode;
  tag?: string;
  allowedBlocks?: ContentBlock.Any['_tag'][];

  // eslint-disable-next-line no-console
  constructor({ logger = console.log, mode = 'text', tag, allowedBlocks, toolkit }: ConsolePrinterOptions = {}) {
    this.logger = logger;
    this.mode = mode;
    this.tag = tag;
    this.allowedBlocks = allowedBlocks;
    this.#toolkit = toolkit;
  }

  private log(...data: any[]) {
    this.logger(...data);
  }

  printMessage = (message: Message.Message) => {
    const prefix = this.tag ? `[${this.tag}] ` : '';
    switch (this.mode) {
      case 'text': {
        this.log(`${prefix}${message.sender.role?.toUpperCase()}\n`);
        for (const content of message.blocks) {
          this.printContentBlock(content);
        }
        break;
      }

      case 'json': {
        this.log(`${prefix}${JSON.stringify(message, null, 2)}`);
        break;
      }
    }
  };

  printContentBlock = (content: ContentBlock.Any) => {
    if (this.allowedBlocks && !this.allowedBlocks.includes(content._tag)) {
      return;
    }
    const prefix = this.tag ? `[${this.tag}] ` : '';
    switch (this.mode) {
      case 'text': {
        switch (content._tag) {
          case 'text':
            this.log(`${prefix}${content.disposition ? `[${content.disposition}] ` : ''}${content.text}`);
            break;
          case 'reasoning':
            this.log(
              `${prefix}💭 [Reasoning] ${content.reasoningText ?? (content.redactedText ? 'REDACTED' : '')} ${
                content.signature ? ' [signed]' : ''
              }`,
            );
            break;
          case 'toolCall': {
            const formatter = this.#getToolFormmatter(content.name);
            const tool = this.#getTool(content.name);

            let payload;
            if (tool && formatter && formatter.debugFormatCall) {
              try {
                const input = Schema.decodeUnknownSync(tool.parametersSchema as any)(JSON.parse(content.input));
                payload = formatter.debugFormatCall(input as never);
                if (typeof payload !== 'string') {
                  payload = inspect(payload, { depth: null, colors: true });
                }
              } catch {}
            }
            if (!payload) {
              payload = inspect(content.input, { depth: null, colors: true });
            }
            this.log(`${prefix}⚙️ [Tool Use] ${content.name} ${payload}`);
            break;
          }
          case 'toolResult': {
            if (content.error) {
              this.log(`${prefix}⚠️ [Tool Error] ${content.name} ${content.error}`);
            } else {
              const formatter = this.#getToolFormmatter(content.name);
              const tool = this.#getTool(content.name);

              let payload;
              if (tool && formatter && formatter.debugFormatResult) {
                try {
                  const result = Schema.decodeUnknownSync(tool.successSchema as any)(
                    JSON.parse(content.result ?? '{}'),
                  );
                  payload = formatter.debugFormatResult(result as never);
                  if (typeof payload !== 'string') {
                    payload = inspect(payload, { depth: null, colors: true });
                  }
                } catch {}
              }
              if (!payload) {
                payload = inspect(content.result, { depth: null, colors: true });
              }
              this.log(`${prefix}⚙️ [Tool Result] ${content.name} ${payload}`);
            }
            break;
          }
          case 'reference':
            this.log(`${prefix}🔗 [Reference] ${content.reference.dxn.toString()}`);
            break;
          default: {
            this.log(`${prefix}[${content._tag}] ${inspect(content, { depth: null, colors: true })}`);
            break;
          }
        }
        break;
      }

      case 'json': {
        this.log(`${prefix}${JSON.stringify(content, null, 2)}`);
        break;
      }
    }
  };

  #getToolFormmatter = (name: string) => {
    const tool = this.#toolkit?.tools[name];
    if (!tool) {
      return undefined;
    }
    return Context.get(tool.annotations as Context.Context<any>, ToolFormatter);
  };

  #getTool = (name: string): Tool.Any | undefined => {
    const tool = this.#toolkit?.tools[name];
    if (!tool) {
      return undefined;
    }
    return tool;
  };
}
