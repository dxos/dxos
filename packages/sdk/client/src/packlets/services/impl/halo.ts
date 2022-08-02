//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import {
  AddKeyRecordRequest,
  Contacts,
  HaloService as IHaloService,
  SignRequest,
  SignResponse,
  SetPreferenceRequest,
  GetPreferenceRequest,
  GetPreferenceResponse
} from '@dxos/client-protocol';
import { Stream } from '@dxos/codec-protobuf';
import { ECHO, resultSetToStream } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { SubscriptionGroup } from '@dxos/util';

import { CreateServicesOpts, HaloSigner } from './types';

/**
 * HALO service implementation.
 */
export class HaloService implements IHaloService {
  constructor (
    private readonly echo: ECHO,
    private readonly signer?: HaloSigner
  ) {}

  // TODO(burdon): Rename signMessage? (in interface).
  // TODO(burdon): Why is this part of the interface? (Can it be factored out completely?)
  async sign (request: SignRequest): Promise<SignResponse> {
    assert(this.signer, 'Signer not set.');
    assert(request.publicKey, 'Provide a publicKey of the key that should be used for signing.');
    const key = await this.echo.halo.keyring.getFullKey(request.publicKey);
    assert(key, 'Key not found.');
    return this.signer.sign(request, key);
  }

  async addKeyRecord (request: AddKeyRecordRequest): Promise<void> {
    assert(request.keyRecord && request.keyRecord.publicKey, 'Missing key record.');
    await this.echo.halo.keyring.addKeyRecord(request.keyRecord);
    assert(await this.echo.halo.keyring.getKey(request.keyRecord.publicKey), 'Key not inserted correctly.');
  }

  // TODO(burdon): subscribeToContacts or just query/contacts with subscription object.
  //  ResultSet vs Stream?
  subscribeContacts (): Stream<Contacts> {
    if (this.echo.halo.identity) {
      return resultSetToStream(this.echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
    }

    // TODO(burdon): Explain non-initialized path.
    return new Stream(({ next }) => {
      // If profile does not exist, send an empty array.
      if (!this.echo.halo.identity) {
        next({ contacts: [] });
      }

      const subGroup = new SubscriptionGroup();

      setImmediate(async () => {
        await this.echo.halo.identityReady.waitForCondition(() => !!this.echo.halo.identity);

        const resultSet = this.echo.halo.queryContacts();
        next({ contacts: resultSet.value });
        subGroup.push(resultSet.update.on(() => next({ contacts: resultSet.value })));
      });

      return () => subGroup.unsubscribe();
    });
  }

  async setGlobalPreference (request: SetPreferenceRequest): Promise<void> {
    assert(request.key, 'Missing key of property.');
    const preferences: ObjectModel | undefined = this.echo.halo.identity?.preferences?.getGlobalPreferences()?.model;
    assert(preferences, 'Preferences failed to load.');
    await preferences.setProperty(request.key, request.value);
  }

  async getGlobalPreference (request: GetPreferenceRequest): Promise<GetPreferenceResponse> {
    assert(request.key, 'Missing key of property.');
    const preferences: ObjectModel | undefined = this.echo.halo.identity?.preferences?.getGlobalPreferences()?.model;
    return {
      value: preferences?.getProperty(request.key)
    };
  }

  async setDevicePreference (request: SetPreferenceRequest): Promise<void> {
    assert(request.key, 'Missing key of property.');
    const preferences: ObjectModel | undefined = this.echo.halo.identity?.preferences?.getDevicePreferences()?.model;
    assert(preferences, 'Preferences failed to load.');
    await preferences.setProperty(request.key, request.value);
  }

  async getDevicePreference (request: GetPreferenceRequest): Promise<GetPreferenceResponse> {
    assert(request.key, 'Missing key of property.');
    const preferences: ObjectModel | undefined = this.echo.halo.identity?.preferences?.getDevicePreferences()?.model;
    return {
      value: preferences?.getProperty(request.key)
    };
  }
}

export const createHaloService = ({ echo, signer }: CreateServicesOpts): HaloService => new HaloService(echo, signer);
