//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import { type Trace, Process, ServiceResolver } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { type Space } from '@dxos/react-client/echo';

import { resolveEphemeralStatusUpdate } from '#execution-graph';

const atomEmpty = Atom.make(() => [] as const);

const ACTIVE_PROCESS_STATES = new Set<Process.State>([Process.State.RUNNING, Process.State.HYBERNATING]);

/** Durable trace lines that represent finished work, not in-flight status. */
export const isTerminalActivityLine = (line: string): boolean =>
  line.endsWith(' - Success') || line.endsWith(' - Error') || line === 'Agent completed request';

const collectDescendantPids = (processes: readonly Process.Info[], rootPid: string): Set<string> => {
  const pids = new Set([rootPid]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const process of processes) {
      const pid = String(process.pid);
      const parentPid = process.parentPid ? String(process.parentPid) : undefined;
      if (parentPid && pids.has(parentPid) && !pids.has(pid)) {
        pids.add(pid);
        expanded = true;
      }
    }
  }
  return pids;
};

const resolveSubscribePids = (agentPid: Process.ID, processes: readonly Process.Info[]): Process.ID[] => {
  const rootPid = String(agentPid);
  const descendants = collectDescendantPids(processes, rootPid);
  const activePids = processes
    .filter((process) => descendants.has(String(process.pid)) && ACTIVE_PROCESS_STATES.has(process.state))
    .map((process) => process.pid);

  if (activePids.length > 0) {
    return activePids;
  }

  return [agentPid];
};

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

/**
 * Subscribes to ephemeral trace events for a delegated sub-agent process subtree
 * and surfaces the latest pending text or tool-call block as a status line.
 */
export const useProcessEphemeralStatus = (
  agentPid: Process.ID | undefined,
  space: Space | undefined,
): string | undefined => {
  // Optional capabilities: the live status is a progressive enhancement, so the component still
  // renders (e.g. in standalone stories) when there is no plugin manager / process runtime.
  const runtime = useOptionalCapability(Capabilities.ProcessManagerRuntime);
  const monitor = useOptionalCapability(Capabilities.ProcessMonitor);
  const processes = useAtomValue(monitor?.processTreeAtom ?? atomEmpty);
  const [status, setStatus] = useState<string | undefined>();
  const fibersRef = useRef<Fiber.RuntimeFiber<void, unknown>[]>([]);

  const subscribePidsKey = useMemo(() => {
    if (!agentPid) {
      return '';
    }
    return resolveSubscribePids(agentPid, processes)
      .map((pid) => String(pid))
      .sort()
      .join('|');
  }, [agentPid, processes]);

  useEffect(() => {
    if (!agentPid || !space?.id || !runtime || !subscribePidsKey) {
      setStatus(undefined);
      return;
    }

    const pids = subscribePidsKey.split('|').map((pid) => Process.ID.make(pid));
    let disposed = false;
    let replaying = true;
    let replayStatus: string | undefined;
    const endReplay = () => {
      replaying = false;
      if (!disposed) {
        setStatus(replayStatus);
      }
    };
    queueMicrotask(endReplay);
    fibersRef.current = [];

    const handleEphemeralMessage = (message: Trace.Message) => {
      const update = resolveEphemeralStatusUpdate(message);
      if (update === 'unchanged') {
        return;
      }

      if (replaying) {
        replayStatus = update.line;
        return;
      }
      setStatus(update.line);
    };

    const layer = ServiceResolver.provide({ space: space.id }, ProcessManager.ProcessManagerService);

    const subscribe = (pid: Process.ID) =>
      Effect.gen(function* () {
        // `attachActiveHandle` polls, so a teardown can land mid-resolve; bail before forking a
        // daemon that the cleanup pass below would never see (and thus never interrupt).
        if (disposed) {
          return;
        }
        const processManager = yield* ProcessManager.ProcessManagerService;
        const handle = yield* attachActiveHandle(processManager, pid);
        if (!handle || disposed) {
          return;
        }

        // `forkDaemon` keeps the stream fiber alive after `runPromise(forEach)` returns;
        // scoped `fork` is interrupted when the subscribe effect's parent scope closes.
        const fiber = yield* handle.subscribeEphemeral().pipe(
          Stream.runForEach((message) =>
            Effect.sync(() => {
              if (disposed) {
                return;
              }
              handleEphemeralMessage(message);
            }),
          ),
          Effect.forkDaemon,
        );
        if (disposed) {
          yield* Fiber.interrupt(fiber);
          return;
        }
        fibersRef.current.push(fiber);
      });

    void runtime
      .runPromise(
        Effect.forEach(pids, subscribe, { concurrency: 'unbounded', discard: true }).pipe(Effect.provide(layer)),
      )
      .catch(() => {
        if (!disposed) {
          setStatus(undefined);
        }
      });

    return () => {
      disposed = true;
      const fibers = fibersRef.current;
      fibersRef.current = [];
      for (const fiber of fibers) {
        void runtime.runPromise(Fiber.interrupt(fiber).pipe(Effect.provide(layer)));
      }
    };
  }, [agentPid, runtime, space?.id, subscribePidsKey]);

  return status;
};
