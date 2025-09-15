//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useEffect, useMemo, useRef } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { MarkdownStream, type MarkdownStreamController, type ScrollController } from '@dxos/react-ui-components';
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
  } & Pick<ChatMessageProps, 'debug' | 'space' | 'toolProvider' | 'onEvent'>
>;

// TOOD(burdon): Export scroll controller.
export const ChatThread = forwardRef<ScrollController, ChatThreadProps>(
  ({ classNames, identity, messages = [], error, debug, onEvent }, forwardedRef) => {
    const userHue = useMemo(() => {
      return identity?.profile?.data?.hue || keyToFallback(identity?.identityKey ?? PublicKey.random()).hue;
    }, [identity]);

    // Show error.
    useEffect(() => {
      onEvent?.({ type: 'scroll-to-bottom' });
    }, [error]);

    // Reduce messages to collapse related blocks.
    const reducedMessages = useMemo(() => {
      if (debug) {
        return messages;
      } else {
        return messages.reduce(reduceMessages, { messages: [] }).messages;
      }
    }, [messages, debug]);

    // const getTimeDelta = (idx: number) => {
    //   invariant(idx > 0);
    //   const prev = new Date(reducedMessages[idx - 1].created).getTime();
    //   const current = new Date(reducedMessages[idx].created).getTime();
    //   return current - prev;
    // };

    // TODO(burdon): Generalize reducer.
    const content = useMemo(() => {
      return reducedMessages.reduce((acc, message) => {
        for (const block of message.blocks) {
          const str = blockToMarkdown(message, block);
          if (str && str !== '\n') {
            console.log(str, JSON.stringify(block));
            acc += str;
            if (!block.pending) {
              // acc += '\n';
            }
          }
        }

        return acc;
      }, '');
    }, [reducedMessages]);
    const lastRef = useRef<string | null>(null);
    const controller = useRef<MarkdownStreamController>(null);
    useEffect(() => {
      const append = lastRef.current && content.startsWith(lastRef.current);
      if (!append) {
        controller.current?.update(content);
      } else {
        controller.current?.append(content.slice(lastRef.current?.length ?? 0));
      }
      lastRef.current = content;
    }, [controller, content]);

    return (
      <div
        className={mx('bs-full is-full overflow-hidden', classNames)}
        style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
      >
        <MarkdownStream ref={controller} content={content} registry={componentRegistry} characterDelay={5} fadeIn />
      </div>
    );
  },
);
