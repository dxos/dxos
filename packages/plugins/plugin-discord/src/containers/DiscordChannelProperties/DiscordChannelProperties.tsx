//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { type SpaceId } from '@dxos/keys';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { useInterval } from '@dxos/react-hooks';
import { Flex, useTranslation } from '@dxos/react-ui';
import { type Channel } from '@dxos/types';

import { DiscordBotStatus, DiscordBotToolbar, DiscordChannelForm } from '#components';
import { meta } from '#meta';
import { DiscordChannel } from '#types';

/** How often the bot status is re-read; the gateway changes state on EDGE without notifying Composer. */
const STATUS_POLL_MS = 5_000;

export type DiscordChannelPropertiesProps = AppSurface.ObjectPropertiesProps<Channel.Channel> & {
  attendableId?: string;
};

/** The bot settings of a Discord-backed channel, with its EDGE gateway controls and status. */
export const DiscordChannelProperties = ({ subject: channel, attendableId }: DiscordChannelPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(channel);
  const config = useResolveRef(channel.backend.config);
  const discord = DiscordChannel.instanceOf(config) ? config : undefined;
  const [values] = useObject(discord);
  const bot = useConnection(channel, db?.spaceId);

  const handleSave = useCallback(
    (properties: DiscordChannel.Properties) => {
      if (discord) {
        Obj.update(discord, (discord) => {
          discord.accessToken = properties.accessToken;
          discord.applicationId = properties.applicationId;
          discord.guildId = properties.guildId;
          discord.channels = [...properties.channels];
        });
      }
    },
    [discord],
  );

  if (!discord) {
    return null;
  }

  return (
    <Flex column>
      <DiscordBotToolbar
        attendableId={attendableId}
        running={bot.status?.running}
        busy={bot.busy}
        onStart={bot.start}
        onStop={bot.stop}
        onRefresh={bot.refresh}
      />
      <DiscordChannelForm
        db={db}
        label={t('discord-channel.label')}
        description={t('discord-channel.description')}
        values={values}
        autoSave
        onSave={handleSave}
      >
        <DiscordBotStatus status={bot.status} error={bot.error} />
      </DiscordChannelForm>
    </Flex>
  );
};

DiscordChannelProperties.displayName = 'DiscordChannelProperties';

/** Start/stop/refresh for the channel's connection, polling its status while mounted. */
const useConnection = (channel: Channel.Channel, spaceId: SpaceId | undefined) => {
  const { invokePromise } = useOperationInvoker();
  const [status, setStatus] = useState<ThreadOperation.ConnectionStatus>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (
      operation:
        | typeof ThreadOperation.ConnectChannel
        | typeof ThreadOperation.DisconnectChannel
        | typeof ThreadOperation.GetChannelStatus,
    ) => {
      if (!spaceId) {
        return;
      }

      const { data, error } = await invokePromise(operation, { channel: Ref.make(channel) }, { spaceId });
      setError(error?.message);
      // A failed poll keeps the last status on screen beside the error.
      if (data) {
        setStatus(data.status);
      }
    },
    [invokePromise, channel, spaceId],
  );

  const refresh = useCallback(() => run(ThreadOperation.GetChannelStatus), [run]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useInterval(refresh, STATUS_POLL_MS, [refresh]);

  const withBusy = useCallback(
    async (operation: typeof ThreadOperation.ConnectChannel | typeof ThreadOperation.DisconnectChannel) => {
      setBusy(true);
      await run(operation);
      setBusy(false);
    },
    [run],
  );

  const start = useCallback(() => void withBusy(ThreadOperation.ConnectChannel), [withBusy]);
  const stop = useCallback(() => void withBusy(ThreadOperation.DisconnectChannel), [withBusy]);

  return { status, error, busy, start, stop, refresh: useCallback(() => void refresh(), [refresh]) };
};
