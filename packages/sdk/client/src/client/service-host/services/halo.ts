//
// Copyright 2022 DXOS.org
//

import PolkadotKeyring from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import assert from 'assert';

import { Stream } from '@dxos/codec-protobuf';
import { KeyRecord, KeyType } from '@dxos/credentials';
import { ECHO } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { SubscriptionGroup } from '@dxos/util';

import {
  AddKeyRecordRequest,
  Contacts,
  HaloService as IHaloService,
  SignRequest,
  SignResponse,
  SetGlobalPreferenceRequest,
  GetGlobalPreferenceRequest,
  GetGlobalPreferenceResponse
} from '../../../proto/gen/dxos/client';
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

  private async polkadotSign (key: KeyRecord, payload: Uint8Array): Promise<SignResponse> {
    await cryptoWaitReady();

    assert(key.secretKey, 'Secret key is missing.');

    const keyring = new PolkadotKeyring({ type: 'sr25519' });
    const keypair = keyring.addFromUri(key.secretKey.toString());

    return {
      signed: keypair.sign(payload, { withType: true })
    };
  }

  async sign (request: SignRequest): Promise<SignResponse> {
    assert(request.publicKey, 'Provide a publicKey of the key that should be used for signing.');
    const key = await this.echo.halo.keyring.getFullKey(request.publicKey);
    assert(key, 'Key not found.');
    if (key.type === KeyType.DXNS_ADDRESS) {
      assert(request.payload, 'No payload to sign.');
      return this.polkadotSign(key, request.payload);
    }
    throw new Error('Only DXNS Address key signing is supported.');
  }

  async setGlobalPreference (request: SetGlobalPreferenceRequest): Promise<void> {
    assert(request.key, 'Missing key of property.');
    const preferences: ObjectModel | undefined = this.echo.halo.identity.preferences?.getGlobalPreferences()?.model;
    assert(preferences, 'Preferences failed to load.');
    await preferences.setProperty(request.key, request.value);
  }

  async getGlobalPreference (request: GetGlobalPreferenceRequest): Promise<GetGlobalPreferenceResponse> {
    assert(request.key, 'Missing key of property.');
    const preferences: ObjectModel | undefined = this.echo.halo.identity.preferences?.getGlobalPreferences()?.model;
    return preferences?.getProperty(request.key);
  }
}

export const createHaloService = ({ echo }: CreateServicesOpts): HaloService => {
  return new HaloService(echo);
};
