//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';

export class ChessComRequestError extends Data.TaggedError('ChessComRequestError')<{
  url: string;
  status?: number;
  cause?: unknown;
}> {}

export class ChessComNotFoundError extends Data.TaggedError('ChessComNotFoundError')<{
  url: string;
}> {}
