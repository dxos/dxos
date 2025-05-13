//
// Copyright 2023 DXOS.org
//

import { Schema as S } from 'effect';
import { type Effect } from 'effect';

import { type AIServiceClient } from '@dxos/assistant';
// import { type Space } from '@dxos/client/echo';
import type { CoreDatabase, EchoDatabase } from '@dxos/echo-db';
import { type HasId } from '@dxos/echo-schema';
import { type SpaceId, type DXN } from '@dxos/keys';
import { type QueryResult } from '@dxos/protocols';

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
}) => TOutput | Promise<TOutput> | Effect.Effect<TOutput, any>;

/**
 * Function context.
 */
export interface FunctionContext {
  getSpace: (spaceId: SpaceId) => Promise<SpaceAPI>;

  /**
   * Space from which the function was invoked.
   */
  space: SpaceAPI | undefined;

  ai: AIServiceClient;
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
  /**
   * @deprecated
   */
  get crud(): CoreDatabase;
  get db(): EchoDatabase;
  // TODO(dmaretskyi): Align with echo api --- queues.get(id).append(items);
  get queues(): QueuesAPI;
}

// TODO(wittjosiah): Queues are incompatible.
const __assertFunctionSpaceIsCompatibleWithTheClientSpace = () => {
  // const _: SpaceAPI = {} as Space;
};

export type FunctionDefinition<T = {}, O = any> = {
  description?: string;
  inputSchema: S.Schema<T, any>;
  outputSchema?: S.Schema<O, any>;
  handler: FunctionHandler<T, O>;
};

// TODO(dmaretskyi): Bind input type to function handler.
export const defineFunction = <T, O>(params: FunctionDefinition<T, O>): FunctionDefinition<T, O> => {
  if (!S.isSchema(params.inputSchema)) {
    throw new Error('Input schema must be a valid schema');
  }
  if (typeof params.handler !== 'function') {
    throw new Error('Handler must be a function');
  }

  return {
    description: params.description,
    inputSchema: params.inputSchema,
    outputSchema: params.outputSchema ?? S.Any,
    handler: params.handler,
  };
};
