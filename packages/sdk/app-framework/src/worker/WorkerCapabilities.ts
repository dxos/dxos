//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import { type Config } from '@dxos/config';
import { type Hook } from '@dxos/effect';
import { type RpcRouter } from '@dxos/rpc';

import * as Capability from '../core/capability.ts';

/** What the base worker hands its plugin modules. */
export interface HostService {
  /** The config the tab initialized the worker with. */
  readonly config: Config;
  /** The worker's hook bus; provide it as `Hook.Controller` to subscribe or emit. */
  readonly hooks: Hook.ControllerService;
  /** Serves RPC groups to every tab session, current and future. */
  readonly router: RpcRouter.Service;
  /** Asks the worker to terminate, as when a reset has finished. */
  readonly requestShutdown: Effect.Effect<void>;
  /** Tears down the layer stack ahead of the worker, as a reset does before wiping storage. */
  readonly closeStack: Effect.Effect<void>;
}

/** Contributed by the base worker before any plugin module activates. */
export const Host = Capability.makeSingleton<HostService>()('org.dxos.app-framework.capability.workerHost');
