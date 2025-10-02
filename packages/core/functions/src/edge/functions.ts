//
// Copyright 2024 DXOS.org
//

import { type DID } from 'iso-did/types';

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type UploadFunctionResponseBody } from '@dxos/protocols';

export type UploadWorkerArgs = {
  client: Client;
  version: string;
  name?: string;
  functionId?: string;
  ownerPublicKey: PublicKey;
  entryPoint: string;
  assets: Record<string, Uint8Array>;
};

export const uploadWorkerFunction = async ({
  client,
  version,
  name,
  functionId,
  ownerPublicKey,
  entryPoint,
  assets,
}: UploadWorkerArgs): Promise<UploadFunctionResponseBody> => {
  log('uploading function', { functionId, name, version, ownerPublicKey });
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  const response = await edgeClient.uploadFunction(
    { functionId },
    { name, version, ownerPublicKey: ownerPublicKey.toHex(), entryPoint, assets },
  );

  // TODO(burdon): Edge service log.
  log('uploaded', {
    identityKey: edgeIdentity.identityKey,
    functionId,
    name,
    version,
    response,
  });

  return response;
};

export const incrementSemverPatch = (version: string): string => {
  const [major, minor, patch] = version.split('.');
  const patchNum = Number(patch);
  invariant(!Number.isNaN(patchNum), `Unexpected function version format: ${version}`);
  return [major, minor, String(patchNum + 1)].join('.');
};

// TODO(burdon): Factor out.
export const publicKeyToDid = (key: PublicKey): DID => {
  return `did:key:${key.toHex()}`;
};
