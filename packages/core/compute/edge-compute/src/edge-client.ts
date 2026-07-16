//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function$ from 'effect/Function';
import * as Order from 'effect/Order';
import { type DID } from 'iso-did/types';

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Operation } from '@dxos/compute';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { FUNCTIONS_META_KEY, setUserFunctionIdInMetadata } from '@dxos/compute-runtime';
import { invariant } from '@dxos/invariant';
import { type PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type UploadFunctionResponseBody } from '@dxos/protocols';
import { safeParseJson } from '@dxos/util';

/** @deprecated Use {@link FunctionsServiceClient} instead. */
export type UploadWorkerArgs = {
  client: Client;
  version: string;
  name?: string;
  functionId?: string;
  /** Owner identity DID (`did:halo:…`). */
  ownerUri: string;
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

/**
 * @deprecated Use {@link FunctionsServiceClient} instead.
 */
export const uploadWorkerFunction = async (
  ctx: Context,
  { client, version, name, functionId, ownerUri, entryPoint, assets }: UploadWorkerArgs,
): Promise<UploadFunctionResponseBody> => {
  log('uploading function', { functionId, name, version, ownerUri });
  const edgeClient = createEdgeClient(client);
  const response = await edgeClient.uploadFunction(
    ctx,
    { functionId },
    { name, version, ownerUri, entryPoint, assets },
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

/**
 * @deprecated Use {@link FunctionsServiceClient} instead.
 */
export const getDeployedFunctions = async (
  ctx: Context,
  client: Client,
  dedupe = false,
): Promise<Operation.PersistentOperation[]> => {
  const edgeClient = createEdgeClient(client);
  const result = await edgeClient.listFunctions(ctx);
  const functions: Operation.PersistentOperation[] = result.uploadedFunctions.flatMap((record: any) => {
    // Record shape is determined by EDGE API. We defensively parse.
    const latest = record.latestVersion ?? {};
    const versionMeta = safeParseJson<any>(latest.versionMetaJSON);
    if (!versionMeta) {
      return [];
    }
    const fn = Obj.make(Operation.PersistentOperation, {
      [Obj.Meta]: {
        key: versionMeta.key,
        version: latest?.version ?? '0.0.0',
      },
      name: versionMeta.name ?? versionMeta.key ?? record.id,
      updated: record?.updated !== undefined ? new Date(record.updated).toISOString() : undefined,
      description: versionMeta.description,
      inputSchema: versionMeta.inputSchema,
      outputSchema: versionMeta.outputSchema,
    });

    Obj.update(fn, (fn) => setUserFunctionIdInMetadata(Obj.getMeta(fn), record.id));
    return [fn];
  });

  if (dedupe) {
    return Function$.pipe(
      functions,
      Array.filter((_) => Obj.getMeta(_).key !== undefined),
      Array.sort(Order.reverse(Order.mapInput(Order.string, (_: Operation.PersistentOperation) => _.updated ?? ''))),
      Array.dedupeWith((self, that) => Obj.getMeta(self).key === Obj.getMeta(that).key),
      Array.sort(Order.mapInput(Order.string, (_: Operation.PersistentOperation) => Obj.getMeta(_).key ?? '')),
    );
  } else {
    return functions;
  }
};

/**
 * @deprecated Use {@link FunctionsServiceClient} instead.
 */
export const invokeFunction = async (
  ctx: Context,
  edgeClient: EdgeHttpClient,
  fn: Operation.PersistentOperation,
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
  return await edgeClient.invokeFunction(
    ctx,
    { functionId: cleanedId, spaceId, cpuTimeLimit, subrequestsLimit },
    input,
  );
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
