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
import { useCapability } from '@dxos/app-framework/ui';
import { Process, ServiceResolver } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { type Space } from '@dxos/react-client/echo';

import {
  resolveEphemeralStatusUpdate,
} from '#execution-graph';

// #region DEBUG
import { log } from '@dxos/log';
// #endregion DEBUG

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
): Effect.Effect<ProcessManager.Handle<any, any> | undefined> =>
  Effect.gen(function* () {
    const maxAttempts = 15;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const handle = yield* processManager.attach(pid).pipe(
        Effect.catchAll((error) => {
          // #region DEBUG
          log('[DEBUG H3] ephemeral attach failed', { pid: String(pid), attempt, error: String(error) });
          // #endregion DEBUG
          return Effect.succeed(undefined);
        }),
      );
      if (handle && ACTIVE_PROCESS_STATES.has(handle.status.state)) {
        // #region DEBUG
        log('[DEBUG H3] ephemeral attach ok', { pid: String(pid), state: handle.status.state, attempt });
        // #endregion DEBUG
        return handle;
      }
      if (handle) {
        // #region DEBUG
        log('[DEBUG H3] ephemeral attach inactive', { pid: String(pid), state: handle.status.state, attempt });
        // #endregion DEBUG
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
  const runtime = useCapability(Capabilities.ProcessManagerRuntime);
  const monitor = useCapability(Capabilities.ProcessMonitor);
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
      // #region DEBUG
      log('[DEBUG H1] ephemeral subscribe skipped', {
        agentPid: agentPid ? String(agentPid) : undefined,
        spaceId: space?.id,
        hasRuntime: runtime != null,
        subscribePidsKey,
      });
      // #endregion DEBUG
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

      const nextStatus = update === 'clear' ? undefined : update.line;

      if (update === 'clear') {
        // #region DEBUG
        log('[DEBUG H5] ephemeral partial completed', { pid: message.meta.pid });
        // #endregion DEBUG
      } else {
        // #region DEBUG
        log('[DEBUG H4] ephemeral pending status', {
          pid: message.meta.pid,
          line: nextStatus,
          eventTypes: message.events.map((event) => event.type),
        });
        // #endregion DEBUG
      }

      if (replaying) {
        replayStatus = nextStatus;
        return;
      }
      setStatus(nextStatus);
    };

    // #region DEBUG
    log('[DEBUG H2] ephemeral subscribe start', { agentPid: String(agentPid), pids: subscribePidsKey });
    // #endregion DEBUG

    const layer = ServiceResolver.provide({ space: space.id }, ProcessManager.ProcessManagerService);

    const subscribe = (pid: Process.ID) =>
      Effect.gen(function* () {
        const processManager = yield* ProcessManager.ProcessManagerService;
        const handle = yield* attachActiveHandle(processManager, pid);
        if (!handle) {
          return;
        }

        const fiber = yield* handle.subscribeEphemeral().pipe(
          Stream.runForEach((message) =>
            Effect.sync(() => {
              if (disposed) {
                return;
              }
              handleEphemeralMessage(message);
            }),
          ),
          Effect.fork,
        );
        fibersRef.current.push(fiber);
      });

    void runtime
      .runPromise(Effect.forEach(pids, subscribe, { concurrency: 'unbounded', discard: true }).pipe(Effect.provide(layer)))
      .catch((error) => {
        // #region DEBUG
        log('[DEBUG H2] ephemeral subscribe failed', { error: String(error) });
        // #endregion DEBUG
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
