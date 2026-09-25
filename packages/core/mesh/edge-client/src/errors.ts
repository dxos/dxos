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
