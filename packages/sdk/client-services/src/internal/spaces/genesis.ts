//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { createCredential, credentialPayload } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { type KeyringApi } from '@dxos/keyring';
import { fromPublicKey, fromTimeframe } from '@dxos/protocols/buf';
import {
  AdmittedFeed_Designation,
  AdmittedFeedSchema,
  EpochSchema,
  MembershipPolicy,
  SpaceGenesisSchema,
  SpaceMember_Role,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Timeframe } from '@dxos/timeframe';

import { type Space } from '../space/index.ts';
import { type SigningContext } from './data-space-manager.ts';

export const spaceGenesis = async (
  keyring: KeyringApi,
  signingContext: SigningContext,
  space: Space,
  automergeRoot?: string,
  tags?: string[],
  membershipPolicy?: MembershipPolicy,
  spaceRootUrl?: string,
) => {
  // TODO(dmaretskyi): Find a way to reconcile with credential generator.
  const credentials = [
    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: space.key,
      assertion: create(SpaceGenesisSchema, {
        spaceKey: fromPublicKey(space.key),
        tags: tags ?? [],
        membershipPolicy: membershipPolicy ?? MembershipPolicy.INVITE,
      }),
    }),

    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: signingContext.identityKey,
      assertion: create(SpaceMemberSchema, {
        spaceKey: fromPublicKey(space.key),
        role: SpaceMember_Role.OWNER,
        profile: signingContext.getProfile(),
        genesisFeedKey: fromPublicKey(space.controlFeedKey ?? failUndefined()),
        spaceRootUrl,
        tags: tags ?? [],
      }),
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.controlFeedKey ?? failUndefined(),
      assertion: create(AdmittedFeedSchema, {
        spaceKey: fromPublicKey(space.key),
        identityKey: fromPublicKey(signingContext.identityKey),
        deviceKey: fromPublicKey(signingContext.deviceKey),
        designation: AdmittedFeed_Designation.CONTROL,
      }),
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.dataFeedKey ?? failUndefined(),
      assertion: create(AdmittedFeedSchema, {
        spaceKey: fromPublicKey(space.key),
        identityKey: fromPublicKey(signingContext.identityKey),
        deviceKey: fromPublicKey(signingContext.deviceKey),
        designation: AdmittedFeed_Designation.DATA,
      }),
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.key ?? failUndefined(),
      assertion: create(EpochSchema, {
        number: 0,
        timeframe: fromTimeframe(new Timeframe()),
        automergeRoot,
      }),
    }),
  ];

  for (const credential of credentials) {
    await space.controlPipeline.writer.write(credentialPayload(credential));
  }

  return credentials;
};
