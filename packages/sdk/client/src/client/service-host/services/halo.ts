//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { KeyType } from '@dxos/credentials';
import { ECHO } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';
import PolkadotKeyring from '@polkadot/keyring';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import assert from 'assert';
import { AddKeyRecordRequest, Contacts, HaloService as IHaloService, SignRequest, SignResponse } from '../../../proto/gen/dxos/client';
import { resultSetToStream } from '../../../util';
import { CreateServicesOpts } from './interfaces';



export class HaloService implements IHaloService {
  constructor (private echo: ECHO) {}

  SubscribeContacts (): Stream<Contacts> {
    if (this.echo.halo.isInitialized) {
      return resultSetToStream(this.echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
    } else {
      return new Stream(({ next }) => {
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

  async AddKeyRecord (request: AddKeyRecordRequest): Promise<void> {
    assert(request.keyRecord && request.keyRecord.publicKey, 'Missing key record.');
    await this.echo.halo.keyring.addKeyRecord(request.keyRecord);
    assert(await this.echo.halo.keyring.getKey(request.keyRecord.publicKey), 'Key not inserted correctly.');
  }

  async Sign (request: SignRequest): Promise<SignResponse> {
    await cryptoWaitReady();

    const key = await this.echo.halo.keyring.getFullKey(request.publicKey);
    assert(key, 'DXNS Key not found.');
    assert(key.type === KeyType.DXNS, 'Only DXNS key signing is supported.');
    assert(key.secretKey, 'Secret key is missing.');

    const keyring = new PolkadotKeyring({ type: 'sr25519' });
    const keypair = keyring.addFromUri(key.secretKey.toString());

    const signature = u8aToHex(keypair.sign(hexToU8a(request.payload), { withType: true }));
    return {
      signed: signature
    };
  }
}

export const createHaloService = ({ echo }: CreateServicesOpts): HaloService => {
  return new HaloService(echo);
};
