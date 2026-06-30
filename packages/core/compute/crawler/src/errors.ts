//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A fault while fetching from a source (channel listing, message page). */
export class CrawlError extends BaseError.extend('CrawlError', 'Crawl error') {}

/** A fault inside a pipeline stage; isolated per target so siblings continue. */
export class StageError extends BaseError.extend('StageError', 'Stage error') {}

/** A fault reading or writing crawl state (frontier, cursors, agents). */
export class StateError extends BaseError.extend('StateError', 'State error') {}
