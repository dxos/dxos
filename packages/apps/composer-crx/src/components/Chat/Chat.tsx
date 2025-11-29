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
import { MarkdownViewer } from '@dxos/react-ui-markdown';
import { mx } from '@dxos/react-ui-theme';

import { SPACE_ID_PROP, SPACE_MODE_PROP } from '../../config';
import { translationKey } from '../../translations';

type Metadata = {
  hidden?: boolean;
};

export type ChatProps = ThemedClassName<{
  host?: string;
  onPing?: () => Promise<string | null>;
  url?: string;
}>;

export const Chat = ({ classNames, host, url }: ChatProps) => {
  const { t } = useTranslation(translationKey);
  const inputRef = useRef<HTMLInputElement>(null);
  const spaceIdRef = useRef<SpaceId | null>(null);
  const [text, setText] = useState('');

  // Chat agent client.
  const agent = useAgent({
    agent: 'chat',
    protocol: isSecureUrl(host ?? '') ? 'wss' : 'ws',
    host,
  });

  // TODO(burdon): Define tools (see generic params).
  // TODO(burdon): Get initial messages (currently the history only appears after the first message).
  const { error, messages, sendMessage, stop, clearError, clearHistory } = useAgentChat<unknown, UIMessage<Metadata>>({
    agent,
    resume: true,
    // TODO(burdon): This will replace the initial message history.
    // getInitialMessages: async () => []
  });

  const filteredMessages = useMemo(
    () => messages.filter((message) => message.role !== 'system' && !message.metadata?.hidden),
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

    // Update context.
    // TODO(burdon): Get current selection?
    {
      const context: string[] = [];

      // Update current url.
      if (currentUrl.current !== url || messages.length === 0) {
        currentUrl.current = url;
        context.push(
          "Determine if the user's question relates to the website the user is currently viewing.",
          `The current website is: ${url}`,
        );
      }

      // Determine space mode.
      const spaceMode = (await browser.storage.sync.get(SPACE_MODE_PROP))?.[SPACE_MODE_PROP];
      const spaceId = (await browser.storage.sync.get(SPACE_ID_PROP))?.[SPACE_ID_PROP];
      if (spaceMode && spaceId) {
        if (SpaceId.isValid(spaceId) && (spaceId !== spaceIdRef.current || messages.length === 0)) {
          context.push(`Otherwise use the configured Space to retrieve information.`, `The Space ID is: ${spaceId}`);
          spaceIdRef.current = spaceId;
        }
      }

      // Send system message.
      if (context.length > 0) {
        console.log('system:', JSON.stringify(context, null, 2));
        await sendMessage(
          {
            role: 'assistant',
            parts: [
              {
                type: 'text',
                text: ['<system-context>', ...context, '</system-context>'].join('\n'),
              },
            ],
          },
          {
            metadata: { hidden: true },
          },
        );
      }
    }

    // User message.
    await sendMessage({
      role: 'user',
      parts: [{ type: 'text', text }],
    });
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
                  <MarkdownViewer
                    content={message.parts
                      .map((part) => (part.type === 'text' ? part.text : null))
                      .filter(Boolean)
                      .join('')}
                  />
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
  } catch {
    return false;
  }
};
