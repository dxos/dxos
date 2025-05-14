import type { Message, MessageContentBlock } from '@dxos/artifact';
import { inspect } from 'util';

export class ConsolePrinter {
  printMessage = (message: Message) => {
    console.log(`${message.role.toUpperCase()}\n`);
    for (const content of message.content) {
      this.printContentBlock(content);
    }
  };

  printContentBlock = (content: MessageContentBlock) => {
    switch (content.type) {
      case 'text':
        console.log(content.text);
        break;
      case 'tool_use':
        console.log(`⚙️ [Tool Use] ${content.name} ${inspect(content.input, { depth: null, colors: true })}`);
        break;
      case 'tool_result': {
        let data: any;
        try {
          data = JSON.parse(content.content);
        } catch {
          data = content.content;
        }
        console.log(`⚙️ [Tool Result] ${content.toolUseId} ${inspect(data, { depth: null, colors: true })}`);
        break;
      }
    }
  };
}
