//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import type * as Surface from '@dxos/app-framework/Surface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter, Ref } from '@dxos/echo';
import { LogEntry, LogLevel } from '@dxos/log';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { useQuery } from '@dxos/react-client/echo';
import { LogBuffer, Logger } from '@dxos/react-ui-debug';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { Channel } from '@dxos/types';

/** Faster than the properties panel's 5 s, so a gateway's connecting -> ready step is caught. */
const POLL_MS = 2_000;

/** How many transitions the timeline keeps. */
const MAX_ENTRIES = 200;

/** Fed only by the poll below, so the column shows bot transitions rather than the app's `@dxos/log` stream. */
const monitorBuffer = new LogBuffer();

type Entry = {
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

const level = ({ status, error }: Entry): LogLevel =>
  error ? LogLevel.WARN : status?.error ? LogLevel.ERROR : LogLevel.INFO;

/**
 * A timeline of the space's Discord bot status as EDGE reports it: one row each time the gateway state,
 * thread count or error changes, so a reconnect or a watchdog retry stays visible after it recovers.
 */
export const DiscordBotModule = (_props: Surface.ComponentProps<Record<string, unknown>>) => {
  const space = Hooks.useActiveSpace();
  const channels = useQuery(space?.db, Filter.type(Channel.Channel));
  const channel = channels.find(({ backend }) => backend.kind === DiscordChannel.BACKEND_KIND);
  const { invokePromise } = AppHooks.useOperationInvoker();
  const lastRef = useRef<string>(undefined);

  // The buffer outlives the module, so each mount starts its own timeline.
  useEffect(() => {
    lastRef.current = undefined;
    monitorBuffer.clear();
  }, []);

  const read = useCallback(async (): Promise<Entry | undefined> => {
    if (!channel || !space) {
      return undefined;
    }

    const { data, error } = await invokePromise(
      ThreadOperation.GetChannelStatus,
      { channel: Ref.make(channel) },
      { spaceId: space.id },
    );
    return { status: data?.status, error: error?.message };
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
        const message = entry && describe(entry);
        if (entry && message && !cancelled && message !== lastRef.current) {
          lastRef.current = message;
          monitorBuffer.append(new LogEntry({ level: level(entry), message }));
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
    <Logger.Root buffer={monitorBuffer} maxLines={MAX_ENTRIES}>
      <Panel.Root data-testid='discord-bot-monitor'>
        <Panel.Header>
          <Toolbar.Root>
            <Toolbar.Text>Discord bot</Toolbar.Text>
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body asChild>
          <Logger.Content>
            {channel ? (
              <Logger.List checkable={false} />
            ) : (
              <Status.Empty>No Discord channel in this space.</Status.Empty>
            )}
          </Logger.Content>
        </Panel.Body>
      </Panel.Root>
    </Logger.Root>
  );
};
