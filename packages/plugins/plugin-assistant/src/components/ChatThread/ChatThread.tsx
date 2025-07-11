//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, useMemo, useRef } from 'react';

import { type Message } from '@dxos/ai';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { keyToFallback } from '@dxos/util';

import { ChatMessage, type ChatMessageProps } from './ChatMessage';
import { messageReducer } from './reducer';

export type ChatThreadProps = ThemedClassName<{
  space?: Space;
  messages?: Message[];
  collapse?: boolean;
  transcription?: boolean;
}> &
  Pick<ChatMessageProps, 'debug' | 'tools' | 'onPrompt' | 'onDelete' | 'onAddToGraph'>;

export const ChatThread = ({
  classNames,
  space,
  messages,
  collapse = true,
  transcription,
  ...props
}: ChatThreadProps) => {
  const identity = useIdentity();
  const fallbackValue = keyToFallback(identity!.identityKey);
  const userHue = identity!.profile?.data?.hue || fallbackValue.hue;

  const scroller = useRef<ScrollController>(null);

  // TODO(dmaretskyi): This needs to be a separate type: `id` is not a valid ObjectId, this needs to accommodate messageId for deletion.
  const { messages: filteredMessages = [] } = useMemo(() => {
    if (collapse) {
      return (messages ?? []).reduce<{ messages: Message[]; current?: Message }>(messageReducer, {
        messages: [],
      });
    } else {
      return { messages: messages ?? [] };
    }
  }, [messages, collapse]);

  return (
    <ScrollContainer classNames={classNames} ref={scroller} fade>
      <div
        role='none'
        className={mx(filteredMessages.length > 0 && 'pbs-6 pbe-6')}
        style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
      >
        {filteredMessages.map((message) => (
          <ChatMessage key={message.id} classNames='px-4 pbe-4' space={space} message={message} {...props} />
        ))}
      </div>
    </ScrollContainer>
  );
};
