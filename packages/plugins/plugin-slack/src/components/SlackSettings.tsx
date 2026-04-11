//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Button, Icon, Input } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useSlackApi } from '#hooks';
import { type SlackCapabilities, type SlackChannel } from '#types';

export type SlackSettingsProps = {
  settings: SlackCapabilities.Settings;
  onSettingsChange: (fn: (current: SlackCapabilities.Settings) => SlackCapabilities.Settings) => void;
};

export const SlackSettings = ({ settings, onSettingsChange }: SlackSettingsProps) => {
  const [tokenInput, setTokenInput] = useState(settings.botToken ?? '');
  const { status, channels, teamName, error, testConnection } = useSlackApi(settings.botToken);

  const updatePartial = useCallback(
    (partial: Partial<SlackCapabilities.Settings>) => {
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
    updatePartial({ botToken: undefined, monitoredChannels: [] });
    setTokenInput('');
  }, [updatePartial]);

  const handleToggleChannel = useCallback(
    (channelId: string) => {
      const current = settings.monitoredChannels ?? [];
      const next = current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId];
      updatePartial({ monitoredChannels: next });
    },
    [settings.monitoredChannels, updatePartial],
  );

  return (
    <div className='flex flex-col gap-4 p-3'>
      <div className='flex flex-col gap-2'>
        <h3 className='text-sm font-medium'>Slack Connection</h3>

        <div className='flex items-center gap-2'>
          <StatusIndicator status={status} />
          <span className='text-sm text-description'>
            {status === 'connected' && teamName ? `Connected to ${teamName}` : status === 'error' ? error : status === 'connecting' ? 'Connecting...' : 'Not connected'}
          </span>
        </div>

        <div className='flex gap-2'>
          <Input.Root>
            <Input.TextInput
              placeholder='xoxb-...'
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

      {status === 'connected' && channels.length > 0 && (
        <div className='flex flex-col gap-2'>
          <h3 className='text-sm font-medium'>
            Monitored Channels ({channels.length} available)
          </h3>
          <div className='flex flex-col gap-1 max-h-96 overflow-y-auto border border-separator rounded p-1'>
            {channels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                monitored={settings.monitoredChannels?.includes(channel.id) ?? false}
                onToggle={() => handleToggleChannel(channel.id)}
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
            Respond to @mentions
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

const ChannelRow = ({
  channel,
  monitored,
  onToggle,
}: {
  channel: SlackChannel;
  monitored: boolean;
  onToggle: () => void;
}) => (
  <label className='flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-hoverSurface cursor-pointer'>
    <input type='checkbox' checked={monitored} onChange={onToggle} />
    <Icon icon='ph--hash--regular' size={3} classNames='text-description' />
    {channel.name}
  </label>
);
