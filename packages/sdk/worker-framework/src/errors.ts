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

/**
 * Another tab keeps taking the leader lock while staying silent on this tab's coordinator, so the two
 * cannot hand each other a port and each steal only kills the other's worker. The usual cause is two
 * tabs running different app builds: each build's SharedWorker coordinator is a separate instance,
 * while the leader lock is shared by origin. Reloading every tab onto one build is the remedy.
 */
export class WorkerLeaderContentionError extends BaseError.extend(
  'WorkerLeaderContentionError',
  'Another tab keeps taking the worker leader lock but cannot be reached; reload every tab',
) {}

/**
 * The connection stopped because another tab took over (its leader lock was stolen, or a newer build
 * opened). Expected, not a fault: the app was notified first and decides what the tab shows.
 */
export class WorkerStoppedError extends BaseError.extend('WorkerStoppedError', 'Worker connection stopped') {}
