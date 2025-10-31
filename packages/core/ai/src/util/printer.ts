//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import type { ContentBlock, DataType } from '@dxos/schema';

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
};

export class ConsolePrinter {
  logger: Logger;
  mode: Mode;
  tag?: string;
  allowedBlocks?: ContentBlock.Any['_tag'][];

  // eslint-disable-next-line no-console
  constructor({ logger = console.log, mode = 'text', tag, allowedBlocks }: ConsolePrinterOptions = {}) {
    this.logger = logger;
    this.mode = mode;
    this.tag = tag;
    this.allowedBlocks = allowedBlocks;
  }

  private log(...data: any[]) {
    this.logger(...data);
  }

  printMessage = (message: DataType.Message) => {
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
          case 'toolCall':
            this.log(`${prefix}⚙️ [Tool Use] ${content.name} ${inspect(content.input, { depth: null, colors: true })}`);
            break;
          case 'toolResult': {
            if (content.error) {
              this.log(`${prefix}⚠️ [Tool Error] ${content.name} ${content.error}`);
            } else {
              this.log(
                `${prefix}⚙️ [Tool Result] ${content.name} ${inspect(content.result, { depth: null, colors: true })}`,
              );
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
}
