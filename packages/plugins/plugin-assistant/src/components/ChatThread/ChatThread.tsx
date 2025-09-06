//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useEffect, useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { type DataType } from '@dxos/schema';
import { keyToFallback } from '@dxos/util';

import { ChatError, ChatMessage, type ChatMessageProps } from './ChatMessage';
import { messageReducer } from './message-reducer';

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: DataType.Message[];
    reduce?: boolean;
    error?: Error;
  } & Pick<ChatMessageProps, 'debug' | 'space' | 'toolProvider' | 'onEvent'>
>;

export const ChatThread = forwardRef<ScrollController, ChatThreadProps>(
  ({ classNames, identity, messages = [], reduce = true, error, onEvent, ...props }, forwardedRef) => {
    const userHue = useMemo(() => {
      return identity?.profile?.data?.hue || keyToFallback(identity?.identityKey ?? PublicKey.random()).hue;
    }, [identity]);

    // Show error.
    useEffect(() => {
      onEvent?.({ type: 'scroll-to-bottom' });
    }, [error]);

    // Reduce messages to collapse related blocks.
    const filteredMessages = useMemo(() => {
      if (reduce) {
        return messages.reduce(messageReducer, { messages: [] }).messages;
      } else {
        return messages;
      }
    }, [messages, reduce]);

    return (
      <ScrollContainer.Root pin fade ref={forwardedRef} classNames={classNames}>
        <ScrollContainer.Content
          classNames='relative flex flex-col gap-2 pbs-2 pbe-2'
          style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
        >
          {filteredMessages.map((message) => (
            <ChatMessage key={message.id} message={message} onEvent={onEvent} {...props} />
          ))}

          {error && <ChatError error={error} onEvent={onEvent} />}
        </ScrollContainer.Content>
        <ScrollContainer.ScrollDownButton />
      </ScrollContainer.Root>
    );
  },
);
