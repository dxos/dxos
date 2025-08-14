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
  source: string;
  version: string;
  name?: string;
  functionId?: string;
  ownerPublicKey: PublicKey;
};

export const uploadWorkerFunction = async ({
  client,
  version,
  source,
  name,
  functionId,
  ownerPublicKey,
}: UploadWorkerArgs): Promise<UploadFunctionResponseBody> => {
  log('uploading function', { functionId, name, version, source: source.length, ownerPublicKey });
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  const response = await edgeClient.uploadFunction(
    { functionId },
    { name, version, script: source, ownerPublicKey: ownerPublicKey.toHex() },
  );

  // TODO(burdon): Edge service log.
  log('uploaded', {
    identityKey: edgeIdentity.identityKey,
    functionId,
    name,
    version,
    source: source.length,
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
