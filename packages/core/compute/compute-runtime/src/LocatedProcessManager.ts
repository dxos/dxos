//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Process from '@dxos/compute/Process';
import type { SpaceId } from '@dxos/keys';

import * as ProcessManager from './ProcessManager.ts';
import * as RemoteProcessManager from './RemoteProcessManager.ts';

/**
 * {@link Process.Manager} over this runtime's {@link ProcessManager.Manager} and the
 * {@link RemoteProcessManager.Manager} for EDGE, choosing one per call by {@link Process.Location}.
 */
export const make = (local: ProcessManager.Manager, remote: RemoteProcessManager.Manager): Process.Manager => {
  const requireSpace = (space: SpaceId | undefined): SpaceId => {
    if (!space) {
      throw new Error('Process requested on edge without a space.');
    }
    return space;
  };

  // A noop or monitor-only remote manager lacks the control verbs; failing here names the cause
  // instead of silently running the process locally.
  const requireControl = <K extends 'spawn' | 'list' | 'attach'>(
    verb: K,
  ): NonNullable<RemoteProcessManager.Manager[K]> => {
    const fn = remote[verb];
    if (!fn) {
      throw new Error('Process requested on edge, but RemoteProcessManager offers no process control.');
    }
    return fn;
  };

  return {
    spawn: (definition, options) =>
      options?.location !== 'edge'
        ? local.spawn(definition, options)
        : Effect.suspend(() =>
            requireControl('spawn')({
              ...options,
              spaceId: requireSpace(options.environment?.space),
              key: definition.key,
              definition,
            }),
          ),

    list: (options) =>
      options?.location !== 'edge'
        ? local.list(options)
        : Effect.suspend(() => requireControl('list')({ ...options, spaceId: requireSpace(options.space) })),

    attach: (pid, options) =>
      options?.location !== 'edge'
        ? local.attach(pid)
        : Effect.suspend(() => requireControl('attach')({ spaceId: requireSpace(options.space), pid })),
  };
};

/**
 * Provides {@link Process.ManagerService}; a host without EDGE satisfies the remote requirement with
 * {@link RemoteProcessManager.layerNoop}, so `edge` requests die rather than run locally.
 */
export const layer: Layer.Layer<Process.ManagerService, never, ProcessManager.Service | RemoteProcessManager.Service> =
  Layer.effect(
    Process.ManagerService,
    Effect.gen(function* () {
      return make(yield* ProcessManager.Service, yield* RemoteProcessManager.Service);
    }),
  );
