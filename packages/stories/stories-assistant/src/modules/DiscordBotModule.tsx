//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter, Ref } from '@dxos/echo';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { useQuery } from '@dxos/react-client/echo';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Channel } from '@dxos/types';

/** Faster than the properties panel's 5 s, so a gateway's connecting → ready step is caught. */
const POLL_MS = 2_000;

/** How many transitions the timeline keeps. */
const MAX_ENTRIES = 200;

type Entry = {
  at: Date;
  /** `running`, `state`, `detail` and `error` of the status read, or the failure to read it. */
  status?: ThreadOperation.ConnectionStatus;
  error?: string;
};

const describe = ({ status, error }: Entry): string =>
  error
    ? `unreachable: ${error}`
    : [
        status?.running ? 'running' : 'stopped',
        status?.state,
        status?.detail,
        status?.error && `error: ${status.error}`,
      ]
        .filter(Boolean)
        .join(' · ');

/**
 * A timeline of the space's Discord bot status as EDGE reports it: one row each time the gateway state,
 * thread count or error changes, so a reconnect or a watchdog retry stays visible after it recovers.
 */
export const DiscordBotModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const channels = useQuery(space?.db, Filter.type(Channel.Channel));
  const channel = channels.find(({ backend }) => backend.kind === DiscordChannel.BACKEND_KIND);
  const { invokePromise } = AppHooks.useOperationInvoker();
  const [entries, setEntries] = useState<Entry[]>([]);

  const read = useCallback(async (): Promise<Entry | undefined> => {
    if (!channel || !space) {
      return undefined;
    }

    const { data, error } = await invokePromise(
      ThreadOperation.GetChannelStatus,
      { channel: Ref.make(channel) },
      { spaceId: space.id },
    );
    return { at: new Date(), status: data?.status, error: error?.message };
  }, [invokePromise, channel, space]);

  useEffect(() => {
    // One read at a time, and none applied after unmount: a slow EDGE would otherwise stack reads and land them out of order.
    let cancelled = false;
    let inFlight = false;
    const poll = async () => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      try {
        const entry = await read();
        if (entry && !cancelled) {
          setEntries((entries) => {
            const last = entries.at(-1);
            return last && describe(last) === describe(entry) ? entries : [...entries, entry].slice(-MAX_ENTRIES);
          });
        }
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
    <Panel.Root data-testid='discord-bot-monitor'>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Discord bot</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport asChild>
            <Layout.Container>
              {!channel && <p className='text-description'>No Discord channel in this space.</p>}
              <ol className='flex flex-col gap-1 text-sm'>
                {entries.map((entry, index) => (
                  <li key={index} data-testid='discord-bot-monitor-entry' className='flex gap-2'>
                    <time className='text-description tabular-nums'>{entry.at.toLocaleTimeString()}</time>
                    <span>{describe(entry)}</span>
                  </li>
                ))}
              </ol>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
