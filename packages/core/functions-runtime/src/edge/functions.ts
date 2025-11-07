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
import { type SpaceId } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { safeParseJson } from '@dxos/util';
import * as Function from '../types/Function';
import { FUNCTIONS_META_KEY, setUserFunctionIdInMetadata } from '..';

export type UploadWorkerArgs = {
  client: Client;
  version: string;
  name?: string;
  functionId?: string;
  ownerPublicKey: PublicKey;
  entryPoint: string;
  assets: Record<string, Uint8Array>;
};

/** @deprecated Migrate to `client.edge`. */
export const createEdgeClient = (client: Client): EdgeHttpClient => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  return edgeClient;
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
  const edgeClient = createEdgeClient(client);
  const response = await edgeClient.uploadFunction(
    { functionId },
    { name, version, ownerPublicKey: ownerPublicKey.toHex(), entryPoint, assets },
  );

  // TODO(burdon): Edge service log.
  log('uploaded', {
    identityKey: client.halo.identity.get()?.identityKey,
    did: client.halo.identity.get()?.did,
    functionId,
    name,
    version,
    response,
  });

  return response;
};

export const getDeployedFunctions = async (client: Client): Promise<Function.Function[]> => {
  const edgeClient = createEdgeClient(client);
  const result = await edgeClient.listFunctions();
  return result.uploadedFunctions.flatMap((record: any) => {
    // Record shape is determined by EDGE API. We defensively parse.
    const latest = record.latestVersion ?? {};
    const versionMeta = safeParseJson<any>(latest.versionMetaJSON);
    if (!versionMeta) {
      return [];
    }
    const fn = Function.make({
      key: versionMeta.key,
      name: versionMeta.name ?? versionMeta.key ?? record.id,
      version: latest?.version ?? '0.0.0',
      updated: record?.updated !== undefined ? new Date(record.updated).toISOString() : undefined,
      description: versionMeta.description,
      inputSchema: versionMeta.inputSchema,
      outputSchema: versionMeta.outputSchema,
    });

    setUserFunctionIdInMetadata(Obj.getMeta(fn), record.id);
    return [fn];
  });
};

export const invokeFunction = async (
  edgeClient: EdgeHttpClient,
  fn: Function.Function,
  input: unknown,
  {
    spaceId,
    cpuTimeLimit,
    subrequestsLimit,
  }: { spaceId?: SpaceId; cpuTimeLimit?: number; subrequestsLimit?: number } = {},
) => {
  const functionId = Obj.getMeta(fn).keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
  if (!functionId) {
    throw new Error('No identifier for the function at the EDGE service');
  }
  // COMPAT: Previously functionId was a URL `/<guid>`. Now it's just the `<guid>`.
  const cleanedId = functionId.replace(/^\//, '');
  return await edgeClient.invokeFunction({ functionId: cleanedId, spaceId, cpuTimeLimit, subrequestsLimit }, input);
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
