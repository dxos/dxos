//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { MemoryWorkerCoordiantor } from '@dxos/worker-framework/coordinator';

import { CounterConnection } from './counter-connection';

const isInterruptedError = (err: unknown): boolean =>
  err instanceof Error && (err.message.includes('Fiber was interrupted') || err.message.includes('Interrupted'));

const useCounterConnection = (connection: CounterConnection) => {
  const [ready, setReady] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => Promise<void>) | undefined;

    void (async () => {
      try {
        await connection.open();
        if (cancelled) {
          return;
        }
        setReady(true);
        unsubscribe = connection.subscribe((value) => {
          if (!cancelled) {
            setCount(value);
          }
        });
      } catch (err) {
        if (!cancelled && !isInterruptedError(err)) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
      setReady(false);
      void unsubscribe?.();
    };
  }, [connection]);

  const increment = useCallback(async () => {
    try {
      await connection.increment();
    } catch (err) {
      if (!isInterruptedError(err)) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  }, [connection]);

  return { count, ready, error, increment };
};

type CounterPanelProps = {
  label: string;
  connection: CounterConnection;
};

const CounterPanel = ({ label, connection }: CounterPanelProps) => {
  const { count, ready, error, increment } = useCounterConnection(connection);

  return (
    <div className='flex flex-col gap-3 rounded-lg border border-separator p-4 min-w-[12rem]'>
      <div className='text-sm font-medium text-subdued'>{label}</div>
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
  const coordinator = useMemo(() => new MemoryWorkerCoordiantor(), []);
  const connection = useMemo(() => new CounterConnection({ coordinator }), [coordinator]);

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
        MessagePort.
      </p>
      <CounterPanel label='Client' connection={connection} />
    </div>
  );
};

const TwoClientsStory = () => {
  const coordinator = useMemo(() => new MemoryWorkerCoordiantor(), []);
  const connectionA = useMemo(() => new CounterConnection({ coordinator }), [coordinator]);
  const connectionB = useMemo(() => new CounterConnection({ coordinator }), [coordinator]);

  useEffect(
    () => () => {
      void Promise.all([connectionA.close(), connectionB.close()]);
    },
    [connectionA, connectionB],
  );

  return (
    <div className='p-6'>
      <p className='mb-4 max-w-lg text-sm text-subdued'>
        Two clients share one in-memory coordinator and one dedicated worker. Incrementing from either panel updates
        both subscriptions.
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
