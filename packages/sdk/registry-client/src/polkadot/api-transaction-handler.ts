//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';
import { Address } from '@polkadot/types/interfaces';
import { Event, EventRecord } from '@polkadot/types/interfaces/system';
import { ISubmittableResult } from '@polkadot/types/types';

import { MaybePromise } from '@dxos/util';

type Tx = SubmittableExtrinsic<'promise', ISubmittableResult>;
export type SignTxFunction = (tx: Tx) => MaybePromise<Tx>;

interface SendTransactionResult {
  events: EventRecord[]
  signer: Address
}

/**
 * TODO(burdon): Comment.
 */
export class ApiTransactionHandler {
  private signFn: SignTxFunction;

  constructor (
    private api: ApiPromise,
    _signFn: SignTxFunction | AddressOrPair = tx => tx // By in test environment, no signing is required.
  ) {
    if (typeof _signFn === 'function') {
      this.signFn = _signFn;
    } else {
      this.signFn = async (tx: Tx) => tx.signAsync(_signFn);
    }
  }

  async sendTransaction (
    transaction: SubmittableExtrinsic<'promise'>,
    signFn: SignTxFunction = this.signFn
  ) : Promise<SendTransactionResult> {
    return new Promise((resolve, reject) => {
      if (!signFn) {
        throw new Error('Create or select an account first.');
      }
      setTimeout(async () => {
        try {
          const signedTransaction = await signFn(transaction);
          signedTransaction.send(({ events = [], status }) => {
            try {
              this.ensureExtrinsicNotFailed(events);
            } catch (err: any) {
              reject(err);
            }
            // TODO(marcin): Provide ensureTransaction which makes sure the given transaction has been finalized.
            // https://github.com/dxos/dot/issues/167
            if (status.isFinalized || status.isInBlock) {
              resolve({
                events,
                signer: signedTransaction.signer
              });
            }
          }).catch(reject);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async sendSudoTransaction (transaction: Tx, sudoSignFn: SignTxFunction | AddressOrPair):
    Promise<SendTransactionResult> {
    const sudoTx = this.api.tx.sudo.sudo(transaction);
    const signFn = typeof sudoSignFn === 'function' ? sudoSignFn : (tx: Tx) => tx.signAsync(sudoSignFn);
    return this.sendTransaction(sudoTx, signFn);
  }

  getErrorName (rejectionEvent: Event) : string {
    // Checking if event is fail event.
    if (this.api.events.system.ExtrinsicFailed.is(rejectionEvent)) {
      const rejectionType = rejectionEvent.data[0];
      if (rejectionType.isBadOrigin) {
        return 'Bad Origin';
      }
      if (!rejectionType.isModule) {
        return 'Unknown error';
      }
      const dispatchErrorModule = rejectionType.asModule;
      // Traversing all errors defined in registry module to find the one that fits to event.
      for (const errorType of Object.keys(this.api.errors.registry)) {
        if (this.api.errors.registry[errorType].is(dispatchErrorModule)) {
          return this.api.errors.registry[errorType].meta.name.toString();
        }
      }
    }

    return 'Unknown error';
  }

  ensureExtrinsicNotFailed (events : EventRecord[]) {
    const rejectionEvent = events.map(e => e.event).find(this.api.events.system.ExtrinsicFailed.is);
    if (rejectionEvent) {
      throw new Error(this.getErrorName(rejectionEvent));
    }
  }
}
