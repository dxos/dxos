//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, Fragment, forwardRef, useEffect, useMemo } from 'react';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { MarkdownStream, ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { keyToFallback } from '@dxos/util';

import { ChatError, ChatMessage, type ChatMessageProps, styles } from './ChatMessage';
import { reduceMessages } from './reducers';

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: DataType.Message[];
    error?: Error;
  } & Pick<ChatMessageProps, 'debug' | 'space' | 'toolProvider' | 'onEvent'>
>;

export const ChatThread = forwardRef<ScrollController, ChatThreadProps>(
  ({ classNames, identity, messages = [], error, debug, onEvent, ...props }, forwardedRef) => {
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

    const getDelta = (idx: number) => {
      invariant(idx > 0);
      const prev = new Date(reducedMessages[idx - 1].created).getTime();
      const current = new Date(reducedMessages[idx].created).getTime();
      return current - prev;
    };

    const content = useMemo(() => {
      return reducedMessages.reduce((acc, message) => {
        for (const block of message.blocks) {
          switch (block._tag) {
            case 'text': {
              acc += block.text;
              break;
            }
          }
        }

        return acc;
      }, '');
    }, [reducedMessages]);

    return <MarkdownStream content={content} />;

    return (
      <ScrollContainer.Root pin fade ref={forwardedRef} classNames={classNames}>
        <ScrollContainer.Content
          classNames='relative flex flex-col gap-2 pbs-2 pbe-2'
          style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
        >
          {reducedMessages.map((message, idx) => (
            <Fragment key={message.id}>
              {debug && (
                <div className={mx('flex justify-end text-subdued', styles.margin)}>
                  <pre className='text-xs'>
                    {JSON.stringify({ created: message.created, delta: idx > 0 ? getDelta(idx) : undefined })}
                  </pre>
                </div>
              )}
              <ChatMessage message={message} debug={debug} onEvent={onEvent} {...props} />
            </Fragment>
          ))}

          {error && <ChatError error={error} onEvent={onEvent} />}
        </ScrollContainer.Content>
        <ScrollContainer.ScrollDownButton />
      </ScrollContainer.Root>
    );
  },
);
