//
// Copyright 2026 DXOS.org
//

import type * as Op from './Op.ts';

/** An op that does not fit the value it was applied to. */
export class InvalidOpError extends Error {
  constructor(
    readonly op: Op.Any,
    reason: string,
  ) {
    super(`Invalid ${op.type} at ${JSON.stringify(op.path)}: ${reason}`);
  }
}

/** The host cannot produce a document: it is not stored and there is nothing to fetch it from. */
export class DocumentUnavailableError extends Error {
  constructor(readonly documentId: string) {
    super(`Document ${documentId} is unavailable`);
  }
}
