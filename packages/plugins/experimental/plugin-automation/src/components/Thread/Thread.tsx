//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEventHandler, useCallback, useRef, useState } from 'react';

import { type Message } from '@dxos/artifact';
import { Icon, Input } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { ScrollContainer, type ScrollController } from './ScrollContainer';
import { ThreadMessage } from './ThreadMessage';

export type ThreadProps = {
  messages?: Message[];
  streaming?: boolean;
  debug?: boolean;
  onSubmit?: (message: string) => void;
};

// TODO(burdon): Factor out scroll logic.
export const Thread = ({ messages, streaming, debug, onSubmit }: ThreadProps) => {
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

  // TODO(burdon): Custom scrollbar.
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <ScrollContainer ref={scroller} classNames='flex flex-col gap-2 py-2 grow overflow-x-hidden'>
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
              placeholder='Ask a question...'
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              onKeyDown={handleKeyDown}
            />
          </Input.Root>
          <Icon
            icon={'ph--spinner-gap--regular'}
            classNames={mx('animate-spin opacity-0 transition duration-500', streaming && 'opacity-100')}
            size={6}
          />
        </div>
      )}
    </div>
  );
};
