//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Database } from '@dxos/echo';
import { log } from '@dxos/log';
import { Button, Icon, ScrollArea } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type TelegramMessage, useTelegramApi, useTelegramMessages } from '#hooks';
import { type TelegramBotCapabilities } from '#types';

export type TelegramFeedProps = {
  settings: TelegramBotCapabilities.Settings;
  db: Database.Database;
};

export const TelegramFeed = ({ settings, db }: TelegramFeedProps) => {
  const { messages, discoveredChats, polling, error: pollError, botUserId, startPolling, stopPolling, fetchUpdates } =
    useTelegramMessages(settings.botToken, settings.monitoredChats ?? []);

  const { sendMessage } = useTelegramApi(settings.botToken);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [responding, setResponding] = useState<Set<number>>(new Set());

  // Auto-scroll on new messages.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  // Auto-start polling when configured.
  useEffect(() => {
    if (settings.botToken && !polling) {
      startPolling();
    }
  }, [settings.botToken, polling, startPolling]);

  const handleReply = useCallback(
    async (message: TelegramMessage) => {
      if (responding.has(message.messageId)) {
        return;
      }
      setResponding((prev) => new Set(prev).add(message.messageId));
      try {
        await sendMessage(message.chatId, `Received: "${message.text}"`, message.messageId);
        log.info('telegram: replied to message', { messageId: message.messageId });
      } catch (err) {
        log.warn('telegram: reply failed', { error: String(err) });
      } finally {
        setResponding((prev) => {
          const next = new Set(prev);
          next.delete(message.messageId);
          return next;
        });
      }
    },
    [sendMessage, responding],
  );

  if (!settings.botToken) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-8 text-center text-description'>
        <Icon icon='ph--telegram-logo--regular' size={10} classNames='mb-4 opacity-50' />
        <p className='text-sm'>Configure your Telegram bot token in Settings to start monitoring messages.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center gap-2 p-2 border-b border-separator'>
        <Icon icon='ph--telegram-logo--regular' size={5} />
        <span className='text-sm font-medium grow'>Telegram</span>
        {polling && <div className='size-2 rounded-full bg-green-500 animate-pulse' />}
        <Button variant='ghost' onClick={() => void fetchUpdates()}>
          <Icon icon='ph--arrow-clockwise--regular' size={4} />
        </Button>
        <Button variant='ghost' onClick={polling ? stopPolling : startPolling}>
          <Icon icon={polling ? 'ph--stop--regular' : 'ph--play--regular'} size={4} />
        </Button>
      </div>

      {pollError && (
        <div className='px-3 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-950'>
          {pollError}
        </div>
      )}

      <ScrollArea.Root className='flex-1'>
        <ScrollArea.Viewport ref={scrollRef} className='max-h-full'>
          <div className='flex flex-col gap-1 p-2'>
            {messages.length === 0 ? (
              <div className='text-sm text-description text-center py-8'>
                {polling ? 'Listening for messages...' : 'Start polling to receive messages.'}
              </div>
            ) : (
              messages.map((message) => (
                <MessageRow
                  key={`${message.chatId}-${message.messageId}`}
                  message={message}
                  isBotMessage={message.fromId === botUserId}
                  onReply={() => void handleReply(message)}
                  replying={responding.has(message.messageId)}
                />
              ))
            )}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

const MessageRow = ({
  message,
  isBotMessage,
  onReply,
  replying,
}: {
  message: TelegramMessage;
  isBotMessage: boolean;
  onReply: () => void;
  replying: boolean;
}) => {
  const time = new Date(message.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initial = message.fromName.charAt(0).toUpperCase();

  return (
    <div className={mx('flex gap-2 p-2 rounded group', isBotMessage && 'opacity-60')}>
      <div
        className={mx(
          'flex-shrink-0 size-8 rounded-full flex items-center justify-center text-xs font-medium',
          isBotMessage ? 'bg-blue-100 text-blue-700' : 'bg-neutral-200 text-neutral-700',
        )}
      >
        {isBotMessage ? <Icon icon='ph--robot--regular' size={4} /> : initial}
      </div>
      <div className='flex flex-col gap-0.5 min-w-0 grow'>
        <div className='flex items-baseline gap-2'>
          <span className='text-sm font-medium truncate'>{message.fromName}</span>
          {message.fromUsername && (
            <span className='text-xs text-description'>@{message.fromUsername}</span>
          )}
          <span className='text-xs text-description ml-auto flex-shrink-0'>{time}</span>
        </div>
        {message.chatType !== 'private' && (
          <span className='text-xs text-description'>in {message.chatTitle}</span>
        )}
        <p className='text-sm whitespace-pre-wrap break-words'>{message.text}</p>
      </div>
      {!isBotMessage && (
        <Button
          variant='ghost'
          classNames='opacity-0 group-hover:opacity-100 flex-shrink-0 self-start'
          onClick={onReply}
          disabled={replying}
        >
          <Icon icon='ph--robot--regular' size={4} />
        </Button>
      )}
    </div>
  );
};
