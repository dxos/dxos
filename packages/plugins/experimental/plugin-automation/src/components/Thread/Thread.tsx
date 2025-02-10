//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEventHandler, type UIEventHandler, useCallback, useEffect, useRef, useState } from 'react';

import { type Message } from '@dxos/artifact';
import { invariant } from '@dxos/invariant';
import { Icon, Input } from '@dxos/react-ui';
import { Spinner } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { ThreadMessage } from './ThreadMessage';

export type ThreadProps = {
  messages?: Message[];
  streaming?: boolean;
  debug?: boolean;
  onSubmit?: (message: string) => void;
};

// TODO(burdon): Factor out scroll logic.
export const Thread = ({ messages, streaming, debug, onSubmit }: ThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(false);
  const scroll = async () => {
    invariant(scrollRef.current);
    autoScrollRef.current = true;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  // Detect scroll end.
  useEffect(() => {
    invariant(scrollRef.current);
    const handleScrollEnd = () => {
      autoScrollRef.current = false;
    };

    scrollRef.current.addEventListener('scrollend', handleScrollEnd);
    return () => scrollRef.current?.removeEventListener('scrollend', handleScrollEnd);
  }, []);

  // Auto scroll.
  const [sticky, setSticky] = useState(true);
  useEffect(() => {
    if (!sticky) {
      return;
    }

    const t = setTimeout(() => scroll(), 100);
    return () => clearTimeout(t);
  }, [messages]);

  // Scrolling.
  const handleScroll = useCallback<UIEventHandler<HTMLDivElement>>((ev) => {
    if (autoScrollRef.current) {
      return;
    }

    const { scrollTop, clientHeight, scrollHeight } = ev.currentTarget;
    const sticky = scrollTop + clientHeight >= scrollHeight;
    setSticky(sticky);
  }, []);

  // Text input.
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
            onSubmit?.(value);
            setText('');
            void scroll();
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
      <div
        ref={scrollRef}
        className='flex flex-col gap-2 py-2 grow overflow-x-hidden overflow-y-scroll scrollbar-none'
        onScroll={handleScroll}
      >
        {messages?.map((message) => (
          <ThreadMessage key={message.id} classNames='px-4' message={message} debug={debug} />
        ))}
      </div>

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
