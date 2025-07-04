//
// Copyright 2025 DXOS.org
//

import { type Message } from '@dxos/ai';

// TODO(burdon): Move to util?
type Reducer<R, I> = (acc: R, value: I) => R;

/**
 * Reducer that collapses related message blocks into single messages.
 * For example, combines tool request/response pairs into a single message.
 */
export const messageReducer: Reducer<{ messages: Message[]; current?: Message }, Message> = (
  { current, messages },
  message,
) => {
  let i = 0;
  for (const block of message.content) {
    switch (block.type) {
      case 'tool_use':
      case 'tool_result': {
        if (current) {
          current.content.push(block);
        } else {
          current = {
            id: [message.id, i].join('_'),
            role: message.role,
            content: [block],
          } as any;
          messages.push(current as any);
        }
        break;
      }

      case 'text':
      default: {
        current = undefined;
        messages.push({
          id: [message.id, i].join('_'),
          role: message.role,
          content: [block],
        } as any);
        break;
      }
    }

    i++;
  }

  return { current, messages };
};
