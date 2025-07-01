//
// Copyright 2025 DXOS.org
//

import { type EdgeIdentity } from '@dxos/edge-client';

import { type Client } from '../client';
import { log } from '@dxos/log';

export const createEdgeIdentity = (client: Client): EdgeIdentity => {
  const identity = client.halo.identity.get();
  const device = client.halo.device;
  if (!identity || !device) {
    log.warn('Identity not available', { identity, device });
    throw new Error('Identity not available');
  }
  return {
    identityKey: identity.identityKey.toHex(),
    peerKey: device.deviceKey.toHex(),
    presentCredentials: async ({ challenge }) => {
      const identityService = client.services.services.IdentityService!;
      const authCredential = await identityService.createAuthCredential();
      return identityService.signPresentation({
        presentation: { credentials: [authCredential] },
        nonce: challenge,
      });
    },
  };
};
