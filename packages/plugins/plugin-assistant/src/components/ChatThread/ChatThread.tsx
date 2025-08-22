//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, forwardRef, useMemo } from 'react';

import { PublicKey } from '@dxos/keys';
import { type Identity } from '@dxos/react-client/halo';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController, useScrollContainerContext } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';
import { keyToFallback } from '@dxos/util';

import { meta } from '../../meta';

import { ChatMessage, type ChatMessageProps } from './ChatMessage';
import { messageReducer } from './reducer';

export type ChatThreadProps = ThemedClassName<
  {
    identity?: Identity;
    messages?: DataType.Message[];
    collapse?: boolean;
  } & Pick<ChatMessageProps, 'debug' | 'space' | 'tools' | 'onEvent'>
>;

export const ChatThread = forwardRef<ScrollController, ChatThreadProps>(
  ({ classNames, identity, messages, collapse = true, onEvent, ...props }, forwardedRef) => {
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
      <ScrollContainer.Root pin fade ref={forwardedRef} classNames={classNames}>
        <ScrollContainer.Content
          classNames='relative flex flex-col gap-2 pbs-2 pbe-2'
          style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
        >
          {filteredMessages.map((message) => (
            <ChatMessage key={message.id} message={message} onEvent={onEvent} {...props} />
          ))}
        </ScrollContainer.Content>
        <ScrollToBottomButton onEvent={onEvent} />
      </ScrollContainer.Root>
    );
  },
);

// TODO(burdon): Move into ScrollContainer.
const ScrollToBottomButton = ({ onEvent }: Pick<ChatThreadProps, 'onEvent'>) => {
  const { t } = useTranslation(meta.id);
  const { pinned } = useScrollContainerContext(ScrollToBottomButton.displayName);

  return (
    <div
      role='none'
      className={mx('absolute bottom-2 right-4 opacity-100 transition-opacity duration-300', pinned && 'opacity-0')}
    >
      <IconButton
        variant='primary'
        icon='ph--arrow-down--regular'
        iconOnly
        size={4}
        label={t('button scroll down')}
        onClick={() => onEvent?.({ type: 'scroll-to-bottom' })}
      />
    </div>
  );
};

ScrollToBottomButton.displayName = 'ScrollToBottomButton';
