//
// Copyright 2024 DXOS.org
//

import { type DID } from 'iso-did/types';

import { type Client } from '@dxos/client';
import { type ObjectMeta } from '@dxos/echo-schema';
import { EdgeHttpClient, type EdgeIdentity } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type UploadFunctionResponseBody } from '@dxos/protocols';

// TODO: use URL scheme for source?
const FUNCTIONS_META_KEY = 'dxos.org/service/function';

export const FUNCTIONS_PRESET_META_KEY = 'dxos.org/service/function-preset';

export type UploadWorkerArgs = {
  client: Client;
  name?: string;
  source: string;
  version: string;
  functionId?: string;
  ownerDid: DID;
};

export const uploadWorkerFunction = async ({
  client,
  name,
  version,
  source,
  ownerDid,
  functionId,
}: UploadWorkerArgs): Promise<UploadFunctionResponseBody> => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  const response = await edgeClient.uploadFunction({ ownerDid, functionId }, { name, version, script: source });

  log('Uploaded', {
    functionId,
    source,
    name,
    identityKey: edgeIdentity.identityKey,
    response,
  });

  return response;
};

export const getUserFunctionUrlInMetadata = (meta: ObjectMeta) => {
  return meta.keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
};

export const setUserFunctionUrlInMetadata = (meta: ObjectMeta, functionUrl: string) => {
  const key = meta.keys.find((key) => key.source === FUNCTIONS_META_KEY);
  if (key) {
    if (key.id !== functionUrl) {
      throw new Error('Metadata mismatch');
    }
  } else {
    meta.keys.push({ source: FUNCTIONS_META_KEY, id: functionUrl });
  }
};

export const getInvocationUrl = (functionUrl: string, edgeUrl: string, options: InvocationOptions = {}) => {
  const baseUrl = new URL('functions/', edgeUrl);

  // Leading slashes cause the URL to be treated as an absolute path.
  const relativeUrl = functionUrl.replace(/^\//, '');
  const url = new URL(`./${relativeUrl}`, baseUrl.toString());
  options.spaceId && url.searchParams.set('spaceId', options.spaceId);
  options.subjectId && url.searchParams.set('subjectId', options.subjectId);
  url.protocol = 'https';
  return url.toString();
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

export type InvocationOptions = {
  spaceId?: SpaceId;
  subjectId?: string;
};
