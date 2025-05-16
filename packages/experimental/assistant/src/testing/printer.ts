//
// Copyright 2025 DXOS.org
//

import type { Message, MessageContentBlock } from '@dxos/artifact';
import { inspect } from '@dxos/node-std/util';

export class ConsolePrinter {
  printMessage = (message: Message) => {
    // eslint-disable-next-line no-console
    console.log(`${message.role.toUpperCase()}\n`);
    for (const content of message.content) {
      this.printContentBlock(content);
    }
  };

  printContentBlock = (content: MessageContentBlock) => {
    switch (content.type) {
      case 'text':
        // eslint-disable-next-line no-console
        console.log(content.text);
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
  };
}
