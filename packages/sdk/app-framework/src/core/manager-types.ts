//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';

import { BaseError } from '@dxos/errors';

//
// Types and errors shared between the plugin manager's collaborating units (module loader,
// activation scheduler, catalog). Canonical public access stays on the `PluginManager`
// namespace, which re-exports everything here.
//

/**
 * Tagged error for failures during the constructor-launched core/enabled
 * `enable()` chain. Surfaces via the manager's `activate` wait on
 * initialization so a caller blocked on initialization gets a typed
 * failure (with the original error preserved as `cause`) instead of an
 * untyped `Error`.
 */
export class PluginInitializationError extends BaseError.extend(
  'PluginInitializationError',
  'Plugin manager initialization failed',
) {}

/**
 * Tagged error raised when a plugin exceeds its configured load or activation
 * timeout. The plugin manager records the failure on the `failed` atom and
 * auto-disables the plugin so that one stuck remote does not stall app boot.
 * `context.id` is the plugin id, `context.phase` is `'load'` or `'activation'`.
 */
export class PluginTimeoutError extends BaseError.extend('PluginTimeoutError', 'Plugin operation timed out') {}

/** Phase of the plugin lifecycle in which the failure was observed. */
export type PluginFailurePhase = 'load' | 'activation';

/** Why the plugin entered a failed state. */
export type PluginFailureReason = 'timeout' | 'error';

/**
 * Record of a plugin that failed to load or activate. Surfaced via the
 * manager's `failed` atom so registry / UI consumers can flag unhealthy
 * plugins (e.g. a remote host that has gone offline) rather than leaving the
 * app in a half-broken state.
 */
export type PluginFailure = {
  readonly id: string;
  readonly phase: PluginFailurePhase;
  readonly reason: PluginFailureReason;
  readonly error: Error;
  /** `Date.now()` when the failure was recorded. */
  readonly timestamp: number;
};

/** Default deadline for resolving a lazy plugin's dynamic import. */
export const DEFAULT_LOAD_TIMEOUT = Duration.seconds(30);

/** Default deadline for a single module's `activate()` body. */
export const DEFAULT_ACTIVATION_TIMEOUT = Duration.seconds(30);

export type ActivationMessage = {
  event: string;
  state: 'activating' | 'activated' | 'error';
  /** Module ID when the message pertains to a specific module activation. */
  module?: string;
  error?: Error;
};
