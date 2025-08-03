//
// Copyright 2023 DXOS.org
//

import { type Context, type Effect, Schema } from 'effect';

import { type AiServiceClient } from '@dxos/ai';
// import { type Space } from '@dxos/client/echo';
import type { EchoDatabase } from '@dxos/echo-db';
import { type HasId } from '@dxos/echo-schema';
import { type DXN, type SpaceId } from '@dxos/keys';
import { type QueryResult } from '@dxos/protocols';

import type { Services } from './services';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Function handler.
 */
export type FunctionHandler<TData = {}, TOutput = any> = (params: {
  /**
   * Services and context available to the function.
   */
  context: FunctionContext;

  /**
   * Data passed as the input to the function.
   * Must match the function's input schema.
   * This will be the payload from the trigger or other data passed into the function in a workflow.
   */
  data: TData;
}) => TOutput | Promise<TOutput> | Effect.Effect<TOutput, any, Services>;

/**
 * Function context.
 */
export interface FunctionContext {
  /**
   * Space from which the function was invoked.
   */
  space: SpaceAPI | undefined;

  ai: AiServiceClient;

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

export type FunctionDefinition<T = {}, O = any> = {
  name: string;
  description?: string;
  inputSchema: Schema.Schema<T, any>;
  outputSchema?: Schema.Schema<O, any>;
  handler: FunctionHandler<T, O>;
};

// TODO(dmaretskyi): Bind input type to function handler.
export const defineFunction = <T, O>({
  name,
  description,
  inputSchema,
  outputSchema = Schema.Any,
  handler,
}: FunctionDefinition<T, O>): FunctionDefinition<T, O> => {
  if (!Schema.isSchema(inputSchema)) {
    throw new Error('Input schema must be a valid schema');
  }
  if (typeof handler !== 'function') {
    throw new Error('Handler must be a function');
  }

  return {
    name,
    description,
    inputSchema,
    outputSchema,
    handler,
  };
};
