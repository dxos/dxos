//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

export class SyncRpcTimeoutError extends BaseError.extend('SyncRpcTimeoutError') {
  constructor(args: { requestId: string; spaceId: string; feedNamespace: string; rpcTag: string; timeoutMs: number }) {
    super({
      message: `Feed sync ${args.rpcTag} timed out after ${args.timeoutMs}ms (spaceId=${args.spaceId} feedNamespace=${args.feedNamespace} requestId=${args.requestId}).`,
      context: args,
    });
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
    super({
      message: `Block already has position ${args.currentPosition}, cannot set to ${args.requestedPosition} (feedId=${args.feedId} actorId=${args.actorId} sequence=${args.sequence}).`,
      context: args,
    });
  }
}
