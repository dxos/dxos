//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';

/** The connection is missing the atproto handle/account needed to address a repo. */
export class MissingHandleError extends Data.TaggedError('MissingHandleError')<{ message?: string }> {}

/** Edge services are not configured, so the authenticated proxy path is unavailable. */
export class EdgeNotConfiguredError extends Data.TaggedError('EdgeNotConfiguredError')<{ message?: string }> {}

/** The connection's PDS endpoint could not be resolved from its handle/DID. */
export class PdsResolutionError extends Data.TaggedError('PdsResolutionError')<{ message?: string; cause?: unknown }> {}

/** A repo write/delete (putRecord/deleteRecord) failed. */
export class AtprotoRepoError extends Data.TaggedError('AtprotoRepoError')<{ message: string; cause?: unknown }> {}

/** The object's type carries no atproto record annotation, so it cannot be published. */
export class NotPublishableError extends Data.TaggedError('NotPublishableError')<{ message?: string }> {}
