//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Trigger from '@dxos/compute/Trigger';
import * as CrawlState from '@dxos/crawler/CrawlState';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { type Connection } from '@dxos/link';
import { useConfig } from '@dxos/react-client';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Select from '@dxos/react-ui/Select';
import * as Typography from '@dxos/react-ui/Typography';

import { DiscordSetup } from '#components';
import { DiscordAdminOperation, DiscordOperation } from '#types';

import { kaiApplicationId } from '../../constants.ts';
import { DiscordNamespace } from '../../namespace.ts';
import { findBackIndex, toggleChannel } from '../../services/back-index.ts';

/** The permissions Kai asks for when installed in a server it only reads: view channels and read their history. */
const READ_PERMISSIONS = String((1n << 10n) | (1n << 16n));

/** The OAuth link that installs the bot in one guild (Discord's own consent page; no callback). */
const installUrl = (applicationId: string, guildId: string) =>
  `https://discord.com/oauth2/authorize?${new URLSearchParams({
    client_id: applicationId,
    scope: 'bot',
    permissions: READ_PERMISSIONS,
    guild_id: guildId,
    disable_guild_select: 'true',
  }).toString()}`;

/** How far back the first crawl of a channel reads. */
const HISTORY_DAYS = [7, 30, 60, 365];

/** How often the back-index runs. */
const INTERVALS = [
  { value: DiscordOperation.DEFAULT_BACK_INDEX_CRON, label: '2 min' },
  { value: '*/10 * * * *', label: '10 min' },
  { value: '0 * * * *', label: '1 hour' },
];

export type DiscordConnectionSetupProps = {
  /** The person's Discord sign-in, which shows the servers they manage. */
  connection: Connection.Connection;
};

/**
 * The Discord connection's own section: the servers its account manages, installing the bot, letting the space index
 * a server, and the channels whose history goes into the space's memory. Needs no agent: the back-index is the space's.
 */
