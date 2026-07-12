//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import {
  CounterConnection,
  type CounterSessionInfo,
  type PingMeasurement,
} from './counter-connection';
import { type TimingStatsSnapshot } from './counter-service';

const PING_INTERVAL_MS = 1_000;
const DEFAULT_BLOCK_MS = 500;

const isInterruptedError = (err: unknown): boolean =>
  err instanceof Error && (err.message.includes('Fiber was interrupted') || err.message.includes('Interrupted'));

const shortId = (id: string): string => id.split('-').slice(-2).join('-');

const formatMs = (value: number | undefined): string =>
  value === undefined ? '—' : `${Math.round(value)} ms`;

type ConnectionStatus = {
  ready: boolean;
  count: number;
  error: string | undefined;
  session: CounterSessionInfo | undefined;
  reconnectCount: number;
  ping: PingMeasurement | undefined;
  timingStats: TimingStatsSnapshot | undefined;
  blocking: boolean;
};

const useCounterConnection = (
  connection: CounterConnection,
): ConnectionStatus & {
  increment: () => Promise<void>;
  blockCpu: (durationMs: number) => Promise<void>;
} => {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [session, setSession] = useState<CounterSessionInfo | undefined>();
  const [reconnectCount, setReconnectCount] = useState(0);
  const [ping, setPing] = useState<PingMeasurement | undefined>();
  const [timingStats, setTimingStats] = useState<TimingStatsSnapshot | undefined>();
  const [blocking, setBlocking] = useState(false);
  const unsubscribeRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const refreshTimingStats = useCallback(async () => {
    try {
      setTimingStats(await connection.getTimingStats());
    } catch (err) {
      if (!isInterruptedError(err)) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [connection]);

  const runPing = useCallback(async () => {
    try {
      const measurement = await connection.ping();
      setPing(measurement);
      await refreshTimingStats();
    } catch (err) {
      if (!isInterruptedError(err)) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [connection, refreshTimingStats]);

  const startSubscription = useCallback(async () => {
    await unsubscribeRef.current?.();
    unsubscribeRef.current = connection.subscribe((value) => setCount(value));
  }, [connection]);

  useEffect(() => {
    let cancelled = false;

    const onSessionChanged = (info: CounterSessionInfo) => {
      if (!cancelled) {
        setSession(info);
      }
    };
    const unsubscribeSession = connection.sessionChanged.on(onSessionChanged);
    if (connection.sessionInfo) {
      setSession(connection.sessionInfo);
    }

    void (async () => {
      try {
        await connection.open();
        if (cancelled) {
          return;
        }
        setReady(true);
        await startSubscription();
        await runPing();
      } catch (err) {
        if (!cancelled && !isInterruptedError(err)) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    const unsubscribeReconnect = connection.reconnected.on(async () => {
      if (cancelled) {
        return;
      }
      setReconnectCount((value) => value + 1);
      await startSubscription();
      await runPing();
    });

    return () => {
      cancelled = true;
      setReady(false);
      unsubscribeSession();
      unsubscribeReconnect();
      void unsubscribeRef.current?.();
    };
  }, [connection, runPing, startSubscription]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const interval = setInterval(() => {
      void runPing();
    }, PING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ready, runPing]);

  const increment = useCallback(async () => {
    try {
      await connection.increment();
      await refreshTimingStats();
    } catch (err) {
      if (!isInterruptedError(err)) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [connection, refreshTimingStats]);

  const blockCpu = useCallback(
    async (durationMs: number) => {
      setBlocking(true);
      try {
        await connection.blockCpu(durationMs);
        await runPing();
      } catch (err) {
        if (!isInterruptedError(err)) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        setBlocking(false);
      }
    },
    [connection, runPing],
  );

  return { count, ready, error, session, reconnectCount, ping, timingStats, blocking, increment, blockCpu };
};

type CounterPanelProps = {
  label: string;
  connection: CounterConnection;
};

const SessionMeta = ({
  session,
  reconnectCount,
}: {
  session: CounterSessionInfo | undefined;
  reconnectCount: number;
}) => {
  if (!session) {
    return <div className='text-xs text-subdued'>Connecting…</div>;
  }

  return (
    <div className='flex flex-col gap-1 text-xs text-subdued'>
      <div className='flex flex-wrap items-center gap-2'>
        <span
          className={`rounded px-1.5 py-0.5 font-medium ${session.isOwner ? 'bg-primary/15 text-primary' : 'bg-separator text-subdued'}`}
        >
          {session.isOwner ? 'Owner' : 'Guest'}
        </span>
        {reconnectCount > 0 && (
          <span className='rounded bg-warning/15 px-1.5 py-0.5 font-medium text-warning'>
            Reconnected ×{reconnectCount}
          </span>
        )}
      </div>
      <div>
        Worker: <span className='font-mono text-foreground'>{shortId(session.leaderId)}</span>
      </div>
      <div>
        Client: <span className='font-mono text-foreground'>{shortId(session.clientId)}</span>
      </div>
    </div>
  );
};

const LatencyPanel = ({ ping, ready }: { ping: PingMeasurement | undefined; ready: boolean }) => (
  <div className='rounded-md border border-separator p-3'>
    <div className='mb-2 text-xs font-medium uppercase tracking-wide text-subdued'>Ping (auto {PING_INTERVAL_MS}ms)</div>
    <dl className='grid grid-cols-3 gap-2 text-sm'>
      <div>
        <dt className='text-subdued'>RTT</dt>
        <dd className='font-mono tabular-nums text-lg font-semibold'>{ready ? formatMs(ping?.rttMs) : '…'}</dd>
      </div>
      <div>
        <dt className='text-subdued'>Queue</dt>
        <dd className='font-mono tabular-nums'>{ready ? formatMs(ping?.queueWaitMs) : '…'}</dd>
      </div>
      <div>
        <dt className='text-subdued'>Service</dt>
        <dd className='font-mono tabular-nums'>{ready ? formatMs(ping?.serviceMs) : '…'}</dd>
      </div>
    </dl>
  </div>
);

const TimingStatsPanel = ({ stats }: { stats: TimingStatsSnapshot | undefined }) => {
  const recent = stats?.samples.slice(-8).reverse() ?? [];

  return (
    <div className='rounded-md border border-separator p-3'>
      <div className='mb-2 flex items-baseline justify-between gap-2'>
        <div className='text-xs font-medium uppercase tracking-wide text-subdued'>RPC timing stats</div>
        <div className='text-xs text-subdued'>
          max queue {formatMs(stats?.maxQueueWaitMs)} · max service {formatMs(stats?.maxServiceMs)}
        </div>
      </div>
      {recent.length === 0 ? (
        <div className='text-xs text-subdued'>No samples yet.</div>
      ) : (
        <ul className='flex flex-col gap-1 text-xs'>
          {recent.map((sample, index) => (
            <li key={`${sample.at}-${sample.tag}-${index}`} className='flex justify-between gap-2 font-mono'>
              <span className='truncate text-subdued'>{sample.tag}</span>
              <span className='shrink-0 tabular-nums'>
                q={formatMs(sample.queueWaitMs)} s={formatMs(sample.serviceMs)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const BlockWorkerPanel = ({
  ready,
  blocking,
  onBlock,
}: {
  ready: boolean;
  blocking: boolean;
  onBlock: (durationMs: number) => Promise<void>;
}) => {
  const [durationMs, setDurationMs] = useState(String(DEFAULT_BLOCK_MS));

  return (
    <div className='rounded-md border border-separator p-3'>
      <div className='mb-2 text-xs font-medium uppercase tracking-wide text-subdued'>Block worker thread</div>
      <p className='mb-3 text-xs text-subdued'>
        Spins the worker event loop synchronously. Watch ping RTT and queue wait rise while blocked.
      </p>
      <div className='flex items-center gap-2'>
        <input
          type='number'
          min={50}
          step={50}
          className='w-24 rounded border border-separator bg-transparent px-2 py-1.5 text-sm tabular-nums'
          value={durationMs}
          onChange={(event) => setDurationMs(event.target.value)}
          disabled={!ready || blocking}
        />
        <span className='text-xs text-subdued'>ms</span>
        <button
          type='button'
          className='rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructiveContrast disabled:opacity-50'
          disabled={!ready || blocking}
          onClick={() => {
            const parsed = Number(durationMs);
            if (Number.isFinite(parsed) && parsed > 0) {
              void onBlock(parsed);
            }
          }}
        >
          {blocking ? 'Blocking…' : 'Block'}
        </button>
      </div>
    </div>
  );
};

const CounterPanel = ({ label, connection }: CounterPanelProps) => {
  const {
    count,
    ready,
    error,
    session,
    reconnectCount,
    ping,
    timingStats,
    blocking,
    increment,
    blockCpu,
  } = useCounterConnection(connection);

  return (
    <div className='flex w-full max-w-md flex-col gap-3 rounded-lg border border-separator p-4'>
      <div className='text-sm font-medium text-subdued'>{label}</div>
      <SessionMeta session={session} reconnectCount={reconnectCount} />
      <LatencyPanel ping={ping} ready={ready} />
      <TimingStatsPanel stats={timingStats} />
      <div className='text-3xl font-semibold tabular-nums'>{ready ? count : '…'}</div>
      <button
        type='button'
        className='rounded-md bg-primary px-3 py-2 text-sm font-medium text-primaryContrast disabled:opacity-50'
        disabled={!ready}
        onClick={() => void increment()}
      >
        Increment
      </button>
      <BlockWorkerPanel ready={ready} blocking={blocking} onBlock={blockCpu} />
      {error && <div className='text-xs text-error'>{error}</div>}
    </div>
  );
};

const SingleClientStory = () => {
  const connection = useMemo(() => new CounterConnection(), []);

  useEffect(
    () => () => {
      void connection.close();
    },
    [connection],
  );

  return (
    <div className='p-6'>
      <p className='mb-4 max-w-2xl text-sm text-subdued'>
        Dedicated worker holds a shared counter and exposes observability RPCs. Ping runs automatically every second;
        RPC timing middleware records queue wait and service time on the worker. Use Block to simulate event-loop
        starvation and watch latency spike.
      </p>
      <CounterPanel label='Client' connection={connection} />
    </div>
  );
};

const TwoClientsStory = () => {
  const connectionA = useMemo(() => new CounterConnection(), []);
  const connectionB = useMemo(() => new CounterConnection(), []);

  useEffect(
    () => () => {
      void Promise.all([connectionA.close(), connectionB.close()]);
    },
    [connectionA, connectionB],
  );

  return (
    <div className='p-6'>
      <p className='mb-4 max-w-2xl text-sm text-subdued'>
        Two clients share one SharedWorker coordinator and one dedicated worker. Each panel runs its own ping loop and
        shows per-client RTT; timing stats reflect all RPCs handled by the shared worker.
      </p>
      <div className='flex flex-wrap gap-4'>
        <CounterPanel label='Client A' connection={connectionA} />
        <CounterPanel label='Client B' connection={connectionB} />
      </div>
    </div>
  );
};

const meta: Meta = {
  title: 'sdk/worker-framework/SharedCounter',
  decorators: [withTheme(), withLayout({ layout: 'default' })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <SingleClientStory />,
};

export const TwoClients: Story = {
  render: () => <TwoClientsStory />,
};
