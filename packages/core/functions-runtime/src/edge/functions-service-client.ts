//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { Obj } from '@dxos/echo';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { FUNCTIONS_META_KEY, Function, FunctionError } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { type ObjectId, type PublicKey, type SpaceId } from '@dxos/keys';
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
  ownerPublicKey: PublicKey;

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
  async deploy(request: FunctionDeployOptions): Promise<Function.Function> {
    try {
      invariant(
        Object.keys(request.assets).every((path) => !path.startsWith('/')),
        'Asset paths must be relative',
      );
      const response = await this.#edgeClient.uploadFunction(
        { functionId: request.functionId },
        {
          name: request.name,
          version: request.version,
          ownerPublicKey: request.ownerPublicKey.toHex(),
          entryPoint: request.entryPoint,
          assets: request.assets,
          runtime: request.runtime,
        },
        { retry: { count: 3 }, auth: true },
      );
      log.verbose('deploy result', { ...response });

      return Function.make({
        [Obj.Meta]: {
          keys: [{ source: FUNCTIONS_META_KEY, id: response.functionId }],
        },
        key: response.meta.key,
        name: response.meta.name ?? 'Unnamed function',
        version: response.version,
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
  async query(): Promise<Function.Function[]> {
    try {
      const response = await this.#edgeClient.listFunctions();
      return response.uploadedFunctions.map((record: any) => {
        // Record shape is determined by EDGE API. We defensively parse.
        const latest = record.latestVersion ?? {};
        const versionMeta = safeParseJson<any>(latest.versionMetaJSON);
        if (!versionMeta) {
          return [];
        }
        const fn = Function.make({
          [Obj.Meta]: {
            keys: [{ source: FUNCTIONS_META_KEY, id: response.functionId }],
          },
          key: versionMeta.key,
          name: versionMeta.name ?? versionMeta.key ?? record.id,
          version: latest?.version ?? '0.0.0',
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

  async invoke(func: Function.Function, input: unknown, options?: FunctionInvokeOptions) {
    const functionId = Obj.getMeta(func).keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
    if (!functionId) {
      throw new FunctionServiceError({ message: 'No identifier for the function at the EDGE service' });
    }
    // COMPAT: Previously functionId was a URL `/<guid>`. Now it's just the `<guid>`.
    const cleanedId = functionId.replace(/^\//, '');
    try {
      return await this.#edgeClient.invokeFunction(
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

  async forceRunCronTrigger(spaceId: SpaceId, triggerId: ObjectId): Promise<InvokeResult> {
    return (await this.#edgeClient.forceRunCronTrigger(spaceId, triggerId)) as InvokeResult;
  }
}
