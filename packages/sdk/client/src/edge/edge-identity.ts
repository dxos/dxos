//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';

import { type EdgeIdentity } from '@dxos/edge-client';
import { runServiceCall } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import { PresentationSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

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
      const rpc = client.services.rpc;
      const authCredential = await runServiceCall(
        Context.empty(),
        rpc['IdentityService.createAuthCredential'](undefined),
        { label: 'IdentityService.createAuthCredential' },
      );
      return fromBufPresentation(
        await runServiceCall(
          Context.empty(),
          rpc['IdentityService.signPresentation']({
            presentation: buf.create(PresentationSchema, { credentials: [authCredential] }),
            nonce: challenge,
          }),
          { timeout: RPC_TIMEOUT, label: 'IdentityService.signPresentation' },
        ),
      );
    },
  };
};
