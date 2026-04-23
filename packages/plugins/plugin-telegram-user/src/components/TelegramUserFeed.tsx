//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { Icon, ScrollArea } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type TelegramUserMessage, useTelegramUserClient, useTelegramUserMessages } from '#hooks';
import { type TelegramUserCapabilities } from '#types';

export type TelegramUserFeedProps = {
  settings: TelegramUserCapabilities.Settings;
};

/**
 * Unified inbox: renders every new message from the user's Telegram account,
 * across every chat, in chronological order. Auto-connects if a session is
 * stored; otherwise shows a "go to settings" prompt.
 */
export const TelegramUserFeed = ({ settings }: TelegramUserFeedProps) => {
  const { status, client, connectWithSession } = useTelegramUserClient();
  const { messages, error } = useTelegramUserMessages(client);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-connect with saved session.
  useEffect(() => {
    if (settings.sessionString && settings.apiId && settings.apiHash && status === 'disconnected') {
      void connectWithSession({
        apiId: Number(settings.apiId),
        apiHash: settings.apiHash,
        sessionString: settings.sessionString,
      });
    }
  }, [settings.sessionString, settings.apiId, settings.apiHash, status, connectWithSession]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  const sorted = useMemo(() => [...messages].sort((first, second) => first.date - second.date), [messages]);

  if (!settings.sessionString) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-8 text-center text-description'>
        <Icon icon='ph--telegram-logo--regular' size={10} classNames='mb-4 opacity-50' />
        <p className='text-sm'>Connect your personal Telegram account in Settings to see your unified inbox.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center gap-2 p-2 border-b border-separator'>
        <Icon icon='ph--telegram-logo--regular' size={5} />
        <span className='text-sm font-medium grow'>Telegram</span>
        {status === 'connected' && <div className='size-2 rounded-full bg-green-500 animate-pulse' title='Live' />}
        {status !== 'connected' && <span className='text-xs text-description'>{status}</span>}
      </div>

      {error && (
        <div className='px-3 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-950'>{error}</div>
      )}

      <ScrollArea.Root className='flex-1'>
        <ScrollArea.Viewport ref={scrollRef} className='max-h-full'>
          <div className='flex flex-col gap-1 p-2'>
            {sorted.length === 0 ? (
              <div className='text-sm text-description text-center py-8'>
                {status === 'connected' ? 'Listening for messages…' : 'Waiting for connection…'}
              </div>
            ) : (
              sorted.map((message) => <MessageRow key={message.id} message={message} />)
            )}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

const MessageRow = ({ message }: { message: TelegramUserMessage }) => {
  const time = new Date(message.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initial = (message.fromName ?? message.chatTitle).charAt(0).toUpperCase();

  return (
    <div className={mx('flex gap-2 p-2 rounded', message.outgoing && 'opacity-70')}>
      <div className='flex-shrink-0 size-8 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs font-medium'>
        {initial}
      </div>
      <div className='flex flex-col gap-0.5 min-w-0 grow'>
        <div className='flex items-baseline gap-2'>
          <span className='text-sm font-medium truncate'>
            {message.fromName ?? (message.outgoing ? 'You' : message.chatTitle)}
          </span>
          {message.chatType !== 'user' && (
            <span className='text-xs text-description truncate'>in {message.chatTitle}</span>
          )}
          <span className='text-xs text-description ml-auto flex-shrink-0'>{time}</span>
        </div>
        <p className='text-sm whitespace-pre-wrap break-words'>{message.text}</p>
      </div>
    </div>
  );
};
