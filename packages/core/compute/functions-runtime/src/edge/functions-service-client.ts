//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { FunctionError, Operation } from '@dxos/compute';
import { type Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type EdgeHttpClient, type TriggersDispatcherStatus } from '@dxos/edge-client';
import { FUNCTIONS_META_KEY } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type FunctionRuntimeKind, type SerializedError } from '@dxos/protocols';
import { safeParseJson } from '@dxos/util';

import { FunctionServiceError } from '../errors';
import { createEdgeClient } from './functions';

// TODO(wittjosiah): Copied from @dxos/functions-simulator-cloudflare.
export type InvokeResult =
  | {
      _kind: 'success';
      /**
       * The output of the function.
       */
      result: unknown;
    }
  | {
      _kind: 'error';
      error: SerializedError;
    };

export type FunctionDeployOptions = {
  name?: string;
  version: string;
  /**
   * Service-side function id in case this function is a re-upload of a previous version.
   */
  functionId?: string;
  /** Owner identity DID (`did:halo:…`). Must equal the authenticated presenter DID. */
  ownerUri: string;

  runtime?: FunctionRuntimeKind;

  /**
   * Path of the entry point file in the assets table.
   */
  entryPoint: string;
  assets: {
    // TODO(dmaretskyi): Allow passing strings and setting mime-type.
    [path: string]: Uint8Array;
  };
};

export type FunctionInvokeOptions = {
  /**
   * Space in which the function is invoked.
   * Binds the Database.Service injected into the function to this space.
   * Without this, the function will not have access to any database.
   */
  spaceId?: SpaceId;

  /**
   * CPU time limit in milliseconds.
   * See Cloudflare docs for details.
   */
  cpuTimeLimit?: number;

  /**
   * Maximum number of subrequests.
   * See Cloudflare docs for details.
   */
  subrequestsLimit?: number;
};

export class FunctionsServiceClient {
  static fromClient(client: Client) {
    return new FunctionsServiceClient(createEdgeClient(client));
  }

  #edgeClient: EdgeHttpClient;

  constructor(edgeClient: EdgeHttpClient) {
    this.#edgeClient = edgeClient;
  }

  /**
   * Deploys a function to the EDGE service.
   */
  async deploy(ctx: Context, request: FunctionDeployOptions): Promise<Operation.PersistentOperation> {
    try {
      invariant(
        Object.keys(request.assets).every((path) => !path.startsWith('/')),
        'Asset paths must be relative',
      );
      const response = await this.#edgeClient.uploadFunction(
        ctx,
        { functionId: request.functionId },
        {
          name: request.name,
          version: request.version,
          ownerUri: request.ownerUri,
          entryPoint: request.entryPoint,
          assets: request.assets,
          runtime: request.runtime,
        },
        { retry: { count: 3 }, auth: true },
      );
      log.verbose('deploy result', { ...response });

      return Obj.make(Operation.PersistentOperation, {
        [Obj.Meta]: {
          keys: [{ source: FUNCTIONS_META_KEY, id: response.functionId }],
          key: response.meta.key,
          version: response.version,
        },
        name: response.meta.name ?? 'Unnamed function',
        description: response.meta.description,
        inputSchema: response.meta.inputSchema,
        outputSchema: response.meta.outputSchema,
      });
    } catch (error) {
      throw FunctionServiceError.wrap({ message: 'Failed to deploy function', ifTypeDiffers: true })(error);
    }
  }

  /**
   * Queries the EDGE service for deployed functions.
   */
  // TODO(dmaretskyi): Add query filters.
  async query(ctx: Context): Promise<Operation.PersistentOperation[]> {
    try {
      const response = await this.#edgeClient.listFunctions(ctx);
      return response.uploadedFunctions.flatMap((record: any) => {
        const latest = record.latestVersion ?? {};
        const versionMeta = safeParseJson<any>(latest.versionMetaJSON);
        if (!versionMeta) {
          return [];
        }
        const fn = Obj.make(Operation.PersistentOperation, {
          [Obj.Meta]: {
            keys: [{ source: FUNCTIONS_META_KEY, id: record.id }],
            key: versionMeta.key,
            version: latest?.version ?? '0.0.0',
          },
          name: versionMeta.name ?? versionMeta.key ?? record.id,
          updated: record?.updated !== undefined ? new Date(record.updated).toISOString() : undefined,
          description: versionMeta.description,
          inputSchema: versionMeta.inputSchema,
          outputSchema: versionMeta.outputSchema,
        });
        return [fn];
      });
    } catch (error) {
      throw FunctionServiceError.wrap({ message: 'Failed to query functions', ifTypeDiffers: true })(error);
    }
  }

  async invoke(ctx: Context, func: Operation.PersistentOperation, input: unknown, options?: FunctionInvokeOptions) {
    const functionId = Obj.getMeta(func).keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
    if (!functionId) {
      throw new FunctionServiceError({ message: 'No identifier for the function at the EDGE service' });
    }
    // COMPAT: Previously functionId was a URL `/<guid>`. Now it's just the `<guid>`.
    const cleanedId = functionId.replace(/^\//, '');
    try {
      return await this.#edgeClient.invokeFunction(
        ctx,
        {
          functionId: cleanedId,
          spaceId: options?.spaceId,
          cpuTimeLimit: options?.cpuTimeLimit,
          subrequestsLimit: options?.subrequestsLimit,
        },
        input,
      );
    } catch (error) {
      throw FunctionError.wrap({ message: 'Failed to invoke function', ifTypeDiffers: true })(error);
    }
  }

  async forceRunCronTrigger(ctx: Context, spaceId: SpaceId, triggerId: EntityId): Promise<InvokeResult> {
    return (await this.#edgeClient.forceRunCronTrigger(ctx, spaceId, triggerId)) as InvokeResult;
  }

  async getTriggersDispatcherStatus(ctx: Context, spaceId: SpaceId): Promise<TriggersDispatcherStatus> {
    return this.#edgeClient.getTriggersDispatcherStatus(ctx, spaceId);
  }
}
