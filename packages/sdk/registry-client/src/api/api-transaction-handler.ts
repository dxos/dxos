//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Event, EventRecord } from '@polkadot/types/interfaces/system';
import { ISubmittableResult } from '@polkadot/types/types';

type Tx = SubmittableExtrinsic<'promise', ISubmittableResult>;
export type SignTxFunction = (Tx) => Promise<Tx>;

/**
 * TODO(burdon): Comment.
 */
export class ApiTransactionHandler {
  constructor (
    private api: ApiPromise,
    private signFn: SignTxFunction = tx => tx // By in test environment, no signing is required.
  ) {}

  async sendTransaction (
    transaction: SubmittableExtrinsic<'promise'>,
    signFn: SignTxFunction = this.signFn
  ) : Promise<EventRecord[]> {
    return new Promise((resolve, reject) => {
      if (!signFn) {
        throw new Error('Create or select an account first.');
      }
      setImmediate(async () => {
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
              resolve(events);
            }
          }).catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async sendSudoTransaction (transaction: Tx, sudoSignFn: SignTxFunction):
    Promise<EventRecord[]> {
    const sudoTx = this.api.tx.sudo.sudo(transaction);
    return this.sendTransaction(sudoTx, sudoSignFn);
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
