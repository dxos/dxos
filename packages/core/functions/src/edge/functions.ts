//
// Copyright 2024 DXOS.org
//

import { type DID } from 'iso-did/types';

import { type Client } from '@dxos/client';
import { EdgeHttpClient, type EdgeIdentity } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type UploadFunctionResponseBody } from '@dxos/protocols';

export type UploadWorkerArgs = {
  client: Client;
  name?: string;
  source: string;
  version: string;
  functionId?: string;
  spaceId: SpaceId;
};

export const uploadWorkerFunction = async ({
  client,
  name,
  version,
  source,
  spaceId,
  functionId,
}: UploadWorkerArgs): Promise<UploadFunctionResponseBody> => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  const response = await edgeClient.uploadFunction({ spaceId, functionId }, { name, version, script: source });

  log('Uploaded', {
    functionId,
    source,
    name,
    identityKey: edgeIdentity.identityKey,
    response,
  });

  return response;
};

const createEdgeIdentity = (client: Client): EdgeIdentity => {
  const identity = client.halo.identity.get();
  const device = client.halo.device;
  if (!identity || !device) {
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

export const incrementSemverPatch = (version: string): string => {
  const [major, minor, patch] = version.split('.');
  const patchNum = Number(patch);
  invariant(!Number.isNaN(patchNum), 'Unexpected function version format.');
  return [major, minor, String(patchNum + 1)].join('.');
};

export const publicKeyToDid = (key: PublicKey): DID => {
  return `did:key:${key.toHex()}`;
};
