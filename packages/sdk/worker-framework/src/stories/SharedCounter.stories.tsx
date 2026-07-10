//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { CounterConnection, type CounterSessionInfo } from './counter-connection';

const isInterruptedError = (err: unknown): boolean =>
  err instanceof Error && (err.message.includes('Fiber was interrupted') || err.message.includes('Interrupted'));

const shortId = (id: string): string => id.split('-').slice(-2).join('-');

type ConnectionStatus = {
  ready: boolean;
  count: number;
  error: string | undefined;
  session: CounterSessionInfo | undefined;
  reconnectCount: number;
};

const useCounterConnection = (connection: CounterConnection): ConnectionStatus & { increment: () => Promise<void> } => {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const [session, setSession] = useState<CounterSessionInfo | undefined>();
  const [reconnectCount, setReconnectCount] = useState(0);
  const unsubscribeRef = useRef<(() => Promise<void>) | undefined>(undefined);

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
    });

    return () => {
      cancelled = true;
      setReady(false);
      unsubscribeSession();
      unsubscribeReconnect();
      void unsubscribeRef.current?.();
    };
  }, [connection, startSubscription]);

  const increment = useCallback(async () => {
    try {
      await connection.increment();
    } catch (err) {
      if (!isInterruptedError(err)) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [connection]);

  return { count, ready, error, session, reconnectCount, increment };
};

type CounterPanelProps = {
  label: string;
  connection: CounterConnection;
};

const SessionMeta = ({ session, reconnectCount }: { session: CounterSessionInfo | undefined; reconnectCount: number }) => {
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
          <span className='rounded bg-warning/15 px-1.5 py-0.5 font-medium text-warning'>Reconnected ×{reconnectCount}</span>
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

const CounterPanel = ({ label, connection }: CounterPanelProps) => {
  const { count, ready, error, session, reconnectCount, increment } = useCounterConnection(connection);

  return (
    <div className='flex flex-col gap-3 rounded-lg border border-separator p-4 min-w-[14rem]'>
      <div className='text-sm font-medium text-subdued'>{label}</div>
      <SessionMeta session={session} reconnectCount={reconnectCount} />
      <div className='text-3xl font-semibold tabular-nums'>{ready ? count : '…'}</div>
      <button
        type='button'
        className='rounded-md bg-primary px-3 py-2 text-sm font-medium text-primaryContrast disabled:opacity-50'
        disabled={!ready}
        onClick={() => void increment()}
      >
        Increment
      </button>
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
      <p className='mb-4 max-w-lg text-sm text-subdued'>
        Dedicated worker holds a shared counter. The client connects through leader election and effect-rpc over the app
        MessagePort. After a worker restart or leader changeover, the subscription is re-established automatically.
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
      <p className='mb-4 max-w-lg text-sm text-subdued'>
        Two clients share one SharedWorker coordinator and one dedicated worker. The tab that spawned the worker is the
        owner; the other is a guest. Incrementing from either panel updates both subscriptions.
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
