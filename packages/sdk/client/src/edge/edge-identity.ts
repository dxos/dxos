//
// Copyright 2025 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type EdgeIdentity } from '@dxos/edge-client';
import { decodePublicKey, EMPTY } from '@dxos/protocols/buf';

import { type Client } from '../client';
import { RPC_TIMEOUT } from '../common';

export const createEdgeIdentity = (client: Client): EdgeIdentity => {
  const identity = client.halo.identity.get();
  const device = client.halo.device;
  if (!identity || !device) {
    throw new Error('Identity not available');
  }
  invariant(identity.identityKey, 'Identity key not available');
  invariant(device.deviceKey, 'Device key not available');
  return {
    identityKey: decodePublicKey(identity.identityKey).toHex(),
    peerKey: decodePublicKey(device.deviceKey).toHex(),
    presentCredentials: async ({ challenge }) => {
      const identityService = client.services.services.IdentityService!;
      const authCredential = await identityService.createAuthCredential(EMPTY);
      return identityService.signPresentation(
        {
          presentation: { credentials: [authCredential] },
          nonce: challenge,
        },
        { timeout: RPC_TIMEOUT },
      );
    },
  };
};
