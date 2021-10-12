//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { Event, EventRecord } from '@polkadot/types/interfaces/system';

export class ApiTransactionHandler {
  constructor (
    private api: ApiPromise,
    private signer: AddressOrPair | undefined
  ) {}

  async sendTransaction (transaction: SubmittableExtrinsic<'promise'>, signer:
    AddressOrPair | undefined = this.signer) : Promise<EventRecord[]> {
    return new Promise((resolve, reject) => {
      if (!signer) {
        throw new Error('Create or select an account first.');
      }
      transaction.signAndSend(signer, ({ events = [], status }) => {
        try {
          this.ensureExtrinsicNotFailed(events);
        } catch (err) {
          reject(err);
        }
        // TODO(marcin): provide ensureTransaction which makes sure the given transaction has been finalized.
        // see: https://github.com/dxos/dot/issues/167
        if (status.isFinalized || status.isInBlock) {
          resolve(events);
        }
      }).catch(reject);
    });
  }

  async sendSudoTransaction (transaction: SubmittableExtrinsic<'promise'>, sudoer: KeyringPair):
    Promise<EventRecord[]> {
    const sudoTx = this.api.tx.sudo.sudo(transaction);
    return this.sendTransaction(sudoTx, sudoer);
  }

  getErrorName (rejectionEvent: Event) : string {
    // Checking if event is fail event
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
