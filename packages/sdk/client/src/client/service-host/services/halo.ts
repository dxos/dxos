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
import {schnorrkelSign} from '@polkadot/util-crypto'

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
    assert(request.keyRecord, 'Missing key record.')
    await this.echo.halo.keyring.addKeyRecord(request.keyRecord)
  }

  async Sign (request: SignRequest): Promise<SignResponse> {
    const key = await this.echo.halo.keyring.getKey(request.publicKey);
    assert(key, 'Key not found.');
    assert(key.type === KeyType.DXNS, 'Only DXNS key signing is supported.');
    return {
      signed: schnorrkelSign(request.payload, {publicKey: key.publicKey.asUint8Array(), secretKey: key.secretKey})
    }

  }
}

export const createHaloService = ({ echo }: CreateServicesOpts): HaloService => {
  return new HaloService(echo);
};
