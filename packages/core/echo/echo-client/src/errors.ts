//
// Copyright 2026 DXOS.org
//

import { BaseError, type BaseErrorOptions } from '@dxos/errors';

/** ECHO client operation failed. The underlying failure, where there is one, is the `cause`. */
export class EchoClientError extends BaseError.extend('EchoClientError', 'ECHO client operation failed.') {}

/**
 * The host reported that it cannot produce a document: it holds no bytes for the id and has no
 * source to fetch them from. Distinct from a slow load — nothing is in flight, so waiting longer
 * cannot help.
 */
export class DocumentUnavailableError extends BaseError.extend(
  'DocumentUnavailableError',
  'Document is not available on this data plane.',
) {
  constructor(context: { documentId: string }, options?: BaseErrorOptions) {
    super({ context, ...options });
  }
}

/**
 * The repo proxy is no longer able to reach the host: the client is closing or has closed, so the
 * document can never be produced. Expected during teardown — work started while the proxy was open
 * routinely lands after it, and callers that can abandon quietly should.
 */
export class RepoClosedError extends BaseError.extend(
  'RepoClosedError',
  'Repo proxy is closed; the client is going away.',
) {
  constructor(context: { spaceId: string; documentId?: string }, options?: BaseErrorOptions) {
    super({ context, ...options });
  }
}
