//
// Copyright 2025 DXOS.org
//

import { type ContentBlock, type Message } from '@dxos/types';

type Reducer<R, I> = (acc: R, value: I, idx: number) => R;

/**
 * Reducer that collapses related message blocks into single messages.
 * For example, combines tool request/response pairs into a single message.
 *
 * Typical order:
 * - message 0
 *  - text
 * - message 1
 *  - text
 *  - toolCall
 *  - summary
 * - message 2
 *  - toolResult
 * - message 3
 *  - text
 *  - summary
 *
 * Coverts to:
 * - message 0
 *  - text
 * - message 1
 *  - text
 * - message 2
 *  - toolCall
 *  - toolResult
 *  - summary
 * - message 3
 *  - text
 *  - summary
 */
export const reduceMessages: Reducer<
  {
    messages: Message.Message[];
    current?: Message.Message;
    toolBlock?: boolean;
    assistantMessages?: Message.Message[];
  },
  Message.Message
> = ({ messages, current, toolBlock, assistantMessages = [] }, message) => {
  // Treat tool calls as assistant messages.
  let assistant = message?.sender.role === 'assistant';
  let i = 0;
  for (const block of message.blocks) {
    switch (block._tag) {
      // TODO(burdon): Preserve call tool title.
      case 'toolCall': {
        assistant = true;
        if (!toolBlock) {
          current = {
            ...message,
            id: [message.id, i++].join('_'),
            blocks: [block],
          };
          messages.push(current);
          toolBlock = true;
        } else {
          current!.blocks.push(block);
        }
        break;
      }

      case 'toolResult': {
        assistant = true;
        if (toolBlock) {
          current!.blocks.push(block);
        }
        break;
      }

      case 'summary': {
        assistant = true;
        if (toolBlock) {
          current!.blocks.push(block);
        } else {
          const summary = reduceSummary([...assistantMessages, message]);
          current!.blocks.push(summary);
        }
        break;
      }

      default: {
        assistant = message.sender.role === 'assistant';
        current = {
          ...message,
          id: [message.id, i++].join('_'),
          blocks: [block],
        };
        messages.push(current);
        toolBlock = false;
        break;
      }
    }
  }

  return {
    messages,
    current,
    toolBlock,
    assistantMessages: assistant ? [...assistantMessages, message] : undefined,
  };
};

/**
 * Accumulate token counts from all summary blocks in pending messages.
 */
const reduceSummary = (messages: Message.Message[]): ContentBlock.Summary => {
  let start: number | undefined;
  return messages.reduce<ContentBlock.Summary>(
    (acc, msg) => {
      const time = new Date(msg.created).getTime();
      if (!start) {
        start = time;
      }
      msg.blocks.forEach((block) => {
        switch (block._tag) {
          case 'toolCall': {
            acc.toolCalls = (acc.toolCalls ?? 0) + 1;
            break;
          }
          case 'summary': {
            acc.model = block.model;
            if (block.usage) {
              acc.message = block.message;
              acc.usage = {
                inputTokens: (acc.usage?.inputTokens ?? 0) + (block.usage.inputTokens ?? 0),
                outputTokens: (acc.usage?.outputTokens ?? 0) + (block.usage.outputTokens ?? 0),
                totalTokens: (acc.usage?.totalTokens ?? 0) + (block.usage.totalTokens ?? 0),
              };
              acc.duration = time - (start ?? time);
            }
            break;
          }
        }
      });

      return acc;
    },
    {
      _tag: 'summary',
      duration: 0,
    } satisfies ContentBlock.Summary,
  );
};
