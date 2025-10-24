//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { type SpaceId } from '@dxos/client/echo';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Obj } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { FUNCTIONS_META_KEY, Function, setUserFunctionIdInMetadata } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { safeParseJson } from '@dxos/util';

/** @deprecated Migrate to `client.edge`. */
export const createEdgeClient = (client: Client): EdgeHttpClient => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);
  return edgeClient;
};

export const getDeployedFunctions = async (client: Client): Promise<Function.Function[]> => {
  const edgeClient = createEdgeClient(client);
  const result = await edgeClient.listFunctions();
  return result.uploadedFunctions.map((record: any) => {
    // Record shape is determined by EDGE API. We defensively parse.
    const latest = record.latestVersion ?? {};
    const versionMeta = safeParseJson<any>(latest.versionMetaJSON);
    const fn = Function.make({
      key: versionMeta.key,
      name: versionMeta.name ?? versionMeta.key ?? record.id,
      version: latest?.version ?? '0.0.0',
      description: versionMeta.description,
      inputSchema: versionMeta.inputSchema,
      outputSchema: versionMeta.outputSchema,
    });

    setUserFunctionIdInMetadata(Obj.getMeta(fn), record.id);
    return fn;
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
