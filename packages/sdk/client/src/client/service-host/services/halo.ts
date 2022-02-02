//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { defaultSecretValidator, generatePasscode, KeyType, SecretProvider } from '@dxos/credentials';
import { ECHO, InvitationDescriptor } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import {
  InvitationState,
  HaloService as IHaloService,
  AuthenticateInvitationRequest,
  SubscribeProfileResponse,
  InvitationRequest,
  CreateProfileRequest,
  Contacts,
  RedeemedInvitation,
  Profile
  , RecoverProfileRequest
} from '../../../proto/gen/dxos/client';
import { InvitationDescriptor as InvitationDescriptorProto } from '../../../proto/gen/dxos/echo/invitation';
import { resultSetToStream } from '../../../util';
import { CreateServicesOpts, InviteeInvitation, InviteeInvitations } from './interfaces';
import { SignResponse } from '../../../proto/gen/dxos/client';
import { AddKeyRecordRequest } from '../../../proto/gen/dxos/client';
import { SignRequest } from '../../../proto/gen/dxos/client';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import PolkadotKeyring from '@polkadot/keyring';



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
    assert(request.keyRecord && request.keyRecord.publicKey, 'Missing key record.')
    console.log('Adding key record..', request.keyRecord?.publicKey.toString(), 'secret:', request.keyRecord?.secretKey)
    await this.echo.halo.keyring.addKeyRecord(request.keyRecord)

    const key = await this.echo.halo.keyring.getKey(request.keyRecord!.publicKey);
    assert(key, 'Key not inserted correctly.')
  }

  async Sign (request: SignRequest): Promise<SignResponse> {
    console.log('got sign request', request.publicKey.toString())
    await cryptoWaitReady();


    const key = await this.echo.halo.keyring.getFullKey(request.publicKey);
    assert(key, 'DXNS Key not found.');
    assert(key.type === KeyType.DXNS, 'Only DXNS key signing is supported.');
    assert(key?.secretKey, 'Secret key is missing.')

    const keyring = new PolkadotKeyring({ type: 'sr25519' })
    // const uri = '//Alice'; // TODO: replace with private key from HALO key found by public key
    const uri = key.secretKey.toString()
    const keypair = keyring.addFromUri(uri);
    
    const signature = u8aToHex(keypair.sign(hexToU8a(request.payload), {withType: true}));
    return {
      signed: signature
    }
  }
}

export const createHaloService = ({ echo }: CreateServicesOpts): HaloService => {
  return new HaloService(echo);
};
