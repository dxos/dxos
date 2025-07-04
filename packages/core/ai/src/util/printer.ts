//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import type { Message, MessageContentBlock } from '../tools';

type Mode = 'text' | 'json';

// TODO(burdon): Provide structured logger.
export type Logger = (...data: any[]) => void;

export type ConsolePrinterOptions = {
  logger?: Logger;
  mode?: Mode;
};

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

  printMessage = (message: Message) => {
    switch (this.mode) {
      case 'text': {
        this.log(`${message.role.toUpperCase()}\n`);
        for (const content of message.content) {
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

  printContentBlock = (content: MessageContentBlock) => {
    switch (this.mode) {
      case 'text': {
        switch (content.type) {
          case 'text':
            this.log(`${content.disposition ? `[${content.disposition}] ` : ''}${content.text}`);
            break;
          case 'tool_use':
            this.log(`⚙️ [Tool Use] ${content.name} ${inspect(content.input, { depth: null, colors: true })}`);
            break;
          case 'tool_result': {
            let data: any;
            try {
              data = JSON.parse(content.content);
            } catch {
              data = content.content;
            }
            this.log(`⚙️ [Tool Result] ${content.toolUseId} ${inspect(data, { depth: null, colors: true })}`);
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
