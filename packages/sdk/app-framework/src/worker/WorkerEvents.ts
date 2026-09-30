//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Scope from 'effect/Scope';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';

import { type LayerStack } from '@dxos/compute-runtime';
import { Hook } from '@dxos/effect';

import * as ActivationEvent from '../core/activation-event.ts';

/**
 * Fired once when the worker starts, before the layer stack is built: worker plugin modules
 * activate on it, so every `Capabilities.LayerSpec` they contribute is in place when the base
 * collects them.
 */
export const Startup = ActivationEvent.make('org.dxos.app-framework.event.workerStartup');

/**
 * The layer stack has been built and its eager specs initialized. Serial, and awaited before the
 * worker admits a session, so a subscriber can finish opening what the stack hosts first.
 */
export const StackReady = Hook.make<{ readonly stack: LayerStack.LayerStack }>()('app-framework/worker/StackReady', {
  strategy: 'serial',
});

/** A tab connected; its forward port is already attached to the worker's router. */
export const SessionOpened = Hook.make<{
  readonly clientId: string;
  /** The tab that started this worker; exactly one live session is the owner. */
  readonly isOwner: boolean;
  /** Reverse-direction (worker→tab) protocol, for calling services the tab serves. */
  readonly systemProtocol: RpcClient.Protocol['Service'];
  /** The session's lifetime: resources built into it close when the tab goes away. */
  readonly scope: Scope.Scope;
}>()('app-framework/worker/SessionOpened');

/** A tab session closed, whether by the tab, the client, or its liveness lock releasing. */
export const SessionClosed = Hook.make<{ readonly clientId: string; readonly isOwner: boolean }>()(
  'app-framework/worker/SessionClosed',
);
