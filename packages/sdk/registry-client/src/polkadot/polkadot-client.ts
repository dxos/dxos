//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { AddressOrPair } from '@polkadot/api/types';

import {
  ApiTransactionHandler,
  SignTxFunction
} from './api-transaction-handler';

/**
 * Base functionality for derived clients.
 */
export class PolkadotClient {
  protected transactionsHandler: ApiTransactionHandler;

  constructor(
    protected api: ApiPromise,
    signFn: SignTxFunction | AddressOrPair = (tx) => tx
  ) {
    this.transactionsHandler = new ApiTransactionHandler(api, signFn);
  }
}
