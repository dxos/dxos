//
// Copyright 2024 DXOS.org
//

import type { UIMessage } from '@ai-sdk/react';
import { useAgentChat } from 'agents/ai-react';
import { useAgent } from 'agents/react';
import React, { useCallback, useRef, useState } from 'react';

import { combine } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { IconButton, Input, ScrollContainer, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

combine();

export type ChatProps = ThemedClassName<{
  host?: string;
  onPing?: () => Promise<string | null>;
}>;

export const Chat = ({ classNames, host }: ChatProps) => {
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
  const { messages, sendMessage, clearError, clearHistory, error } = useAgentChat<
    unknown,
    UIMessage<{ createdAt: string; text: string }>
  >({
    agent,
    getInitialMessages: async () => [],
  });

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current?.value?.trim();
    if (!text?.length) {
      return;
    }

    console.log('submit', { text });
    void clearError();
    void sendMessage({ role: 'user', parts: [{ type: 'text', text }] }, {});
    setText('');
  }, [clearError, sendMessage]);

  const handleClear = useCallback(async () => {
    inputRef.current?.focus();
    clearHistory();
  }, [clearHistory]);

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
            classNames='is-full rounded-none text-lg'
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
      {messages.length > 0 && (
        <ScrollContainer.Root pin classNames='max-bs-[480px]'>
          <ScrollContainer.Viewport classNames='scrollbar-none'>
            {messages.map((message, i) => (
              <div key={i} className={mx('flex', 'p-1 text-base', message.role === 'user' && 'justify-end mis-2')}>
                <p className={mx(message.role === 'user' && 'bg-green-500 pli-2 plb-1 rounded')}>
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
