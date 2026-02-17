//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class DuplicateBlockPositionError extends BaseError.extend('DuplicateBlockPositionError') {
  constructor(args: { feedId: string; position: number }) {
    super(`Non-unique block position detected (feedId=${args.feedId} position=${args.position}).`);
  }
}

export class DuplicateBlockLamportTimestampError extends BaseError.extend('DuplicateBlockLamportTimestampError') {
  constructor(args: { feedId: string; actorId: string; sequence: number }) {
    super(
      `Non-unique block Lamport timestamp detected (feedId=${args.feedId} actorId=${args.actorId} sequence=${args.sequence}).`,
    );
  }
}

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
