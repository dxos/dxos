//
// Copyright 2024 DXOS.org
//

import { type ContentBlock } from '@dxos/schema';

import type { ConversationEvent } from '../conversation';
import type { ImageSource } from '../tools';

export const createLogger = ({
  stream,
  filter,
  onImage,
}: {
  stream?: boolean;
  filter?: (event: ConversationEvent) => boolean;
  onImage?: (img: { id: string; description?: string; source: ImageSource }) => void;
} = {}) => {
  const images: Record<string, any> = {};
  let currentText = '';

  return (event: ConversationEvent) => {
    if (typeof filter === 'function' && !filter(event)) {
      return;
    }

    const printContentBlock = (content: ContentBlock.Any) => {
      switch (content._tag) {
        case 'text':
          process.stdout.write(content.text);
          break;
        case 'toolCall':
          process.stdout.write(`⚙️ [Tool Use] ${content.name}\n`);
          break;
        case 'image': {
          if (content.id && content.source) {
            images[content.id] = content.source;
          }
          process.stdout.write(`[Image id=${content.id}]`);
          break;
        }
      }
    };

    const onTextBlockPrinted = (text: string) => {
      const imageMatch = text.match(/<image id="([^"]+)"(?:\s+prompt="([^"]+)")?\s*\/>/);
      if (imageMatch && onImage && images[imageMatch[1]]) {
        onImage({
          id: imageMatch[1],
          description: imageMatch[2], // Extract prompt as description if present
          source: images[imageMatch[1]],
        });
      }
    };

    if (stream) {
      switch (event.type) {
        case 'message_start': {
          process.stdout.write(`${event.message.sender?.role?.toUpperCase()}\n\n`);
          for (const content of event.message.blocks) {
            printContentBlock(content);
          }
          break;
        }
        case 'content_block_start': {
          currentText = '';
          printContentBlock(event.content);
          break;
        }
        case 'content_block_delta': {
          switch (event.delta.type) {
            case 'text_delta': {
              currentText += event.delta.text;
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
          onTextBlockPrinted(currentText);
          currentText = '';
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
        if (!stream || event.message.sender?.role !== 'assistant') {
          process.stdout.write(`${event.message.sender?.role?.toUpperCase()}\n\n`);
          for (const block of event.message.blocks) {
            switch (block._tag) {
              case 'text':
                process.stdout.write(block.text + '\n');
                onTextBlockPrinted(block.text);
                break;
              case 'toolCall':
                process.stdout.write(`⚙️ [Tool Use] ${block.name}\n`);
                process.stdout.write(`  ${JSON.stringify(block.input)}\n`);
                break;
              case 'toolResult':
                if (block.result) {
                  process.stdout.write('✅ [Tool Success]\n');
                  process.stdout.write(block.result + '\n');
                } else {
                  process.stdout.write('❌ [Tool Error]\n');
                  process.stdout.write(block.result + '\n');
                }
            }
            process.stdout.write('\n\n');
          }
        }
        break;
      }
    }
  };
};
