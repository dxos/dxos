//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** Rejects input the agent can correct, e.g. a memory with no subject. */
export class AgentOperationError extends BaseError.extend('AgentOperationError', 'Agent operation failed.') {}

/** EDGE refused or failed a back-index (crawl) request. */
export class CrawlError extends BaseError.extend('CrawlError', 'Brain crawl request failed.') {}
