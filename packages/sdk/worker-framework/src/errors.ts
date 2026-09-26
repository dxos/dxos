//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * A dedicated or coordinator worker reported a failure through its `error` event.
 */
export class WorkerError extends BaseError.extend('WorkerError', 'Worker failed') {}

/**
 * The tab could not reach a usable worker: leader election, the port exchange, or opening the
 * connection handle failed. Carries the phase it reached in {@link BaseError.context}.
 */
export class WorkerConnectionError extends BaseError.extend('WorkerConnectionError', 'Worker connection failed') {}

/**
 * The leader's worker runs a different build than this tab, so the tab refused its port rather than
 * speak an RPC contract the two builds may not share. Its {@link BaseError.context} carries both builds.
 */
export class WorkerBuildMismatchError extends BaseError.extend(
  'WorkerBuildMismatchError',
  'Worker runs a different app build than this tab',
) {}

/**
 * A worker ignored the cooperative displacement signal for its whole grace period and had to be
 * killed by the tab owning its handle. Raised at error level because a worker that stops servicing
 * its event loop is a fault rather than routine displacement, so it reaches error telemetry; its
 * {@link BaseError.context} carries what triage needs — the storage lock, both worker ids, the
 * grace period that elapsed, and the side that raised it.
 */
export class WorkerTerminationError extends BaseError.extend(
  'WorkerTerminationError',
  'Worker forcefully terminated after ignoring displacement',
) {}

/**
 * A worker ignored displacement and the tab owning it could not kill it, because its handle exposes
 * no termination capability (a bare `MessagePort`: closing it leaves the worker holding both locks).
 * Reported at error level and kept distinct from {@link WorkerTerminationError} because the outcome
 * is the opposite one — the storage lock is still held and the successor will still fail.
 */
export class WorkerNotTerminableError extends BaseError.extend(
  'WorkerNotTerminableError',
  'Wedged worker could not be terminated: its handle cannot be terminated',
) {}
