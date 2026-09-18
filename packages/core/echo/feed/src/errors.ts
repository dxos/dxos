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

export class SyncSpaceDeletedError extends BaseError.extend('SyncSpaceDeletedError') {
  constructor(args: { requestId: string; message: string }) {
    super({
      message: `Feed sync request refused, the server reports the space deleted (requestId=${args.requestId}): ${args.message}`,
      context: args,
    });
  }
}

export class SyncAppendPositionMismatchError extends BaseError.extend('SyncAppendPositionMismatchError') {
  constructor(args: { requestId: string; spaceId: string; feedNamespace: string; blocks: number; positions: number }) {
    super({
      message: `Feed sync AppendResponse carried ${args.positions} positions for ${args.blocks} blocks (spaceId=${args.spaceId} feedNamespace=${args.feedNamespace} requestId=${args.requestId}).`,
      context: args,
    });
  }
}

/** Feed operation failed. The underlying failure, where there is one, is the `cause`. */
export class FeedOperationError extends BaseError.extend('FeedOperationError', 'Feed operation failed.') {}
