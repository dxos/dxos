//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class PositionConflictError extends BaseError.extend('PositionConflictError') {
  constructor(args: {
    feedId?: string;
    actorId: string;
    sequence: number;
    currentPosition: number;
    requestedPosition: number | null;
  }) {
    super(
      `Block already has position ${args.currentPosition}, cannot set to ${args.requestedPosition} (feedId=${args.feedId} actorId=${args.actorId} sequence=${args.sequence}).`,
    );
  }
}
