//
// Copyright 2022 DXOS.org
//

import { createCredential } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { type Space } from '@dxos/echo-pipeline';
import { type Keyring } from '@dxos/keyring';
import { AdmittedFeed, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';

import { type SigningContext } from './data-space-manager';

export const spaceGenesis = async (
  keyring: Keyring,
  signingContext: SigningContext,
  space: Space,
  automergeRoot?: string,
) => {
  // TODO(dmaretskyi): Find a way to reconcile with credential generator.
  const credentials = [
    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: space.key,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceGenesis',
        spaceKey: space.key,
      },
    }),

    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: signingContext.identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        spaceKey: space.key,
        role: SpaceMember.Role.OWNER,
        profile: signingContext.getProfile(),
        genesisFeedKey: space.controlFeedKey ?? failUndefined(),
      },
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.controlFeedKey ?? failUndefined(),
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        spaceKey: space.key,
        identityKey: signingContext.identityKey,
        deviceKey: signingContext.deviceKey,
        designation: AdmittedFeed.Designation.CONTROL,
      },
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.dataFeedKey ?? failUndefined(),
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        spaceKey: space.key,
        identityKey: signingContext.identityKey,
        deviceKey: signingContext.deviceKey,
        designation: AdmittedFeed.Designation.DATA,
      },
    }),

    await signingContext.credentialSigner.createCredential({
      subject: space.key ?? failUndefined(),
      assertion: {
        '@type': 'dxos.halo.credentials.Epoch',
        number: 0,
        previousId: undefined,
        timeframe: new Timeframe(),
        snapshotCid: undefined,
        automergeRoot,
      },
    }),
  ];

  for (const credential of credentials) {
    await space.controlPipeline.writer.write({
      credential: { credential },
    });
  }

  return credentials;
};
