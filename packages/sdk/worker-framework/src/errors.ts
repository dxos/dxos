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
