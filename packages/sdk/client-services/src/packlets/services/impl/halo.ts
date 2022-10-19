//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { ObjectModel } from '@dxos/object-model';
import {
  AddKeyRecordRequest,
  Contacts,
  HaloService as HaloServiceRpc,
  SignRequest,
  SignResponse,
  SetPreferenceRequest,
  GetPreferenceRequest,
  GetPreferenceResponse
} from '@dxos/protocols/proto/dxos/client';

import { HaloSigner } from '../signer';

/**
 * HALO service implementation.
 */
export class HaloService implements HaloServiceRpc {
  constructor (
    private readonly echo: any, // TODO(burdon): Remove.
    private readonly signer?: HaloSigner
  ) {}

  // TODO(burdon): Rename signMessage? (in interface).
  // TODO(burdon): Why is this part of the interface? (Can it be factored out completely?)
  async sign (request: SignRequest): Promise<SignResponse> {
    assert(this.signer, 'Signer not set.');
    assert(request.publicKey, 'Provide a public_key of the key that should be used for signing.');
    const key = await this.echo.halo.keyring.getFullKey(request.publicKey);
    assert(key, `Key not found: ${request.publicKey.toHex()}`);
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
    return new Stream(({ next }) => {
      next({ contacts: [] });
    });
    if (this.echo.halo.identity) {
      // return resultSetToStream(this.echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
    }

    // TODO(burdon): Explain non-initialized path.
    return new Stream(({ next }) => {
      // If profile does not exist, send an empty array.
      if (!this.echo.halo.identity) {
        next({ contacts: [] });
      }

      const subscriptions = new EventSubscriptions();
      setTimeout(async () => {
        await this.echo.halo.identityReady.waitForCondition(() => !!this.echo.halo.identity);

        const resultSet = this.echo.halo.queryContacts();
        next({ contacts: resultSet.value });
        subscriptions.add(resultSet.update.on(() => next({ contacts: resultSet.value })));
      });

      return () => subscriptions.clear();
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