export const DiscordConnectionSetup = ({ connection }: DiscordConnectionSetupProps) => {
  const { t } = UiHooks.useTranslation(DiscordNamespace.key);
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(connection);
  const spaceId = db?.spaceId;
  const config = useConfig();
  const applicationId = kaiApplicationId(config.values.runtime?.services?.edge?.url);

  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [managed, setManaged] = useState<DiscordAdminOperation.Guild[]>([]);
  const [installed, setInstalled] = useState<DiscordAdminOperation.Guild[]>([]);
  const [indexedGuilds, setIndexedGuilds] = useState<readonly string[]>([]);
  const [guildId, setGuildId] = useState<string>();
  const [channels, setChannels] = useState<DiscordAdminOperation.GuildChannel[]>([]);

  // The space's back-index for this bot and the crawl state its trigger names.
  const triggers = useQuery(db, Filter.type(Trigger.Trigger));
  const backIndex = useMemo(
    () => (applicationId ? findBackIndex(triggers, applicationId) : undefined),
    [triggers, applicationId],
  );
  const [triggerView] = useObject(backIndex?.trigger);
  const stateRef = Ref.isRef(triggerView?.input?.state) ? triggerView?.input?.state : undefined;
  const maxDays = typeof triggerView?.input?.maxDays === 'number' ? triggerView.input.maxDays : undefined;
  const [stateSnapshot] = useObject(stateRef);
  const state = stateSnapshot && Obj.snapshotOf(CrawlState.CrawlState, stateSnapshot) ? stateSnapshot : undefined;
  const crawlState = useQuery(db, Filter.type(CrawlState.CrawlState)).find(({ id }) => id === state?.id);
  const targets = useMemo(
    () => new Map((state ? CrawlState.listTargets(state) : []).map((target) => [target.id, target])),
    [state],
  );
  const indexedChannels = useMemo(() => new Set(backIndex?.channels ?? []), [backIndex]);

  const refreshGuilds = useCallback(async () => {
    if (!spaceId || !applicationId) {
      return;
    }
    const [mine, bot, grants] = await Promise.all([
      invokePromise(DiscordAdminOperation.ListManagedGuilds, { connection: Ref.make(connection) }, { spaceId }),
      invokePromise(DiscordAdminOperation.ListBotGuilds, { applicationId }, { spaceId }),
      invokePromise(DiscordAdminOperation.ListIndexedServers, { applicationId }, { spaceId }),
    ]);
    setError(mine.error?.message ?? bot.error?.message ?? grants.error?.message);
    setManaged([...(mine.data?.guilds ?? [])]);
    setInstalled([...(bot.data?.guilds ?? [])]);
    setIndexedGuilds(grants.data?.guildIds ?? []);
  }, [invokePromise, spaceId, connection, applicationId]);

  useEffect(() => {
    void refreshGuilds();
  }, [refreshGuilds]);

  const refreshChannels = useCallback(async () => {
    if (!spaceId || !applicationId || !guildId || !indexedGuilds.includes(guildId)) {
      setChannels([]);
      return;
    }
    const { data, error } = await invokePromise(
      DiscordAdminOperation.ListGuildChannels,
      { applicationId, guildId },
      { spaceId },
    );
    setError(error?.message);
    setChannels([...(data?.channels ?? [])]);
  }, [invokePromise, spaceId, applicationId, guildId, indexedGuilds]);

  useEffect(() => {
    void refreshChannels();
  }, [refreshChannels]);

  /** Creates or updates the back-index with `changes`; a back-index with no channels is paused, never deleted. */
  const configure = useCallback(
    async (changes: { channels?: readonly string[]; maxDays?: number; cron?: string }) => {
      if (!spaceId || !applicationId) {
        return;
      }
      const next = [...(changes.channels ?? backIndex?.channels ?? [])];
      const { error } = await invokePromise(
        DiscordOperation.ConfigureBackIndex,
        {
          applicationId,
          channels: next,
          ...(changes.maxDays !== undefined ? { maxDays: changes.maxDays } : {}),
          ...(changes.cron !== undefined ? { cron: changes.cron } : {}),
          ...(backIndex ? { trigger: Ref.make(backIndex.trigger) } : { name: t('discord-setup-index-name.label') }),
          connection: Ref.make(connection),
          enabled: next.length > 0,
        },
        { spaceId },
      );
      setError(error?.message);
    },
    [invokePromise, spaceId, applicationId, backIndex, connection, t],
  );

  const handleIndexServer = useCallback(
    async (guild: DiscordAdminOperation.Guild, indexed: boolean) => {
      if (!spaceId || !applicationId) {
        return;
      }
      setBusy(true);
      const { data, error } = await invokePromise(
        DiscordAdminOperation.SetServerIndexed,
        { applicationId, guildId: guild.id, indexed, connection: Ref.make(connection) },
        { spaceId },
      );
      setError(error?.message);
      if (data) {
        setIndexedGuilds(data.guildIds);
        if (indexed) {
          setGuildId(guild.id);
        }
      }
      // A server no longer indexed stops the back-index; its crawl state and the memory it filled are kept.
      if (!indexed && backIndex) {
        Obj.update(backIndex.trigger, (trigger) => {
          trigger.enabled = false;
        });
      }
      setBusy(false);
    },
    [invokePromise, spaceId, applicationId, connection, backIndex],
  );

  const handleIndexChannel = useCallback(
    async (channel: DiscordAdminOperation.GuildChannel) => {
      setBusy(true);
      await configure({ channels: toggleChannel(backIndex?.channels ?? [], channel.id) });
      setBusy(false);
    },
    [configure, backIndex],
  );

  // One run here and now, with the input the trigger runs; the schedule is untouched.
  const handleCheckNow = useCallback(async () => {
    if (!spaceId || !applicationId || !backIndex || !crawlState) {
      return;
    }
    setBusy(true);
    const { error } = await invokePromise(
      DiscordOperation.CrawlDiscordChannels,
      {
        applicationId,
        channels: [...backIndex.channels],
        ...(maxDays !== undefined ? { maxDays } : {}),
        state: Ref.make(crawlState),
      },
      { spaceId },
    );
    setError(error?.message);
    setBusy(false);
  }, [invokePromise, spaceId, applicationId, backIndex, crawlState, maxDays]);

  const handlePause = useCallback(() => {
    if (backIndex) {
      Obj.update(backIndex.trigger, (trigger) => {
        trigger.enabled = !trigger.enabled;
      });
    }
  }, [backIndex]);

  const installedIds = useMemo(() => new Set(installed.map(({ id }) => id)), [installed]);
  const guildIndexed = guildId !== undefined && indexedGuilds.includes(guildId);
  const cron = triggerView?.spec?.kind === 'timer' ? triggerView.spec.cron : DiscordOperation.DEFAULT_BACK_INDEX_CRON;
  const historyItems = HISTORY_DAYS.map((days) => ({
    value: String(days),
    label: t('discord-index-days.label', { count: days }),
  }));

  if (!applicationId) {
    return <Typography.Text tone='muted'>{t('discord-setup-no-bot.message')}</Typography.Text>;
  }

  return (
    <>
      {error && <Typography.Text tone='muted'>{t('discord-index-error.label', { error })}</Typography.Text>}

      <Form.FieldSet label={t('discord-index-servers.label')}>
        {managed.length === 0 ? (
          <Typography.Text tone='muted'>{t('discord-setup-servers-empty.label')}</Typography.Text>
        ) : (
          <DiscordSetup.List
            ids={managed.map(({ id }) => id)}
            value={guildId}
            onValueChange={(id) => indexedGuilds.includes(id) && setGuildId(id)}
          >
            {managed.map((guild) => {
              const isInstalled = installedIds.has(guild.id);
              const isIndexed = indexedGuilds.includes(guild.id);
              return (
                <DiscordSetup.Item
                  key={guild.id}
                  id={guild.id}
                  icon='ph--users-three--regular'
                  label={guild.name}
                  detail={
                    isIndexed
                      ? t('discord-index-server-indexed.label')
                      : isInstalled
                        ? t('discord-setup-installed.label')
                        : undefined
                  }
                >
                  {isInstalled ? (
                    <Button.Root
                      variant='ghost'
                      iconOnly
                      icon={isIndexed ? 'ph--magnifying-glass-minus--regular' : 'ph--magnifying-glass-plus--regular'}
                      label={t(isIndexed ? 'discord-index-server-off.label' : 'discord-index-server-on.label')}
                      disabled={busy}
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        // The row selects the server; the switch must not also select it.
                        event.stopPropagation();
                        void handleIndexServer(guild, !isIndexed);
                      }}
                    />
                  ) : (
                    <Button.Root
                      variant='ghost'
                      iconOnly
                      icon='ph--plus--regular'
                      label={t('discord-setup-install.label')}
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
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
      </Form.FieldSet>

      {guildIndexed && (
        <Form.FieldSet label={t('discord-index-channels.label')}>
          <DiscordSetup.List ids={channels.map(({ id }) => id)}>
            {channels.map((channel) => {
              const isIndexed = indexedChannels.has(channel.id);
              const target = targets.get(channel.id);
              return (
                <DiscordSetup.Item
                  key={channel.id}
                  id={channel.id}
                  icon='ph--hash--regular'
                  label={channel.name}
                  detail={
                    isIndexed
                      ? target?.lastError
                        ? t('discord-index-channel-error.label', { error: target.lastError })
                        : t(`discord-index-channel-${target?.status ?? 'pending'}.label`)
                      : undefined
                  }
                >
                  <Button.Root
                    variant='ghost'
                    iconOnly
                    icon={isIndexed ? 'ph--check-square--regular' : 'ph--square--regular'}
                    label={t(isIndexed ? 'discord-setup-unindex.label' : 'discord-setup-index.label')}
                    disabled={busy}
                    onClick={() => void handleIndexChannel(channel)}
                  />
                </DiscordSetup.Item>
              );
            })}
          </DiscordSetup.List>
        </Form.FieldSet>
      )}

      {backIndex && (
        <Form.FieldSet label={t('discord-index-run.label')}>
          <Form.Field
            standalone
            label={t('discord-index-history.label')}
            description={t('discord-index-history.description')}
          >
            <Select.Root
              items={historyItems}
              value={maxDays !== undefined ? [String(maxDays)] : []}
              onValueChange={({ value: [value] }) => value && void configure({ maxDays: Number(value) })}
            >
              <Select.Trigger placeholder={t('discord-index-history-all.label')} />
              <Select.Content>
                {historyItems.map((item) => (
                  <Select.Item key={item.value} item={item} />
                ))}
              </Select.Content>
            </Select.Root>
          </Form.Field>
          <Form.Field
            standalone
            label={t('discord-index-interval.label')}
            description={t('discord-index-interval.description')}
          >
            <Select.Root
              items={INTERVALS}
              value={[cron]}
              onValueChange={({ value: [value] }) => value && void configure({ cron: value })}
            >
              <Select.Trigger />
              <Select.Content>
                {INTERVALS.map((item) => (
                  <Select.Item key={item.value} item={item} />
                ))}
              </Select.Content>
            </Select.Root>
          </Form.Field>
          <Typography.Text tone='muted'>
            {state?.lastRun
              ? t('discord-index-totals.label', {
                  messages: state.messages,
                  status: state.runStatus,
                  at: new Date(state.lastRun.at).toLocaleTimeString(),
                })
              : t('discord-index-not-run.label')}
          </Typography.Text>
          <Button.Root
            icon={triggerView?.enabled ? 'ph--pause--regular' : 'ph--play--regular'}
            label={t(triggerView?.enabled ? 'discord-index-pause.label' : 'discord-index-resume.label')}
            disabled={busy || indexedChannels.size === 0}
            onClick={handlePause}
          />
          <Button.Root
            icon='ph--arrows-clockwise--regular'
            label={t('discord-index-check-now.label')}
            disabled={busy || indexedChannels.size === 0 || !crawlState}
            onClick={() => void handleCheckNow()}
          />
        </Form.FieldSet>
      )}
    </>
  );
};

DiscordConnectionSetup.displayName = 'DiscordConnectionSetup';
