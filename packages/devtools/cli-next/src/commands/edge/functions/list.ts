//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { Console, Effect } from 'effect';

import { ClientService } from '../../../services';
import { invariant } from '@dxos/invariant';
import { EdgeHttpClient } from '@dxos/edge-client';
import { createEdgeIdentity } from '@dxos/client/edge';
import type { Client } from '@dxos/client';
import {
  FunctionType,
  getUserFunctionUrlInMetadata,
  makeFunctionUrl,
  setUserFunctionUrlInMetadata,
} from '@dxos/functions';
import { Obj } from '@dxos/echo';

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const client = yield* ClientService;

    // Produce normalized in-memory FunctionType objects for display.
    const fns = yield* Effect.promise(() => getDeployedFunctions(client));
    yield* Console.log(JSON.stringify(fns, null, 2));
  }),
).pipe(Command.withDescription('List functions deployed to EDGE.'));

const getDeployedFunctions = async (client: Client): Promise<FunctionType[]> => {
  // TODO(dmaretskyi): The EdgeHttpClient inside client is not initialized with identity.
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge is not configured.');
  const edgeClient = new EdgeHttpClient(edgeUrl);
  const edgeIdentity = createEdgeIdentity(client);
  edgeClient.setIdentity(edgeIdentity);

  const result = await edgeClient.listFunctions();
  return result.uploadedFunctions.map((record: any) => {
    // record shape is determined by EDGE API. We defensively parse.
    const meta = safeJsonParse(record?.metadataJSON);
    const latest = record?.latestVersion ?? {};
    const versionMeta = safeJsonParse(latest?.versionMetaJSON);

    const functionId: string = latest?.functionId ?? record?.id ?? '';
    const name: string = meta?.name || record?.id || functionId || 'unknown-function';
    const version: string = latest?.version ?? '0.0.0';

    const fn = Obj.make(FunctionType, {
      key: functionId || name,
      name,
      version,
      description: versionMeta?.description ?? meta?.description,
      inputSchema: versionMeta?.inputSchema,
      outputSchema: versionMeta?.outputSchema,
    });

    if (functionId) {
      // Attach invocation URL to object meta for downstream consumers.
      try {
        setUserFunctionUrlInMetadata(Obj.getMeta(fn), makeFunctionUrl({ functionId }));
      } catch {
        // ignore metadata inconsistencies for list output
      }
    }

    return fn;
  });
};

// Local helper to avoid throwing on bad JSON from server.
const safeJsonParse = (value: unknown): any => {
  if (typeof value !== 'string' || value.length === 0) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};
