//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/ui';
import { Process, ServiceResolver, Trace } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Card, Panel, ScrollArea, Tag, Toolbar } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';

import { type ModuleProps } from './types';

const atomEmpty = Atom.make(() => [] as const);

const ACTIVE_PROCESS_STATES = new Set<Process.State>([Process.State.RUNNING, Process.State.HYBERNATING]);

type EphemeralFeed = {
  count: number;
  lastEvent: Trace.MessageData | undefined;
  subscribed: boolean;
};

const serializeTraceMessage = (message: Trace.Message): Trace.MessageData => ({
  meta: message.meta,
  isEphemeral: message.isEphemeral,
  events: message.events,
});

const attachActiveHandle = (
  processManager: ProcessManager.Manager,
  pid: Process.ID,
): Effect.Effect<ProcessManager.Handle<any, any, never> | undefined> =>
  Effect.gen(function* () {
    const maxAttempts = 15;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const handle = yield* processManager.attach(pid).pipe(Effect.catchAll(() => Effect.succeed(undefined)));
      if (handle && ACTIVE_PROCESS_STATES.has(handle.status.state)) {
        return handle;
      }
      if (handle) {
        return undefined;
      }
      yield* Effect.sleep(100);
    }
    return undefined;
  });

const useEphemeralFeedsByPid = (
  spaceId: string | undefined,
  activeProcesses: readonly Process.Info[],
): Record<string, EphemeralFeed> => {
  const runtime = useCapability(Capabilities.ProcessManagerRuntime);
  const [feeds, setFeeds] = useState<Record<string, EphemeralFeed>>({});
  const fibersRef = useRef<Map<string, Fiber.RuntimeFiber<void, unknown>>>(new Map());

  const activePidsKey = useMemo(
    () =>
      activeProcesses
        .filter((process) => ACTIVE_PROCESS_STATES.has(process.state))
        .map((process) => String(process.pid))
        .sort()
        .join('|'),
    [activeProcesses],
  );

  useEffect(() => {
    if (!spaceId || !runtime || !activePidsKey) {
      setFeeds({});
      return;
    }

    const pids = activePidsKey.split('|').map((pid) => Process.ID.make(pid));
    let disposed = false;
    const layer = ServiceResolver.provide({ space: SpaceId.make(spaceId) }, ProcessManager.ProcessManagerService);

    const updateFeed = (pid: string, message: Trace.Message) => {
      if (disposed) {
        return;
      }
      log.info('ephemeral debug: message received', {
        pid,
        messagePid: message.meta.pid,
        eventTypes: message.events.map((event) => event.type),
        isEphemeral: message.isEphemeral,
      });
      setFeeds((previous) => {
        const current = previous[pid] ?? { count: 0, lastEvent: undefined, subscribed: true };
        return {
          ...previous,
          [pid]: {
            count: current.count + 1,
            lastEvent: serializeTraceMessage(message),
            subscribed: true,
          },
        };
      });
    };

    log.info('ephemeral debug: subscribe start', { spaceId, activePidsKey });

    const subscribe = (pid: Process.ID) =>
      Effect.gen(function* () {
        const processManager = yield* ProcessManager.ProcessManagerService;
        const handle = yield* attachActiveHandle(processManager, pid);
        const pidKey = String(pid);
        if (!handle) {
          log.info('ephemeral debug: attach failed', { pid: pidKey });
          setFeeds((previous) => ({
            ...previous,
            [pidKey]: {
              count: previous[pidKey]?.count ?? 0,
              lastEvent: previous[pidKey]?.lastEvent,
              subscribed: false,
            },
          }));
          return;
        }

        log.info('ephemeral debug: attach ok', { pid: pidKey, state: handle.status.state });

        setFeeds((previous) => ({
          ...previous,
          [pidKey]: {
            count: previous[pidKey]?.count ?? 0,
            lastEvent: previous[pidKey]?.lastEvent,
            subscribed: true,
          },
        }));

        // `forkDaemon` keeps the stream fiber alive after `runPromise(forEach)` returns.
        const fiber = yield* handle.subscribeEphemeral().pipe(
          Stream.runForEach((message) =>
            Effect.sync(() => {
              updateFeed(pidKey, message);
            }),
          ),
          Effect.forkDaemon,
        );
        fibersRef.current.set(pidKey, fiber);
      });

    void runtime
      .runPromise(
        Effect.forEach(pids, subscribe, { concurrency: 'unbounded', discard: true }).pipe(Effect.provide(layer)),
      )
      .catch(() => {
        if (!disposed) {
          setFeeds({});
        }
      });

    return () => {
      disposed = true;
      log.info('ephemeral debug: subscribe dispose', { activePidsKey });
      const fibers = [...fibersRef.current.values()];
      fibersRef.current.clear();
      for (const fiber of fibers) {
        void runtime.runPromise(Fiber.interrupt(fiber).pipe(Effect.provide(layer)));
      }
    };
  }, [spaceId, runtime, activePidsKey]);

  return feeds;
};

/**
 * Temporary debug panel: lists active processes and per-pid ephemeral trace subscriptions.
 */
export const EphemeralDebugModule = ({ space }: ModuleProps) => {
  const monitor = useCapability(Capabilities.ProcessMonitor);
  const processes = useAtomValue(monitor?.processTreeAtom ?? atomEmpty);

  const activeProcesses = useMemo(
    () => processes.filter((process) => ACTIVE_PROCESS_STATES.has(process.state)),
    [processes],
  );

  const feedsByPid = useEphemeralFeedsByPid(space?.id, activeProcesses);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Ephemeral debug ({activeProcesses.length} active)</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <ScrollArea.Root classNames='h-full'>
          <ScrollArea.Viewport>
            <div className='flex flex-col gap-3 p-2 w-full min-w-0'>
              {activeProcesses.length === 0 && (
                <span className='text-sm text-description px-1'>No active processes.</span>
              )}
              {activeProcesses.map((process) => (
                <ProcessEphemeralCard
                  key={String(process.pid)}
                  process={process}
                  feed={feedsByPid[String(process.pid)]}
                />
              ))}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

type ProcessEphemeralCardProps = {
  process: Process.Info;
  feed: EphemeralFeed | undefined;
};

const ProcessEphemeralCard = ({ process, feed }: ProcessEphemeralCardProps) => {
  const label = process.params.name ?? String(process.pid);
  const count = feed?.count ?? 0;
  const subscribed = feed?.subscribed ?? false;
  const lastEvent = feed?.lastEvent;

  return (
    <Card.Root>
      <Card.Header>
        <div className='flex flex-wrap items-center gap-2 min-w-0 w-full'>
          <Card.Title classNames='truncate'>{label}</Card.Title>
          <Tag palette={subscribed ? 'success' : 'warning'}>{subscribed ? 'subscribed' : 'no attach'}</Tag>
          <Tag palette='info'>{process.state}</Tag>
          <Tag palette='neutral'>{count} events</Tag>
        </div>
      </Card.Header>
      <Card.Body classNames='w-full'>
        <Card.Row fullWidth classNames='w-full min-h-96 max-h-[32rem]'>
          <Syntax.Root data={lastEvent ?? { note: 'no ephemeral events yet' }}>
            <Syntax.Content>
              <Syntax.Viewport>
                <Syntax.Code classNames='text-xs' />
              </Syntax.Viewport>
            </Syntax.Content>
          </Syntax.Root>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};
