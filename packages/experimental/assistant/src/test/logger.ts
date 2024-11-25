import type { ConversationEvent } from '../conversation/conversation';

export const createLogger =
  ({ stream, filter }: { stream?: boolean; filter?: (event: ConversationEvent) => boolean } = {}) =>
  (event: ConversationEvent) => {
    if (typeof filter === 'function' && !filter(event)) {
      return;
    }

    if (stream) {
      switch (event.type) {
        case 'message_start': {
          process.stdout.write(`${event.message.role.toUpperCase()}\n\n`);
          break;
        }
        case 'content_block_start': {
          switch (event.content.type) {
            case 'text':
              process.stdout.write(event.content.text);
              break;
            case 'tool_use':
              process.stdout.write(`⚙️ [Tool Use] ${event.content.name}\n`);
              break;
          }
          break;
        }
        case 'content_block_delta': {
          switch (event.delta.type) {
            case 'text_delta': {
              process.stdout.write(event.delta.text);
              break;
            }
            case 'input_json_delta': {
              process.stdout.write(event.delta.partial_json);
              break;
            }
          }
          break;
        }
        case 'content_block_stop': {
          process.stdout.write('\n');
          break;
        }
        case 'message_delta': {
          break;
        }
        case 'message_stop': {
          process.stdout.write('\n\n');
          break;
        }
      }
    }

    switch (event.type) {
      case 'message': {
        if (!stream || event.message.role !== 'assistant') {
          process.stdout.write(`${event.message.role.toUpperCase()}\n\n`);
          for (const block of event.message.content) {
            switch (block.type) {
              case 'text':
                process.stdout.write(block.text + '\n');
                break;
              case 'tool_use':
                process.stdout.write(`⚙️ [Tool Use] ${block.name}\n`);
                process.stdout.write(`  ${JSON.stringify(block.input)}\n`);
                break;
              case 'tool_result':
                if (block.is_error) {
                  process.stdout.write('❌ [Tool Error]\n');
                  process.stdout.write(block.content + '\n');
                } else {
                  process.stdout.write('✅ [Tool Success]\n');
                  process.stdout.write(block.content + '\n');
                }
            }
            process.stdout.write('\n\n');
          }
        }
        break;
      }
    }
  };
