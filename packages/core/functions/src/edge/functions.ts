//
// Copyright 2024 DXOS.org
//

import { type DID } from 'iso-did/types';

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type UploadFunctionResponseBody } from '@dxos/protocols';

export type UploadWorkerArgs = {
  client: Client;
  spaceId: SpaceId;
  source: string;
  version: string;
  name?: string;
  functionId?: string;
};

export const uploadWorkerFunction = async ({
  client,
  spaceId,
  version,
  source,
  name,
  functionId,
}: UploadWorkerArgs): Promise<UploadFunctionResponseBody> => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  const response = await edgeClient.uploadFunction({ spaceId, functionId }, { name, version, script: source });

  // TODO(burdon): Edge service log.
  log.info('Uploaded', {
    identityKey: edgeIdentity.identityKey,
    functionId,
    name,
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
