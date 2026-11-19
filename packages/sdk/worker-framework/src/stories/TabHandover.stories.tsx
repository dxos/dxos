//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import type * as Client from '@dxos/worker-framework/Client';

import { CounterConnection } from './counter-connection.ts';

// Each card is one browser tab: its own `Client.Connection`, sharing the page's Web Locks and
// BroadcastChannels with the others exactly as real tabs share an origin's.

// Its own lock, so this story never contends with the SharedCounter stories open in another frame.
const LEADER_LOCK_KEY = 'worker-framework-tab-handover-leader';

// Short, so a stalled leader is noticed in seconds rather than the production 15s.
const LEADER_TIMEOUTS: Client.LeaderTimeouts = { heartbeatInterval: 500, staleTimeout: 1_500, portTimeout: 3_000 };

const BUILDS: Record<Build, Client.Generation> = {
  v1: { id: 'v1', time: 1 },
  v2: { id: 'v2', time: 2 },
};

type Build = 'v1' | 'v2';

type TabSpec = {
  id: number;
  build: Build;
  /** A coordinator no other tab uses: this tab cannot hear the leader, so it reads as unresponsive. */
  unreachable: boolean;
};

type PausedReason = 'unresponsive' | 'stolen' | 'superseded';

type TabState =
  | { kind: 'connecting' }
  | { kind: 'connected'; isOwner: boolean }
  | { kind: 'paused'; reason: PausedReason; otherBuild?: Build }
  | { kind: 'error'; message: string };

const REASON_LABELS: Record<PausedReason, string> = {
  unresponsive: 'Take over from an unresponsive tab',
  stolen: 'Taken over by another tab',
  superseded: 'Different versions open',
};

/** One open of a tab: a fresh connection, and whether it takes over as it opens. */
type Instance = { build: Build; takeover: boolean; serial: number };

