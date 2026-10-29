//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EID } from '@dxos/keys';
import { Connection } from '@dxos/link';
import * as ConnectorCoordination from '@dxos/plugin-connector/ConnectorCoordination';
import { useConfig } from '@dxos/react-client';
import * as Button from '@dxos/react-ui/Button';
import * as Fieldset from '@dxos/react-ui/Fieldset';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';

import { DiscordSetup } from '#components';
import { DiscordAdminOperation } from '#types';

import { DISCORD_USER_PROVIDER_ID, edgeConsoleUrl, kaiApplicationId } from '../../constants.ts';
import { DiscordNamespace } from '../../namespace.ts';

/**
 * The permissions Kai asks for when installed: view, send, read history, create public threads, send in threads, and
 * manage threads (deleting a conversation's thread from Composer).
 */
const BOT_PERMISSIONS = String((1n << 10n) | (1n << 11n) | (1n << 16n) | (1n << 34n) | (1n << 35n) | (1n << 38n));

/** The OAuth link that installs the bot in one guild (Discord's own consent page; no callback). */
const installUrl = (applicationId: string, guildId: string) =>
  `https://discord.com/oauth2/authorize?${new URLSearchParams({
    client_id: applicationId,
    scope: 'bot',
    permissions: BOT_PERMISSIONS,
    guild_id: guildId,
    disable_guild_select: 'true',
  }).toString()}`;

export type DiscordAgentSetupProps = {
  role?: string;
  agent: Agent.Agent;
  attendableId?: string;
};

/**
 * The agent's Discord companion: sign in to Discord, install the bot in a server the user administers, and route
 * that server's channels to this agent.
 */
