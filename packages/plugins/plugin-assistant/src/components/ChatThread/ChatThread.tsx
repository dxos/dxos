//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { keyToFallback } from '@dxos/util';

import { ChatMessage, type ChatMessageProps } from './ChatMessage';
import { messageReducer } from './reducer';

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: DataType.Message[];
    collapse?: boolean;
  } & Pick<ChatMessageProps, 'debug' | 'space' | 'processor' | 'tools' | 'onEvent'>
>;

export const ChatThread = forwardRef<ScrollController, ChatThreadProps>(
  ({ classNames, identity, messages, collapse = true, ...props }, forwardedRef) => {
    const userHue = useMemo(() => {
      return identity?.profile?.data?.hue || keyToFallback(identity?.identityKey ?? PublicKey.random()).hue;
    }, [identity]);

    // TODO(dmaretskyi): This needs to be a separate type: `id` is not a valid ObjectId, this needs to accommodate messageId for deletion.
    const { messages: filteredMessages = [] } = useMemo(() => {
      if (collapse) {
        return (messages ?? []).reduce<{ messages: DataType.Message[]; current?: DataType.Message }>(messageReducer, {
          messages: [],
        });
      } else {
        return { messages: messages ?? [] };
      }
    }, [messages, collapse]);

    return (
      <ScrollContainer ref={forwardedRef} classNames={classNames} fade>
        <div
          role='none'
          className={mx(filteredMessages.length > 0 && 'pbs-4 pbe-4')}
          style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
        >
          {filteredMessages.map((message) => (
            <ChatMessage key={message.id} message={message} {...props} />
          ))}
        </div>
      </ScrollContainer>
    );
  },
);
