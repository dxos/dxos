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
  { current, messages },
  message,
) => {
  let i = 0;
  for (const block of message.blocks) {
    switch (block._tag) {
      case 'toolCall':
      case 'toolResult': {
        if (current) {
          current.blocks.push(block);
        } else {
          current = {
            ...message,
            id: [message.id, i].join('_'),
            blocks: [block],
          };
          messages.push(current);
        }
        break;
      }

      case 'text':
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

  return { current, messages };
};
