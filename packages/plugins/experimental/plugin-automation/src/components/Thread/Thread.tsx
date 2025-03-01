//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { type Message } from '@dxos/artifact';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';

import { ThreadMessage, type ThreadMessageProps } from './ThreadMessage';
import { messageReducer } from './reducer';
import { PromptBar, type PromptBarProps } from '../Prompt';

export type ThreadProps = {
  messages?: Message[];
} & Pick<PromptBarProps, 'processing' | 'onSubmit' | 'onSuggest' | 'onCancel'> &
  Pick<ThreadMessageProps, 'collapse' | 'debug' | 'onPrompt' | 'onDelete'>;

/**
 * Chat thread component.
 */
export const Thread = ({
  messages,
  processing,
  collapse,
  debug,
  onSubmit,
  onCancel,
  onPrompt,
  onDelete,
}: ThreadProps) => {
  const scroller = useRef<ScrollController>(null);

  const handleSubmit = useCallback<NonNullable<PromptBarProps['onSubmit']>>(
    (value: string) => {
      onSubmit?.(value);
      scroller.current?.scrollToBottom();
      return true;
    },
    [onSubmit],
  );

  // TODO(dmaretskyi): This needs to be a separate type: `id` is not a valid ObjectId, this needs to accommodate messageId for deletion.
  const { messages: lines = [] } = useMemo(() => {
    if (collapse) {
      return (messages ?? []).reduce<{ messages: Message[]; current?: Message }>(messageReducer, {
        messages: [],
      });
    } else {
      return { messages: messages ?? [] };
    }
  }, [messages, collapse]);

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <ScrollContainer ref={scroller} classNames='py-2 gap-2 overflow-x-hidden'>
        {lines.map((message) => (
          <ThreadMessage
            key={message.id}
            classNames='px-4'
            message={message}
            collapse={collapse}
            debug={debug}
            onPrompt={onPrompt}
            onDelete={onDelete}
          />
        ))}
      </ScrollContainer>

      {onSubmit && (
        <PromptBar
          classNames='p-1'
          microphone
          processing={processing}
          onSubmit={handleSubmit}
          // onSuggest={onSuggest}
          onCancel={onCancel}
        />
      )}
    </div>
  );
};
