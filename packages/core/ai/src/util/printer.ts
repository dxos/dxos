//
// Copyright 2025 DXOS.org
//

import { inspect } from 'node:util';

import type { Message, MessageContentBlock } from '../tools';

type Mode = 'text' | 'json';

export class ConsolePrinter {
  mode: Mode;
  constructor({ mode = 'text' }: { mode?: Mode } = {}) {
    this.mode = mode;
  }

  printMessage = (message: Message) => {
    switch (this.mode) {
      case 'text': {
        // eslint-disable-next-line no-console
        console.log(`${message.role.toUpperCase()}\n`);
        for (const content of message.content) {
          this.printContentBlock(content);
        }
        break;
      }
      case 'json': {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(message, null, 2));
        break;
      }
    }
  };

  printContentBlock = (content: MessageContentBlock) => {
    switch (this.mode) {
      case 'text': {
        switch (content.type) {
          case 'text':
            // eslint-disable-next-line no-console
            console.log(`${content.disposition ? `[${content.disposition}] ` : ''}${content.text}`);
            break;
          case 'tool_use':
            // eslint-disable-next-line no-console
            console.log(`⚙️ [Tool Use] ${content.name} ${inspect(content.input, { depth: null, colors: true })}`);
            break;
          case 'tool_result': {
            let data: any;
            try {
              data = JSON.parse(content.content);
            } catch {
              data = content.content;
            }
            // eslint-disable-next-line no-console
            console.log(`⚙️ [Tool Result] ${content.toolUseId} ${inspect(data, { depth: null, colors: true })}`);
            break;
          }
        }
        break;
      }
      case 'json': {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(content, null, 2));
        break;
      }
    }
  };
}
