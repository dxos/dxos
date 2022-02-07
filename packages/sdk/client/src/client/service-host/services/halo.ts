//
// Copyright 2022 DXOS.org
//

import PolkadotKeyring from '@polkadot/keyring';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import assert from 'assert';

import { Stream } from '@dxos/codec-protobuf';
import { KeyRecord, KeyType } from '@dxos/credentials';
import { ECHO } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { AddKeyRecordRequest, Contacts, HaloService as IHaloService, SignRequest, SignResponse } from '../../../proto/gen/dxos/client';
import { resultSetToStream } from '../../../util';
import { CreateServicesOpts } from './interfaces';

export class HaloService implements IHaloService {
  constructor (private echo: ECHO) {}

  subscribeContacts (): Stream<Contacts> {
    if (this.echo.halo.isInitialized) {
      return resultSetToStream(this.echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
    } else {
      return new Stream(({ next }) => {
        // If profile does not exist, send an empty array.
        if (!this.echo.halo.isInitialized) {
          next({ contacts: [] });
        }

        const subGroup = new SubscriptionGroup();

        setImmediate(async () => {
          await this.echo.halo.identityReady.waitForCondition(() => this.echo.halo.isInitialized);

          const resultSet = this.echo.halo.queryContacts();
          next({ contacts: resultSet.value });
          subGroup.push(resultSet.update.on(() => next({ contacts: resultSet.value })));
        });

        return () => subGroup.unsubscribe();
      });
    }
  }

  async addKeyRecord (request: AddKeyRecordRequest): Promise<void> {
    assert(request.keyRecord && request.keyRecord.publicKey, 'Missing key record.');
    await this.echo.halo.keyring.addKeyRecord(request.keyRecord);
    assert(await this.echo.halo.keyring.getKey(request.keyRecord.publicKey), 'Key not inserted correctly.');
  }

  private async polkadotSign (key: KeyRecord, payload: SignRequest['payload']): Promise<SignResponse> {
    await cryptoWaitReady();

    assert(key.secretKey, 'Secret key is missing.');

    const keyring = new PolkadotKeyring({ type: 'sr25519' });
    const keypair = keyring.addFromUri(key.secretKey.toString());

    const signature = u8aToHex(keypair.sign(hexToU8a(payload), { withType: true }));
    return {
      signed: signature
    };
  }

  async sign (request: SignRequest): Promise<SignResponse> {
    assert(request.publicKey, 'Provide a publicKey of the key that should be used for signing.');
    const key = await this.echo.halo.keyring.getFullKey(request.publicKey);
    assert(key, 'Key not found.');
    if (key.type === KeyType.DXNS) {
      return this.polkadotSign(key, request.payload);
    }
    throw new Error('Only DXNS key signing is supported.');
  }
}

export const createHaloService = ({ echo }: CreateServicesOpts): HaloService => {
  return new HaloService(echo);
};
