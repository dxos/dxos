//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  MarkdownStream,
  type MarkdownStreamController,
  type MarkdownStreamProps,
  type ScrollController,
} from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { keyToFallback } from '@dxos/util';

import { type ChatMessageProps } from './ChatMessage';
import { reduceMessages } from './reducers';
import { blockToMarkdown, componentRegistry } from './registry';

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: DataType.Message[];
    error?: Error;
  } & Pick<ChatMessageProps, 'debug' | 'toolProvider' | 'onEvent'> &
    Pick<MarkdownStreamProps, 'characterDelay' | 'cursor' | 'fadeIn'>
>;

// TOOD(burdon): Export scroll controller.
export const ChatThread = forwardRef<ScrollController, ChatThreadProps>(
  (
    { classNames, identity, messages = [], error, debug, onEvent, characterDelay = 5, cursor = true, fadeIn = true },
    forwardedRef,
  ) => {
    const userHue = useMemo(() => {
      return identity?.profile?.data?.hue || keyToFallback(identity?.identityKey ?? PublicKey.random()).hue;
    }, [identity]);

    // Show error.
    useEffect(() => {
      onEvent?.({ type: 'scroll-to-bottom' });
    }, [error]);

    // Reduce messages to collapse related blocks.
    const [controller, setController] = useState<MarkdownStreamController | null>(null);

    // Update content.
    const lastRef = useRef<string | null>(null); // TODO(burdon): Remove.
    const content = useMarkdownText(messages, debug);
    useEffect(() => {
      if (!controller) {
        return;
      }

      const append = lastRef.current && content.startsWith(lastRef.current);
      if (!append) {
        void controller.update(content);
      } else {
        void controller.append(content.slice(lastRef.current?.length ?? 0));
      }
      lastRef.current = content;
    }, [controller, content]);

    return (
      <div
        className={mx('flex bs-full justify-center overflow-hidden', classNames)}
        style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
      >
        <MarkdownStream
          ref={setController}
          classNames='bs-full max-is-prose overflow-hidden'
          content={content}
          registry={componentRegistry}
          characterDelay={characterDelay}
          cursor={cursor}
          fadeIn={fadeIn}
        />
      </div>
    );
  },
);

export const useMarkdownText = (messages: DataType.Message[], debug = false) => {
  const reducedMessages = useMemo(() => {
    if (debug) {
      return messages;
    } else {
      return messages.reduce(reduceMessages, { messages: [] }).messages;
    }
  }, [messages, debug]);

  return useMemo(() => {
    return reducedMessages.reduce((acc, message) => {
      for (const block of message.blocks) {
        const str = blockToMarkdown(message, block);
        if (str && str !== '\n') {
          acc += str;
          if (!block.pending) {
            acc += '\n';
          }
        }
      }

      return acc;
    }, '');
  }, [reducedMessages]);
};

// const getTimeDelta = (idx: number) => {
//   invariant(idx > 0);
//   const prev = new Date(reducedMessages[idx - 1].created).getTime();
//   const current = new Date(reducedMessages[idx].created).getTime();
//   return current - prev;
// };
