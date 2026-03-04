//
// Copyright 2022 DXOS.org
//

import { createCredential, toBufPublicKey } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { type Space } from '@dxos/echo-pipeline';
import { type Keyring } from '@dxos/keyring';
import { create, TimeframeVectorProto } from '@dxos/protocols/buf';
import {
  AdmittedFeed_Designation,
  AdmittedFeedSchema,
  type Credential,
  EpochSchema,
  SpaceGenesisSchema,
  SpaceMember_Role,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Timeframe } from '@dxos/timeframe';

import { type SigningContext } from './data-space-manager';

export const spaceGenesis = async (
  keyring: Keyring,
  signingContext: SigningContext,
  space: Space,
  automergeRoot?: string,
): Promise<Credential[]> => {
  // TODO(dmaretskyi): Find a way to reconcile with credential generator.
  const credentials = [
    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: space.key,
      assertion: create(SpaceGenesisSchema, {
        spaceKey: toBufPublicKey(space.key),
      }),
    }),

    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: signingContext.identityKey,
      assertion: create(SpaceMemberSchema, {
        spaceKey: toBufPublicKey(space.key),
        role: SpaceMember_Role.OWNER,
        profile: signingContext.getProfile(),
        genesisFeedKey: toBufPublicKey(space.controlFeedKey ?? failUndefined()),
      }),
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.controlFeedKey ?? failUndefined(),
      assertion: create(AdmittedFeedSchema, {
        spaceKey: toBufPublicKey(space.key),
        identityKey: toBufPublicKey(signingContext.identityKey),
        deviceKey: toBufPublicKey(signingContext.deviceKey),
        designation: AdmittedFeed_Designation.CONTROL,
      }),
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.dataFeedKey ?? failUndefined(),
      assertion: create(AdmittedFeedSchema, {
        spaceKey: toBufPublicKey(space.key),
        identityKey: toBufPublicKey(signingContext.identityKey),
        deviceKey: toBufPublicKey(signingContext.deviceKey),
        designation: AdmittedFeed_Designation.DATA,
      }),
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.key ?? failUndefined(),
      assertion: create(EpochSchema, {
        number: 0,
        timeframe: TimeframeVectorProto.encode(new Timeframe()),
        automergeRoot,
      }),
    }),
  ];

  for (const credential of credentials) {
    await space.controlPipeline.writer.write({
      credential: { credential },
    });
  }

  return credentials;
};