const useTab = (spec: TabSpec, instance: Instance) => {
  const [state, setState] = useState<TabState>({ kind: 'connecting' });
  const [count, setCount] = useState<number>();
  const pausedRef = useRef(false);

  const connection = useMemo(() => {
    const pause = (reason: PausedReason, otherBuild?: Build) => {
      pausedRef.current = true;
      setState({ kind: 'paused', reason, otherBuild });
    };
    return new CounterConnection({
      leaderLockKey: LEADER_LOCK_KEY,
      leaderTimeouts: LEADER_TIMEOUTS,
      // Builds never share a coordinator, as in production, where its URL carries the build hash.
      coordinatorName: spec.unreachable
        ? `worker-framework-tab-handover-${instance.build}-tab-${spec.id}`
        : `worker-framework-tab-handover-${instance.build}`,
      generation: BUILDS[instance.build],
      takeover: instance.takeover,
      onTakeoverRequired: () => pause('unresponsive'),
      onLockStolen: () => pause('stolen'),
      onSuperseded: (newer) => pause('superseded', newer.id === 'v2' ? 'v2' : 'v1'),
    });
  }, [spec, instance]);

  useEffect(() => {
    let cancelled = false;
    pausedRef.current = false;
    setState({ kind: 'connecting' });
    setCount(undefined);
    let unsubscribe: (() => Promise<void>) | undefined;
    const startCounter = () => {
      void unsubscribe?.();
      unsubscribe = connection.subscribe((value) => {
        if (!cancelled) {
          setCount(value);
        }
      });
    };
    const offSession = connection.sessionChanged.on(({ isOwner }) => {
      if (!cancelled && !pausedRef.current) {
        setState({ kind: 'connected', isOwner });
      }
    });
    const offReconnect = connection.reconnected.on(() => {
      if (!cancelled && !pausedRef.current) {
        startCounter();
      }
    });
    void connection.open().then(
      () => {
        if (!cancelled && !pausedRef.current) {
          startCounter();
        }
      },
      (err: unknown) => {
        // A paused tab's open() rejects by design; the card already says why.
        if (!cancelled && !pausedRef.current) {
          setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      },
    );
    return () => {
      cancelled = true;
      offSession();
      offReconnect();
      void unsubscribe?.();
      void connection.close();
    };
  }, [connection]);

  const increment = useCallback(() => void connection.increment().catch(() => {}), [connection]);
  return { state, count, increment };
};

const TabCard = ({ spec, onClose }: { spec: TabSpec; onClose: () => void }) => {
  const [instance, setInstance] = useState<Instance>({ build: spec.build, takeover: false, serial: 0 });
  const { state, count, increment } = useTab(spec, instance);

  // Continuing reopens the tab with `takeover`, as Composer reloads into the app from its paused page;
  // a tab left on an older build reloads into the newer one.
  const continueHere = () =>
    setInstance((current) => ({
      build: state.kind === 'paused' && state.otherBuild ? state.otherBuild : current.build,
      takeover: true,
      serial: current.serial + 1,
    }));

  const testId = `tab-${spec.id}`;
  return (
    <div data-testid={testId} className='flex min-h-72 w-80 flex-col gap-4 rounded-lg border border-separator p-5'>
      <div className='flex items-center justify-between text-base'>
        <span className='font-medium'>Tab {spec.id}</span>
        <span className='text-fg-subtle'>
          build {instance.build}
          {spec.unreachable ? ' · unreachable' : ''}
        </span>
      </div>

      {state.kind === 'paused' ? (
        <div data-testid={`${testId}-paused`} className='flex flex-col items-center gap-3 py-2 text-center'>
          <div className='text-lg font-medium'>Another instance of the app is open</div>
          <button
            type='button'
            data-testid={`${testId}-continue`}
            className='rounded-md border border-separator px-4 py-2'
            onClick={continueHere}
          >
            Continue here
          </button>
          <details className='w-full text-left text-sm text-fg-subtle'>
            <summary className='cursor-pointer'>Details</summary>
            <dl className='mt-1 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1'>
              <dt>Reason</dt>
              <dd data-testid={`${testId}-reason`}>{REASON_LABELS[state.reason]}</dd>
              <dt>This version</dt>
              <dd>{instance.build}</dd>
              {state.otherBuild && (
                <>
                  <dt>Other version</dt>
                  <dd>{state.otherBuild}</dd>
                </>
              )}
            </dl>
          </details>
        </div>
      ) : (
        <>
          <div data-testid={`${testId}-status`}>
            {state.kind === 'connecting' && 'Connecting…'}
            {state.kind === 'connected' && (state.isOwner ? 'Leader: runs the worker' : 'Follower: uses the leader')}
            {state.kind === 'error' && <span className='text-error-text'>{state.message}</span>}
          </div>
          <div data-testid={`${testId}-count`} className='text-5xl font-semibold tabular-nums'>
            {count ?? '…'}
          </div>
          <button
            type='button'
            data-testid={`${testId}-increment`}
            className='rounded-md bg-accent-bg px-3 py-2 font-medium text-accent-fg disabled:opacity-50'
            disabled={state.kind !== 'connected'}
            onClick={increment}
          >
            Increment
          </button>
        </>
      )}

      <button type='button' className='mt-auto self-end text-sm text-fg-subtle' onClick={onClose}>
        Close tab
      </button>
    </div>
  );
};

const TabHandoverStory = ({ initial }: { initial: Omit<TabSpec, 'id'>[] }) => {
  const nextId = useRef(initial.length + 1);
  const [tabs, setTabs] = useState<TabSpec[]>(() => initial.map((spec, index) => ({ ...spec, id: index + 1 })));
  // New tabs load the latest build, as a reload does after a deploy.
  const [latestBuild, setLatestBuild] = useState<Build>(() =>
    initial.some((spec) => spec.build === 'v2') ? 'v2' : 'v1',
  );
  const open = (spec: Omit<TabSpec, 'id'>) => {
    // Read and bumped outside the updater, which strict mode runs twice; written out because the build
    // compiles `nextId.current++` to increment before the read.
    const id = nextId.current;
    nextId.current = id + 1;
    setTabs((current) => [...current, { ...spec, id }]);
  };

  return (
    <div className='flex flex-col items-center gap-6 p-8'>
      <p className='max-w-3xl text-center text-fg-subtle'>
        Each card is a browser tab. One tab leads and runs the worker; the others use it. Tabs never take the worker
        from each other on their own: a tab on an older build pauses when a newer build opens, a tab that cannot reach
        the leader asks before taking over, and a tab whose worker was taken pauses until you continue there.
      </p>
      <div className='flex flex-wrap justify-center gap-2'>
        <button
          type='button'
          data-testid='open-tab'
          className='rounded-md border border-separator px-3 py-2 disabled:opacity-50'
          onClick={() => open({ build: latestBuild, unreachable: false })}
        >
          Open tab
        </button>
        <button
          type='button'
          data-testid='open-newer-tab'
          className='rounded-md border border-separator px-3 py-2 disabled:opacity-50'
          disabled={latestBuild === 'v2'}
          onClick={() => {
            setLatestBuild('v2');
            open({ build: 'v2', unreachable: false });
          }}
        >
          Open tab on a newer build
        </button>
        <button
          type='button'
          data-testid='open-unreachable-tab'
          className='rounded-md border border-separator px-3 py-2 disabled:opacity-50'
          onClick={() => open({ build: latestBuild, unreachable: true })}
        >
          Open tab that cannot reach the leader
        </button>
      </div>
      <div className='flex flex-wrap justify-center gap-4'>
        {tabs.map((spec) => (
          <TabCard
            key={spec.id}
            spec={spec}
            onClose={() => setTabs((current) => current.filter((tab) => tab.id !== spec.id))}
          />
        ))}
      </div>
    </div>
  );
};

const meta: Meta<typeof TabHandoverStory> = {
  title: 'sdk/worker-framework/TabHandover',
  render: (args) => <TabHandoverStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'default' })],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Start with one tab and open more from the toolbar. */
export const Default: Story = {
  args: { initial: [{ build: 'v1', unreachable: false }] },
};

/** Two tabs on one build share the worker; neither pauses. */
export const SameBuild: Story = {
  args: {
    initial: [
      { build: 'v1', unreachable: false },
      { build: 'v1', unreachable: false },
    ],
  },
};

/** A newer build opens next to an older one, and the older tab pauses. */
export const NewerBuild: Story = {
  args: {
    initial: [
      { build: 'v1', unreachable: false },
      { build: 'v2', unreachable: false },
    ],
  },
};

/** A tab that cannot reach the leader asks before taking over; continuing there pauses the leader. */
export const UnresponsiveLeader: Story = {
  args: {
    initial: [
      { build: 'v1', unreachable: false },
      { build: 'v1', unreachable: true },
    ],
  },
};
