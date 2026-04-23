//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Button, Icon, Input } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useTelegramApi } from '#hooks';
import { type TelegramBotCapabilities, type TelegramChat } from '#types';

export type TelegramSettingsProps = {
  settings: TelegramBotCapabilities.Settings;
  onSettingsChange: (fn: (current: TelegramBotCapabilities.Settings) => TelegramBotCapabilities.Settings) => void;
  discoveredChats?: TelegramChat[];
};

export const TelegramSettings = ({ settings, onSettingsChange, discoveredChats = [] }: TelegramSettingsProps) => {
  const [tokenInput, setTokenInput] = useState(settings.botToken ?? '');
  const { status, botInfo, error, testConnection } = useTelegramApi(settings.botToken);

  const updatePartial = useCallback(
    (partial: Partial<TelegramBotCapabilities.Settings>) => {
      onSettingsChange((current) => ({ ...current, ...partial }));
    },
    [onSettingsChange],
  );

  const handleTestConnection = useCallback(async () => {
    const trimmed = tokenInput.trim();
    if (trimmed) {
      updatePartial({ botToken: trimmed });
    }
    await testConnection();
  }, [tokenInput, updatePartial, testConnection]);

  const handleDisconnect = useCallback(() => {
    updatePartial({ botToken: undefined, monitoredChats: [] });
    setTokenInput('');
  }, [updatePartial]);

  const handleToggleChat = useCallback(
    (chatId: string) => {
      const current = settings.monitoredChats ?? [];
      const next = current.includes(chatId) ? current.filter((id) => id !== chatId) : [...current, chatId];
      updatePartial({ monitoredChats: next });
    },
    [settings.monitoredChats, updatePartial],
  );

  return (
    <div className='flex flex-col gap-4 p-3'>
      <div className='flex flex-col gap-2'>
        <h3 className='text-sm font-medium'>Telegram Connection</h3>

        <div className='flex items-center gap-2'>
          <StatusIndicator status={status} />
          <span className='text-sm text-description'>
            {status === 'connected' && botInfo
              ? `Connected to @${botInfo.username}`
              : status === 'error'
                ? error
                : status === 'connecting'
                  ? 'Connecting...'
                  : 'Not connected'}
          </span>
        </div>

        <div className='flex gap-2'>
          <Input.Root>
            <Input.TextInput
              placeholder='123456:ABC-DEF1234...'
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              type='password'
              classNames='font-mono text-xs'
            />
          </Input.Root>
        </div>

        <div className='flex gap-2'>
          <Button variant='primary' onClick={handleTestConnection} disabled={!tokenInput.trim()}>
            <Icon icon='ph--plug--regular' size={4} />
            Test Connection
          </Button>
          {settings.botToken && (
            <Button variant='ghost' onClick={handleDisconnect}>
              <Icon icon='ph--plugs--regular' size={4} />
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {discoveredChats.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h3 className='text-sm font-medium'>
            Monitored Chats ({discoveredChats.length} discovered)
          </h3>
          <p className='text-xs text-description'>
            Chats appear here as the bot receives messages. Send a message to the bot to discover a chat.
          </p>
          <div className='flex flex-col gap-1 max-h-96 overflow-y-auto border border-separator rounded p-1'>
            {discoveredChats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                monitored={settings.monitoredChats?.includes(String(chat.id)) ?? false}
                onToggle={() => handleToggleChat(String(chat.id))}
              />
            ))}
          </div>
        </div>
      )}

      {status === 'connected' && (
        <div className='flex flex-col gap-2'>
          <h3 className='text-sm font-medium'>Behavior</h3>
          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={settings.respondToMentions ?? true}
              onChange={(event) => updatePartial({ respondToMentions: event.target.checked })}
            />
            Respond to @mentions in groups
          </label>
          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={settings.respondToDMs ?? true}
              onChange={(event) => updatePartial({ respondToDMs: event.target.checked })}
            />
            Respond to direct messages
          </label>
        </div>
      )}
    </div>
  );
};

const StatusIndicator = ({ status }: { status: string }) => (
  <div
    className={mx(
      'size-2 rounded-full',
      status === 'connected' && 'bg-green-500',
      status === 'connecting' && 'bg-yellow-500 animate-pulse',
      status === 'error' && 'bg-red-500',
      status === 'disconnected' && 'bg-neutral-400',
    )}
  />
);

const ChatRow = ({
  chat,
  monitored,
  onToggle,
}: {
  chat: TelegramChat;
  monitored: boolean;
  onToggle: () => void;
}) => (
  <label className='flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-hoverSurface cursor-pointer'>
    <input type='checkbox' checked={monitored} onChange={onToggle} />
    <Icon
      icon={chat.type === 'private' ? 'ph--user--regular' : 'ph--users-three--regular'}
      size={3}
      classNames='text-description'
    />
    {chat.title}
    <span className='text-xs text-description ml-auto'>{chat.type}</span>
  </label>
);
