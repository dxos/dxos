//
// Copyright 2024 DXOS.org
//

import type { UIMessage } from '@ai-sdk/react';
import { useAgentChat } from 'agents/ai-react';
import { useAgent } from 'agents/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { combine } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { IconButton, Input, ScrollContainer, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

combine();

export type ChatProps = ThemedClassName<{
  host?: string;
  onPing?: () => Promise<string | null>;
  url?: string;
}>;

export const Chat = ({ classNames, host, url }: ChatProps) => {
  const { t } = useTranslation(translationKey);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  invariant(true);

  // Chat agent client.
  const agent = useAgent({
    agent: 'chat',
    protocol: 'wss',
    host,
  });

  // TODO(burdon): Get initial messages (currently the history only appears after the first message).
  const { error, messages, sendMessage, stop, clearError, clearHistory } = useAgentChat<
    unknown,
    UIMessage<{ createdAt: string; text: string }>
  >({
    agent,
    // TODO(burdon): ???
    resume: true,
    // This is only called once at the start.
    getInitialMessages: async () => {
      console.log('getInitialMessages', { url });
      return [
        {
          id: 'initial',
          role: 'assistant',
          parts: [{ type: 'text', text: `Current website: ${url}` }],
        },
      ];
    },
  });

  const filteredMessages = useMemo(
    () => messages.filter((message) => message.id !== 'initial' && message.role !== 'system'),
    [messages],
  );

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current?.value?.trim();
    if (!text?.length) {
      return;
    }

    void sendMessage({
      role: 'user',
      parts: [{ type: 'text', text }],
    });

    setText('');
  }, [sendMessage, url]);

  const handleClear = useCallback(async () => {
    void stop();
    void clearError();
    void clearHistory();
    setText('');
    inputRef.current?.focus();
  }, [clearError, clearHistory, stop]);

  return (
    <div className={mx('flex flex-col p-1 gap-2 overflow-hidden bg-baseSurface', classNames)}>
      {/* TODO(burdon): Replace with chat from plugin-assistant. */}
      <div className='flex relative'>
        <Input.Root>
          <Input.TextInput
            ref={inputRef}
            autoFocus
            placeholder={t('chat.placeholder')}
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && handleSubmit()}
            classNames='is-full rounded-none text-lg !ring-sky-500'
          />
        </Input.Root>
        <div className='flex items-center absolute right-0 top-0 bottom-0 z-10'>
          <IconButton
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('chat.clear.button')}
            onClick={handleClear}
          />
        </div>
      </div>

      {/* TODO(burdon): Replace with ChatThread. */}
      {filteredMessages.length > 0 && (
        <ScrollContainer.Root pin classNames='max-bs-[480px]'>
          <ScrollContainer.Viewport classNames='scrollbar-none'>
            {filteredMessages.map((message, i) => (
              <div key={i} className={mx('flex', 'p-1 text-base', message.role === 'user' && 'justify-end mis-2')}>
                <p className={mx(message.role === 'user' && 'bg-sky-500 pli-2 plb-1 rounded')}>
                  {message.parts
                    .filter(({ type }) => type === 'text')
                    .map((part, j) => (
                      <div key={j}>{(part as any).text}</div>
                    ))}
                </p>
              </div>
            ))}
          </ScrollContainer.Viewport>
        </ScrollContainer.Root>
      )}

      {error && (
        <div className='flex overflow-hidden items-center opacity-50'>
          <div className='pli-2 text-subdued text-xs whitespace-nowrap truncate'>
            {error.message || 'An error occurred'}
          </div>
          <div className='flex shrink-0'>
            <IconButton
              variant='ghost'
              icon='ph--clipboard--regular'
              iconOnly
              label={t('chat.clear.button')}
              classNames='text-subdued'
              onClick={() => navigator.clipboard.writeText(error.message)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
