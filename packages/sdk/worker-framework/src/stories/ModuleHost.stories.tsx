//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ModuleHostConnection } from './module-host-connection.ts';
import { type ModuleInfo } from './module-host-service.ts';
import geometryUrl from './modules/geometry.ts?module-url';
import mathUrl from './modules/math.ts?module-url';
import textUrl from './modules/text.ts?module-url';

const DEFAULT_BLOB_SOURCE = `export const module = {
  name: 'blob',
  methods: {
    double: (value) => value * 2,
    now: () => new Date().toISOString(),
  },
};`;

const toBlobUrl = (source: string): string => URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const ModulePanel = ({ connection, info }: { connection: ModuleHostConnection; info: ModuleInfo }) => {
  const [args, setArgs] = useState('[]');
  const [result, setResult] = useState<string>();

  const handleInvoke = useCallback(
    async (method: string) => {
      const name = info.name;
      if (name === undefined) {
        return;
      }
      try {
        const parsed: unknown = JSON.parse(args);
        const value = await connection.invoke(name, method, ...(Array.isArray(parsed) ? parsed : [parsed]));
        setResult(`${method} → ${JSON.stringify(value)}`);
      } catch (err) {
        setResult(`${method} ✗ ${errorMessage(err)}`);
      }
    },
    [connection, info, args],
  );

  return (
    <div className='flex flex-col gap-2 rounded-md border border-separator p-3'>
      <div className='flex items-baseline justify-between gap-2'>
        <span className='font-medium'>{info.name ?? 'failed to load'}</span>
        <span className='truncate font-mono text-xs text-subdued' title={info.url}>
          {info.url}
        </span>
      </div>
      {info.error ? (
        <div className='text-xs text-error-text'>{info.error}</div>
      ) : (
        <>
          <input
            className='rounded border border-separator bg-transparent px-2 py-1 font-mono text-sm'
            value={args}
            onChange={(event) => setArgs(event.target.value)}
            aria-label='JSON args'
          />
          <div className='flex flex-wrap gap-2'>
            {info.methods.map((method) => (
              <button
                key={method}
                type='button'
                className='rounded-md bg-accent-bg px-2 py-1 text-sm text-accent-fg'
                onClick={() => void handleInvoke(method)}
              >
                {method}
              </button>
            ))}
          </div>
          {result && <div className='font-mono text-xs'>{result}</div>}
        </>
      )}
    </div>
  );
};

type Session = { connection: ModuleHostConnection; blobUrl: string };

const ModuleHostStory = () => {
  const [blobSource, setBlobSource] = useState(DEFAULT_BLOB_SOURCE);
  const [session, setSession] = useState<Session>();
  const [modules, setModules] = useState<readonly ModuleInfo[]>([]);
  const [error, setError] = useState<string>();

  // The module list is init config, fixed for the worker's lifetime, so a new list means a new worker.
  const handleStart = useCallback(async () => {
    setError(undefined);
    setModules([]);
    // Close first: opening while the old worker lives would join it as a follower with its old modules.
    await session?.connection.close();
    const blobUrl = toBlobUrl(blobSource);
    const connection = new ModuleHostConnection({ moduleUrls: [mathUrl, textUrl, geometryUrl, blobUrl] });
    setSession({ connection, blobUrl });
    try {
      await connection.open();
      setModules(await connection.listModules());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [session, blobSource]);

  // The blob URL outlives the first import: a failover re-creates the worker, which imports it again.
  useEffect(
    () => () => {
      if (session) {
        void session.connection.close().finally(() => URL.revokeObjectURL(session.blobUrl));
      }
    },
    [session],
  );

  return (
    <div className='flex max-w-2xl flex-col gap-4 p-6'>
      <p className='text-sm text-subdued'>
        The tab passes module URLs in the worker&apos;s init config; the worker <code>import()</code>s each one and
        routes <code>invoke</code> RPCs to its exported methods. <code>math</code>, <code>text</code> and{' '}
        <code>geometry</code> are TS modules compiled by Vite and resolved via <code>?module-url</code>;{' '}
        <code>blob</code> is plain JS loaded from a blob URL of the source below.
      </p>
      <textarea
        className='h-40 rounded border border-separator bg-transparent p-2 font-mono text-xs'
        value={blobSource}
        onChange={(event) => setBlobSource(event.target.value)}
        aria-label='Blob module source'
      />
      <button
        type='button'
        className='self-start rounded-md bg-accent-bg px-3 py-2 text-sm font-medium text-accent-fg'
        onClick={() => void handleStart()}
      >
        {session ? 'Restart worker' : 'Start worker'}
      </button>
      {error && <div className='text-xs text-error-text'>{error}</div>}
      {session && modules.map((info) => <ModulePanel key={info.url} connection={session.connection} info={info} />)}
    </div>
  );
};

const meta: Meta = {
  title: 'sdk/worker-framework/ModuleHost',
  decorators: [withTheme(), withLayout({ layout: 'default' })],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <ModuleHostStory />,
};
