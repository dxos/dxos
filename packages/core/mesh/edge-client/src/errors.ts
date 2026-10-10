import { BaseError } from '@dxos/errors';

//
// Copyright 2024 DXOS.org
//

export class EdgeConnectionClosedError extends Error {
  constructor() {
    super('Edge connection closed.');
  }
}

export class EdgeIdentityChangedError extends Error {
  constructor() {
    super('Edge identity changed.');
  }
}

/** EDGE client operation failed. The underlying failure, where there is one, is the `cause`. */
export class EdgeClientError extends BaseError.extend('EdgeClientError', 'EDGE client operation failed.') {}

/** EDGE refused this SDK as older than the oldest it serves; only reloading the app to a newer build clears it. */
export class ClientTooOldError extends BaseError.extend(
  'ClientTooOldError',
  'This app is too old to sync with EDGE; reload it to update.',
) {}
