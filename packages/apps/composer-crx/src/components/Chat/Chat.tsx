//
// Copyright 2024 DXOS.org
//

import { type UIMessage } from '@ai-sdk/react';
import { useAgentChat } from 'agents/ai-react';
import { useAgent } from 'agents/react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import browser from 'webextension-polyfill';

import { SpaceId } from '@dxos/keys';
import { IconButton, Input, ScrollContainer, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { SPACE_ID_PROP } from '../../config';
import { translationKey } from '../../translations';

export type ChatProps = ThemedClassName<{
  host?: string;
  onPing?: () => Promise<string | null>;
  url?: string;
}>;

export const Chat = ({ classNames, host, url }: ChatProps) => {
  const { t } = useTranslation(translationKey);
  const inputRef = useRef<HTMLInputElement>(null);
  const spaceId = useRef<SpaceId | null>(null);
  const [text, setText] = useState('');

  // Chat agent client.
  const agent = useAgent({
    agent: 'chat',
    protocol: isSecureUrl(host ?? '') ? 'wss' : 'ws',
    host,
  });

  // TODO(burdon): Get initial messages (currently the history only appears after the first message).
  const { error, messages, sendMessage, stop, clearError, clearHistory } = useAgentChat<
    unknown,
    UIMessage<{ createdAt: string; text: string }>
  >({
    agent,
    resume: true,
    // TODO(burdon): This will replace the initial message history.
    // getInitialMessages: async () => []
  });

  const filteredMessages = useMemo(
    () => messages.filter((message) => message.id !== 'initial' && message.role !== 'system'),
    [messages],
  );

  const currentUrl = useRef<string>(undefined);
  const handleSubmit = useCallback(async () => {
    const text = inputRef.current?.value?.trim();
    if (!text?.length) {
      return;
    }

    // TODO(burdon): Disable text input while processing.
    setText('');

    const context: string[] = [];

    // Update context.
    if (currentUrl.current !== url || messages.length === 0) {
      currentUrl.current = url;
      context.push(
        // TODO(burdon): Implement tool call to get the content of the website? Or do this on the server?
        // TODO(burdon): Get current selection?
        'You should assume that most questions are related to website that the user is currently looking at.',
        // 'You should try to get the content of the website if you need to answer the question.',
        `The current website is: ${url}`,
      );
    }
    const storedSpaceId = await browser.storage.sync.get(SPACE_ID_PROP);
    if (storedSpaceId?.[SPACE_ID_PROP] !== spaceId.current || messages.length === 0) {
      const value = storedSpaceId?.[SPACE_ID_PROP];
      if (SpaceId.isValid(value)) {
        spaceId.current = value;
        context.push(`The configured space is: ${value} Use this space to retrieve information.`);
      }
    }
    if (context.length > 0) {
      await sendMessage({
        role: 'system',
        parts: [
          {
            type: 'text',
            text: context.join('\n'),
          },
        ],
      });
    }

    // User message.
    await sendMessage(
      {
        role: 'user',
        parts: [{ type: 'text', text }],
      },
      // TODO(burdon): Can pass additional headers/JSON body props to worker here.
      {
        metadata: { url: url ?? window.location.href },
      },
    );
  }, [sendMessage, url]);

  const handleClear = useCallback(async () => {
    void stop();
    void clearError();
    void clearHistory();
    setText('');
    inputRef.current?.focus();
  }, [clearError, clearHistory, stop]);

  return (
    <div className={mx('flex flex-col gap-2 overflow-hidden bg-baseSurface', classNames)}>
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
            classNames='pli-2 pbs-[4px] pbe-[4px] is-full rounded-none text-lg !ring-none !ring-sky-500'
          />
        </Input.Root>
        {filteredMessages.length > 0 && (
          <div className='flex items-center absolute right-1.5 top-0 bottom-0 z-10'>
            <IconButton
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              label={t('chat.clear.button')}
              onClick={handleClear}
            />
          </div>
        )}
      </div>

      {/* TODO(burdon): Replace with ChatThread. */}
      {filteredMessages.length > 0 && (
        <ScrollContainer.Root pin classNames='max-bs-[480px] p-3'>
          <ScrollContainer.Viewport classNames='scrollbar-none'>
            {filteredMessages.map((message, i) => (
              <div key={i} className={mx('flex', 'text-base', message.role === 'user' && 'justify-end mlb-3')}>
                <p className={mx(message.role === 'user' ? 'bg-sky-500 pli-2 plb-1 rounded' : 'text-description')}>
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

const isSecureUrl = (host: string) => {
  try {
    const url = new URL(host);
    return url.protocol === 'https:' || url.protocol === 'wss:';
  } catch (err) {
    return false;
  }
};
