//
// Copyright 2023 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type HasId } from '@dxos/echo/internal';
import { type EchoDatabase } from '@dxos/echo-db';
import { type DXN, type SpaceId } from '@dxos/keys';
import { type QueryResult } from '@dxos/protocols';
import {
  type FunctionDefinition,
  type FunctionProps,
  defineFunction as sdkDefineFunction,
  FunctionDefinition as FunctionDefinitionNamespace,
  serializeFunction,
  deserializeFunction,
} from '@dxos/functions';

import { type RuntimeServices } from './services';
import { Function } from './types';
import { getUserFunctionIdInMetadata, setUserFunctionIdInMetadata } from './url';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

// Re-export SDK types
export type { FunctionDefinition, FunctionProps } from '@dxos/functions';
export { FunctionDefinition as FunctionDefinitionNamespace, serializeFunction, deserializeFunction } from '@dxos/functions';

/**
 * Runtime function context with space and service access.
 */
export interface RuntimeFunctionContext {
  /**
   * Space from which the function was invoked.
   */
  space: SpaceAPI | undefined;

  /**
   * Resolves a service available to the function.
   * @throws if the service is not available.
   */
  getService: <T extends Context.Tag<any, any>>(tag: T) => Context.Tag.Service<T>;

  getSpace: (spaceId: SpaceId) => Promise<SpaceAPI>;
}

export interface FunctionContextAi {
  // TODO(dmaretskyi): Refer to cloudflare AI docs for more comprehensive typedefs.
  run(model: string, inputs: any, options?: any): Promise<any>;
}

//
// API.
//

// TODO(dmaretskyi): Temporary API to get the queues working.
// TODO(dmaretskyi): To be replaced with integrating queues into echo.
export interface QueuesAPI {
  queryQueue(queue: DXN, options?: {}): Promise<QueryResult>;
  insertIntoQueue(queue: DXN, objects: HasId[]): Promise<void>;
}

/**
 * Space interface available to functions.
 */
export interface SpaceAPI {
  get id(): SpaceId;
  get db(): EchoDatabase;

  // TODO(dmaretskyi): Align with echo api: queues.get(id).append(items);
  get queues(): QueuesAPI;
}

// TODO(wittjosiah): Queues are incompatible.
const __assertFunctionSpaceIsCompatibleWithTheClientSpace = () => {
  // const _: SpaceAPI = {} as Space;
};

// defineFunction is already exported from '@dxos/functions' via the runtime's index.ts
// export const defineFunction = sdkDefineFunction;
