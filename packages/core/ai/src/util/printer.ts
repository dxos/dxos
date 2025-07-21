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
};

/**
 * @deprecated
 */
export class ConsolePrinter {
  logger: Logger;
  mode: Mode;

  // eslint-disable-next-line no-console
  constructor({ logger = console.log, mode = 'text' }: ConsolePrinterOptions = {}) {
    this.logger = logger;
    this.mode = mode;
  }

  private log(...data: any[]) {
    this.logger(...data);
  }

  printMessage = (message: DataType.Message) => {
    switch (this.mode) {
      case 'text': {
        this.log(`${message.sender.role.toUpperCase()}\n`);
        for (const content of message.blocks) {
          this.printContentBlock(content);
        }
        break;
      }

      case 'json': {
        this.log(JSON.stringify(message, null, 2));
        break;
      }
    }
  };

  printContentBlock = (content: ContentBlock.Any) => {
    switch (this.mode) {
      case 'text': {
        switch (content._tag) {
          case 'text':
            this.log(`${content.disposition ? `[${content.disposition}] ` : ''}${content.text}`);
            break;
          case 'toolCall':
            this.log(`⚙️ [Tool Use] ${content.name} ${inspect(content.input, { depth: null, colors: true })}`);
            break;
          case 'toolResult': {
            let data: any;
            try {
              data = JSON.parse(content.result);
            } catch {
              data = content.result;
            }
            this.log(`⚙️ [Tool Result] ${content.toolCallId} ${inspect(data, { depth: null, colors: true })}`);
            break;
          }
        }
        break;
      }

      case 'json': {
        this.log(JSON.stringify(content, null, 2));
        break;
      }
    }
  };
}

// TODO(dmaretskyi): Remove old one and rename this to ConsolePrinter.
export class NewConsolePrinter {
  logger: Logger;
  mode: Mode;

  // eslint-disable-next-line no-console
  constructor({ logger = console.log, mode = 'text' }: ConsolePrinterOptions = {}) {
    this.logger = logger;
    this.mode = mode;
  }

  private log(...data: any[]) {
    this.logger(...data);
  }

  printMessage = (message: DataType.Message) => {
    switch (this.mode) {
      case 'text': {
        this.log(`${message.sender.role?.toUpperCase()}\n`);
        for (const content of message.blocks) {
          this.printContentBlock(content);
        }
        break;
      }

      case 'json': {
        this.log(JSON.stringify(message, null, 2));
        break;
      }
    }
  };

  printContentBlock = (content: ContentBlock.Any) => {
    switch (this.mode) {
      case 'text': {
        switch (content._tag) {
          case 'text':
            this.log(`${content.disposition ? `[${content.disposition}] ` : ''}${content.text}`);
            break;
          case 'reasoning':
            this.log(
              `💭 [Reasoning] ${content.reasoningText ?? (content.redactedText ? 'REDACTED' : '')} ${
                content.signature ? ' [signed]' : ''
              }`,
            );
            break;
          case 'toolCall':
            this.log(`⚙️ [Tool Use] ${content.name} ${inspect(content.input, { depth: null, colors: true })}`);
            break;
          case 'toolResult': {
            this.log(`⚙️ [Tool Result] ${content.name} ${inspect(content.result, { depth: null, colors: true })}`);
            break;
          }
          default: {
            this.log(`[${content._tag}] ${inspect(content, { depth: null, colors: true })}`);
            break;
          }
        }
        break;
      }

      case 'json': {
        this.log(JSON.stringify(content, null, 2));
        break;
      }
    }
  };
}
