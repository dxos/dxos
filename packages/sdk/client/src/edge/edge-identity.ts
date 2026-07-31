//
// Copyright 2025 DXOS.org
//

import * as Runtime from 'effect/Runtime';

import { type EdgeIdentity } from '@dxos/edge-client';
import { runServiceCall } from '@dxos/protocols';

import { type Client } from '../client';
import { RPC_TIMEOUT } from '../common';

export const createEdgeIdentity = (client: Client): EdgeIdentity => {
  const identity = client.halo.identity.get();
  const device = client.halo.device;
  if (!identity || !device) {
    throw new Error('Identity not available');
  }
  return {
    identityDid: identity.did,
    peerKey: device.deviceKey.toHex(),
    presentCredentials: async ({ challenge }) => {
      const identityService = client.services.rpc.IdentityService;
      const authCredential = await runServiceCall(
        Runtime.defaultRuntime,
        identityService.createAuthCredential(undefined),
        { label: 'IdentityService.createAuthCredential' },
      );
      return runServiceCall(
        Runtime.defaultRuntime,
        identityService.signPresentation({
          presentation: { credentials: [authCredential] },
          nonce: challenge,
        }),
        { timeout: RPC_TIMEOUT, label: 'IdentityService.signPresentation' },
      );
    },
  };
};
