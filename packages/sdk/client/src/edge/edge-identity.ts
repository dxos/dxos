//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';

import { type EdgeIdentity } from '@dxos/edge-client';
import { runServiceCall } from '@dxos/protocols';

import { type Client } from '../client/index.ts';
import { RPC_TIMEOUT } from '../common.ts';

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
      const rpc = client.services.rpc;
      const authCredential = await runServiceCall(
        Context.empty(),
        rpc['IdentityService.createAuthCredential'](undefined),
        { label: 'IdentityService.createAuthCredential' },
      );
      return runServiceCall(
        Context.empty(),
        rpc['IdentityService.signPresentation']({
          presentation: { credentials: [authCredential] },
          nonce: challenge,
        }),
        { timeout: RPC_TIMEOUT, label: 'IdentityService.signPresentation' },
      );
    },
  };
};
