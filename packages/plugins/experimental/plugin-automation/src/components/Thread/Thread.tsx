//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useRef } from 'react';

import { useCapabilities } from '@dxos/app-framework';
import { type Message } from '@dxos/artifact';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription';
import { type Space } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { mx } from '@dxos/react-ui-theme';

import { ThreadMessage, type ThreadMessageProps } from './ThreadMessage';
import { messageReducer } from './reducer';
import { PromptBar, type PromptBarProps } from '../Prompt';

export type ThreadProps = ThemedClassName<{
  space?: Space;
  messages?: Message[];
  collapse?: boolean;
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
  processing,
  error,
  debug,
  onSubmit,
  onCancel,
  onPrompt,
  onDelete,
}: ThreadProps) => {
  const hasTrascription = useCapabilities(TranscriptionCapabilities.Transcription).length > 0;

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
    <>
      <ScrollContainer ref={scroller} classNames='bg-baseSurface' fadeClassNames='from-baseSurface h-[6rem]'>
        <div role='none' className={mx(filteredMessages.length > 0 && 'pbs-6 pbe-6', classNames)}>
          {filteredMessages.map((message) => (
            <ThreadMessage
              key={message.id}
              classNames='px-4 pbe-4'
              space={space}
              message={message}
              debug={debug}
              onPrompt={onPrompt}
              onDelete={onDelete}
            />
          ))}
        </div>
      </ScrollContainer>

      {onSubmit && (
        <PromptBar
          microphone={hasTrascription}
          processing={processing}
          error={error}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      )}
    </>
  );
};
