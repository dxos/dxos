//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEventHandler, useCallback, useRef, useState } from 'react';

import { type Message } from '@dxos/artifact';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { ScrollContainer, type ScrollController } from './ScrollContainer';
import { ThreadMessage } from './ThreadMessage';
import { AUTOMATION_PLUGIN } from '../../meta';

export type ThreadProps = {
  messages?: Message[];
  streaming?: boolean;
  debug?: boolean;
  onSubmit?: (message: string) => void;
  onStop?: () => void;
};

// TODO(burdon): Factor out scroll logic.
export const Thread = ({ messages, streaming, debug, onSubmit, onStop }: ThreadProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const scroller = useRef<ScrollController>(null);

  const [text, setText] = useState('');
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
    (ev) => {
      switch (ev.key) {
        case 'Escape': {
          setText('');
          break;
        }

        case 'Enter': {
          const value = text.trim();
          if (value.length > 0) {
            scroller.current?.scrollToBottom();
            onSubmit?.(value);
            setText('');
          }
          break;
        }
      }
    },
    [text],
  );

  return (
    <div className='flex flex-col grow overflow-hidden'>
      <ScrollContainer ref={scroller} classNames='py-2 gap-2 overflow-x-hidden'>
        {messages?.map((message) => (
          <ThreadMessage key={message.id} classNames='px-4' message={message} debug={debug} />
        ))}
      </ScrollContainer>

      {onSubmit && (
        <div className='flex p-4 gap-3 items-center'>
          <Spinner active={streaming} />
          <Input.Root>
            <Input.TextInput
              autoFocus
              classNames='px-2 bg-base rounded'
              placeholder={t('chat input placeholder')}
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={handleKeyDown}
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
