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
