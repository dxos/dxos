//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { type Message } from '@dxos/artifact';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { Spinner } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { ThreadMessage, type ThreadMessageProps } from './ThreadMessage';
import { messageReducer } from './reducer';
import { useTextInputEvents } from '../../hooks';
import { AUTOMATION_PLUGIN } from '../../meta';

export type ThreadProps = {
  messages?: Message[];
  streaming?: boolean;
  onSubmit?: (message: string) => void;
  onStop?: () => void;
} & Pick<ThreadMessageProps, 'collapse' | 'debug' | 'onSuggest' | 'onDelete'>;

/**
 * Chat thread component.
 */
export const Thread = ({
  messages,
  streaming,
  collapse,
  debug,
  onSubmit,
  onStop,
  onSuggest,
  onDelete,
}: ThreadProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const scroller = useRef<ScrollController>(null);

  const [inputProps] = useTextInputEvents({
    onEnter: (value) => {
      onSubmit?.(value);
      scroller.current?.scrollToBottom();
      return true;
    },
  });

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
            onSuggest={onSuggest}
            onDelete={onDelete}
          />
        ))}
      </ScrollContainer>

      {onSubmit && (
        <div className='flex p-4 gap-3 items-center'>
          <Spinner active={streaming} />
          <Input.Root>
            <Input.TextInput
              autoFocus
              classNames='px-2 baseSurface rounded'
              placeholder={t('chat input placeholder')}
              {...inputProps}
            />
          </Input.Root>
          {onStop && (
            <IconButton
              disabled={!streaming}
              classNames={mx('!p-1 !opacity-20 transition', streaming && '!opacity-80')}
              variant='ghost'
              size={5}
              onClick={onStop}
              icon='ph--x--regular'
              label={t('chat stop')}
              iconOnly
            />
          )}
        </div>
      )}
    </div>
  );
};
