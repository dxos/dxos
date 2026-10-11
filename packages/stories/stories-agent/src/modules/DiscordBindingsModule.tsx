//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { type Database, Filter, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import * as DiscordAdminOperation from '@dxos/plugin-discord/DiscordAdminOperation';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import { useQuery } from '@dxos/react-client/echo';
import { Section } from '@dxos/react-ui-components';
import { Listbox } from '@dxos/react-ui-list';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/** Bindings change only when someone connects or disconnects a channel, so a slow poll is enough. */
const POLL_MS = 5_000;

type Row = DiscordAdminOperation.ChannelBinding & { name?: string };

/**
 * The Discord channels EDGE routes for the space's bot, as its binding table holds them: each one's name and server,
 * and the Composer channel and agent its messages reach.
 */
export const DiscordBindingsModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const db = space?.db;
  const configs = useQuery(db, Filter.type(DiscordChannel.DiscordChannel));
  const bot = useMemo(() => configs.find(({ applicationId }) => applicationId.length > 0), [configs]);
  const { invokePromise } = AppHooks.useOperationInvoker();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string>();

  const read = useCallback(async () => {
    if (!bot || !space) {
      return;
    }
    const { data, error } = await invokePromise(
      DiscordAdminOperation.ListBindings,
      { applicationId: bot.applicationId },
      { spaceId: space.id },
    );
    if (error || !data) {
      setError(error?.message);
      return;
    }

    // One channel listing per server names every binding in it.
    const guildIds = [...new Set(data.bindings.flatMap(({ guildId }) => (guildId ? [guildId] : [])))];
    const names = new Map<string, string>();
    await Promise.all(
      guildIds.map(async (guildId) => {
        const listed = await invokePromise(
          DiscordAdminOperation.ListGuildChannels,
          { applicationId: bot.applicationId, accessToken: bot.accessToken, guildId },
          { spaceId: space.id },
        );
        listed.data?.channels.forEach(({ id, name }) => names.set(id, name));
      }),
    );
    setError(undefined);
    setRows(data.bindings.map((binding) => ({ ...binding, name: names.get(binding.discordChannelId) })));
  }, [invokePromise, bot, space]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || cancelled) {
        return;
      }
      inFlight = true;
      try {
        await read();
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const interval = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [read]);

  return (
    <Panel.Root data-testid='discord-bindings'>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Connected channels</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport asChild>
            <Layout.Container gap='lg'>
              <Section.Root>
                <Section.Label>EDGE bindings</Section.Label>
                {error ? (
                  <Section.Empty>{error}</Section.Empty>
                ) : rows.length === 0 ? (
                  <Section.Empty>
                    {bot ? 'No Discord channel is connected.' : 'No Discord bot in this space.'}
                  </Section.Empty>
                ) : (
                  <Listbox.Root
                    items={rows.map(({ discordChannelId }) => ({ value: discordChannelId, label: discordChannelId }))}
                  >
                    <Listbox.Content scroll={false}>
                      {rows.map((row) => (
                        <Listbox.Item key={row.discordChannelId} id={row.discordChannelId} classNames='dx-hover'>
                          <Listbox.ItemIcon icon='ph--hash--regular' />
                          <Listbox.ItemText>{row.name ?? row.discordChannelId}</Listbox.ItemText>
                          <Listbox.ItemDescription>{describeRoute(db, row)}</Listbox.ItemDescription>
                        </Listbox.Item>
                      ))}
                    </Listbox.Content>
                  </Listbox.Root>
                )}
              </Section.Root>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

/** Where a binding's messages go, e.g. `→ test-bot · Kai`, by the names of the objects it points at in this space. */
const describeRoute = (db: Database.Database | undefined, { channel, agent }: Row): string => {
  const label = (uri: string) => {
    const eid = EID.tryParse(uri);
    const id = eid && EID.getEntityId(eid);
    const object = id ? db?.getObjectById(id) : undefined;
    return (object && Obj.getLabel(object)) ?? id ?? uri;
  };
  return `→ ${label(channel)} · ${label(agent)}`;
};
