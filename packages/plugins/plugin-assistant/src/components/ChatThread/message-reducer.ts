//
// Copyright 2025 DXOS.org
//

import { type DataType } from '@dxos/schema';

// TODO(burdon): Move to util?
type Reducer<R, I> = (acc: R, value: I) => R;

/**
 * Reducer that collapses related message blocks into single messages.
 * For example, combines tool request/response pairs into a single message.
 */
export const messageReducer: Reducer<{ messages: DataType.Message[]; current?: DataType.Message }, DataType.Message> = (
  { messages, current },
  message,
) => {
  let i = 0;
  // TODO(dmaretskyi): This needs to be a separate type: `id` is not a valid ObjectId, this needs to accommodate messageId for deletion.
  for (const block of message.blocks) {
    switch (block._tag) {
      // Tools.
      case 'toolCall':
      case 'toolResult': {
        if (!current) {
          current = {
            ...message,
            id: [message.id, i].join('_'),
            blocks: [block],
          };
          messages.push(current);
        } else {
          current.blocks.push(block);
        }
        break;
      }

      case 'summary': {
        const idx = current?.blocks.findIndex((b) => b._tag === 'summary') ?? -1;
        if (idx !== -1) {
          current?.blocks.splice(idx, 1, block);
        } else {
          current?.blocks.push(block);
        }
        break;
      }

      default: {
        current = undefined;
        messages.push({
          ...message,
          id: [message.id, i].join('_'),
          blocks: [block],
        });
        break;
      }
    }

    i++;
  }

  return { messages, current };
};