export const DiscordAgentSetup = ({ role, agent, attendableId }: DiscordAgentSetupProps) => {
  const { t } = UiHooks.useTranslation(DiscordNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  // Absent until plugin-connector activates it (or when it is not enabled); Connect stays disabled meanwhile.
  const [coordinator] = Hooks.useCapabilities(ConnectorCoordination.ConnectorCoordinator);
  const db = Obj.getDatabase(agent);
  const spaceId = db?.spaceId;

  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connection = connections.find(({ connectorId }) => connectorId === DISCORD_USER_PROVIDER_ID);
  // The bot is this EDGE's Kai, whose token EDGE holds; a custom EDGE has none.
  const config = useConfig();
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  const applicationId = kaiApplicationId(edgeUrl);
  const consoleUrl = edgeConsoleUrl(edgeUrl);

  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [managed, setManaged] = useState<DiscordAdminOperation.Guild[]>([]);
  const [installed, setInstalled] = useState<DiscordAdminOperation.Guild[]>([]);
  const [guildId, setGuildId] = useState<string>();
  const [channels, setChannels] = useState<DiscordAdminOperation.GuildChannel[]>([]);
  const [bindings, setBindings] = useState<DiscordAdminOperation.ChannelBinding[]>([]);

  const refreshGuilds = useCallback(async () => {
    if (!spaceId) {
      return;
    }
    if (connection) {
      const { data, error } = await invokePromise(
        DiscordAdminOperation.ListManagedGuilds,
        { connection: Ref.make(connection) },
        { spaceId },
      );
      setError(error?.message);
      setManaged([...(data?.guilds ?? [])]);
    }
    if (applicationId) {
      const { data, error } = await invokePromise(DiscordAdminOperation.ListBotGuilds, { applicationId }, { spaceId });
      setError((previous) => error?.message ?? previous);
      setInstalled([...(data?.guilds ?? [])]);
    }
  }, [invokePromise, spaceId, connection, applicationId]);

  useEffect(() => {
    void refreshGuilds();
  }, [refreshGuilds]);

  const refreshChannels = useCallback(async () => {
    if (!spaceId || !applicationId || !guildId) {
      setChannels([]);
      return;
    }
    const [listed, bound] = await Promise.all([
      invokePromise(DiscordAdminOperation.ListGuildChannels, { applicationId, guildId }, { spaceId }),
      invokePromise(DiscordAdminOperation.ListBindings, { applicationId }, { spaceId }),
    ]);
    setError(listed.error?.message ?? bound.error?.message);
    setChannels([...(listed.data?.channels ?? [])]);
    setBindings([...(bound.data?.bindings ?? [])]);
  }, [invokePromise, spaceId, applicationId, guildId]);

  useEffect(() => {
    void refreshChannels();
  }, [refreshChannels]);

  const handleConnect = useCallback(() => {
    if (!db || !spaceId || !coordinator) {
      return;
    }
    setBusy(true);
    void EffectEx.runPromise(
      coordinator
        .createConnection({ db, spaceId, connectorId: DISCORD_USER_PROVIDER_ID })
        .pipe(Effect.catch((cause) => Effect.sync(() => setError(cause.message)))),
    ).finally(() => setBusy(false));
  }, [coordinator, db, spaceId]);

  // Forgets the sign-in in this space; the grant itself stays on Discord until the user revokes it there.
  const handleSignOut = useCallback(() => {
    if (db && connection) {
      db.remove(connection);
      setManaged([]);
    }
  }, [db, connection]);

  const handleRefresh = useCallback(() => {
    void refreshGuilds();
    void refreshChannels();
  }, [refreshGuilds, refreshChannels]);

  const handleBind = useCallback(
    async (channel: DiscordAdminOperation.GuildChannel, bound: boolean) => {
      if (!spaceId || !applicationId || !guildId) {
        return;
      }
      setBusy(true);
      const { error } = bound
        ? await invokePromise(
            DiscordAdminOperation.UnbindChannel,
            { applicationId, discordChannelId: channel.id },
            { spaceId },
          )
        : await invokePromise(
            DiscordAdminOperation.BindChannel,
            {
              applicationId,
              agent: Ref.make(agent),
              guildId,
              discordChannelId: channel.id,
              channelName: channel.name,
            },
            { spaceId },
          );
      await refreshChannels();
      // After the refresh, which would otherwise clear the bind's error.
      setError(error?.message);
      setBusy(false);
    },
    [invokePromise, spaceId, applicationId, guildId, agent, refreshChannels],
  );

  const installedIds = useMemo(() => new Set(installed.map(({ id }) => id)), [installed]);
  // This agent's channels in the selected server first, then the rest it could be connected to.
  const isMine = useCallback(
    (channel: DiscordAdminOperation.GuildChannel) =>
      bindings.some(
        ({ discordChannelId, agent: bound }) => discordChannelId === channel.id && entityIdOf(bound) === agent.id,
      ),
    [bindings, agent],
  );
  const connected = useMemo(() => channels.filter(isMine), [channels, isMine]);
  // An archived channel (one filed under an "Archive" category) is not one to connect an agent to.
  const available = useMemo(
    () => channels.filter((channel) => !isMine(channel) && !isArchived(channel)),
    [channels, isMine],
  );
  // The servers the user administers, plus any the bot is in that the user's list does not show (e.g. not signed in).
  const guilds = useMemo(
    () => [...managed, ...installed.filter(({ id }) => !managed.some((guild) => guild.id === id))],
    [managed, installed],
  );

  return (
    <DiscordSetup.Root
      role={role}
      error={error}
      toolbar={
        <DiscordSetup.Toolbar
          attendableId={attendableId}
          signedIn={connection !== undefined}
          busy={busy || !coordinator}
          onConnect={handleConnect}
          onSignOut={handleSignOut}
          onRefresh={handleRefresh}
          consoleUrl={consoleUrl}
        />
      }
    >
      {!applicationId && <Typography.Text tone='muted'>{t('discord-setup-no-bot.message')}</Typography.Text>}

      <Fieldset.Root>
        <Fieldset.Legend>{t('discord-setup-servers.label')}</Fieldset.Legend>
        {guilds.length === 0 ? (
          <Typography.Text tone='muted'>{t('discord-setup-servers-empty.label')}</Typography.Text>
        ) : (
          <DiscordSetup.List
            ids={guilds.map(({ id }) => id)}
            value={guildId}
            onValueChange={(id) => installedIds.has(id) && setGuildId(id)}
          >
            {guilds.map((guild) => {
              const isInstalled = installedIds.has(guild.id);
              return (
                <DiscordSetup.Item
                  key={guild.id}
                  id={guild.id}
                  icon='ph--users-three--regular'
                  label={guild.name}
                  detail={isInstalled ? t('discord-setup-installed.label') : undefined}
                >
                  {applicationId && (
                    <Button.Root
                      variant='ghost'
                      iconOnly
                      // Installing again over an existing install is how a server grants permissions added since.
                      label={t(isInstalled ? 'discord-setup-reinstall.label' : 'discord-setup-install.label')}
                      icon={isInstalled ? 'ph--arrows-clockwise--regular' : 'ph--plus--regular'}
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        // The row selects the server; installing must not also select it.
                        event.stopPropagation();
                        window.open(installUrl(applicationId, guild.id), '_blank', 'noopener');
                      }}
                    />
                  )}
                </DiscordSetup.Item>
              );
            })}
          </DiscordSetup.List>
        )}
      </Fieldset.Root>

      {guildId && (
        <>
          <Fieldset.Root>
            <Fieldset.Legend>{t('discord-setup-connected.label')}</Fieldset.Legend>
            {connected.length === 0 ? (
              <Typography.Text tone='muted'>{t('discord-setup-connected-empty.label')}</Typography.Text>
            ) : (
              <DiscordSetup.List ids={connected.map(({ id }) => id)}>
                {connected.map((channel) => (
                  <DiscordSetup.Item key={channel.id} id={channel.id} icon='ph--hash--regular' label={channel.name}>
                    <Button.Root
                      variant='ghost'
                      iconOnly
                      icon='ph--plugs-connected--regular'
                      label={t('discord-setup-disconnect.label')}
                      disabled={busy}
                      onClick={() => void handleBind(channel, true)}
                    />
                  </DiscordSetup.Item>
                ))}
              </DiscordSetup.List>
            )}
          </Fieldset.Root>

          <Fieldset.Root>
            <Fieldset.Legend>{t('discord-setup-channels.label')}</Fieldset.Legend>
            <DiscordSetup.List ids={available.map(({ id }) => id)}>
              {available.map((channel) => {
                const elsewhere = bindings.some(({ discordChannelId }) => discordChannelId === channel.id);
                return (
                  <DiscordSetup.Item
                    key={channel.id}
                    id={channel.id}
                    icon='ph--hash--regular'
                    label={channel.name}
                    detail={elsewhere ? t('discord-setup-bound-other.label') : undefined}
                  >
                    <Button.Root
                      variant='ghost'
                      iconOnly
                      icon='ph--plugs--regular'
                      label={t('discord-setup-connect-channel.label')}
                      disabled={busy || elsewhere}
                      onClick={() => void handleBind(channel, false)}
                    />
                  </DiscordSetup.Item>
                );
              })}
            </DiscordSetup.List>
          </Fieldset.Root>
        </>
      )}
    </DiscordSetup.Root>
  );
};

DiscordAgentSetup.displayName = 'DiscordAgentSetup';

/** Whether the server files the channel under an archive category. */
const isArchived = ({ category }: DiscordAdminOperation.GuildChannel): boolean =>
  category !== undefined && /archive/i.test(category);

/** The object id an agent ref URI names, whatever its space qualification. */
const entityIdOf = (uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  return eid ? EID.getEntityId(eid) : undefined;
};
