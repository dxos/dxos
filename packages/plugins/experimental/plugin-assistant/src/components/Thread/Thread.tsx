//
// Copyright 2025 DXOS.org
//

import React, { type CSSProperties, useCallback, useMemo, useRef } from 'react';

import { type Message } from '@dxos/artifact';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { type ThemedClassName } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';
import { keyToFallback } from '@dxos/util';

import { ThreadMessage, type ThreadMessageProps } from './ThreadMessage';
import { messageReducer } from './reducer';
import { PromptBar, type PromptBarProps } from '../Prompt';

export type ThreadProps = ThemedClassName<{
  space?: Space;
  messages?: Message[];
  collapse?: boolean;
  transcription?: boolean;
  onOpenChange?: (open: boolean) => void;
}> &
  Pick<PromptBarProps, 'processing' | 'error' | 'onSubmit' | 'onSuggest' | 'onCancel'> &
  Pick<ThreadMessageProps, 'debug' | 'onPrompt' | 'onDelete'>;

/**
 * Chat thread component.
 */
export const Thread = ({
  classNames,
  space,
  messages,
  collapse = true,
  transcription,
  processing,
  error,
  onSubmit,
  onCancel,
  onOpenChange,
  ...props
}: ThreadProps) => {
  const scroller = useRef<ScrollController>(null);

  const identity = useIdentity();
  const fallbackValue = keyToFallback(identity!.identityKey);
  const userHue = identity!.profile?.data?.hue || fallbackValue.hue;

  const handleSubmit = useCallback<NonNullable<PromptBarProps['onSubmit']>>(
    (value: string) => {
      onSubmit?.(value);
      scroller.current?.scrollToBottom();
      return true;
    },
    [onSubmit],
  );

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
    <div role='none' className={mx('flex flex-col grow overflow-hidden', classNames)}>
      <ScrollContainer ref={scroller} fade>
        <div
          role='none'
          className={mx(filteredMessages.length > 0 && 'pbs-6 pbe-6')}
          style={{ '--user-fill': `var(--dx-${userHue}Fill)` } as CSSProperties}
        >
          {filteredMessages.map((message) => (
            <ThreadMessage key={message.id} classNames='px-4 pbe-4' space={space} message={message} {...props} />
          ))}
        </div>
      </ScrollContainer>

      {onSubmit && (
        <PromptBar
          microphone={transcription}
          processing={processing}
          error={error}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          onOpenChange={onOpenChange}
        />
      )}
    </div>
  );
};
