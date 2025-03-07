//
// Copyright 2023 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { type Effect } from 'effect';

import { type Client, PublicKey } from '@dxos/client';
import { type Space, type SpaceId } from '@dxos/client/echo';
import type { CoreDatabase, EchoDatabase, QueryResult, ReactiveEchoObject } from '@dxos/echo-db';
import { type HasId } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Function handler.
 */
export type FunctionHandler<TData = {}, TMeta = {}, TOutput = any> = (params: {
  context: FunctionContext;
  event: FunctionEvent<TData, TMeta>;
  /**
   * @deprecated
   */
  response: FunctionResponse;
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

  ai: FunctionContextAi;

  /**
   * @deprecated
   */
  // TODO(burdon): Limit access to individual space.
  client: Client;
  /**
   * @deprecated
   */
  // TODO(burdon): Replace with storage service abstraction.
  dataDir?: string;
}

export interface FunctionContextAi {
  // TODO(dmaretskyi): Refer to cloudflare AI docs for more comprehensive typedefs.
  run(model: string, inputs: any, options?: any): Promise<any>;
}

/**
 * Event payload.
 */
// TODO(dmaretskyi): Update type definitions to match the actual payload.
export type FunctionEvent<TData = {}, TMeta = {}> = {
  data: FunctionEventMeta<TMeta> & TData;
};

/**
 * Metadata from trigger.
 */
export type FunctionEventMeta<TMeta = {}> = {
  meta: TMeta;
};

/**
 * Function response.
 */
export type FunctionResponse = {
  status(code: number): FunctionResponse;
};

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

// TODO(wittjosiah): Fix this.
const __assertFunctionSpaceIsCompatibleWithTheClientSpace = () => {
  // const _: SpaceAPI = {} as Space;
};

export type FunctionDefinition = {
  description?: string;
  inputSchema: S.Schema.AnyNoContext;
  outputSchema?: S.Schema.AnyNoContext;
  handler: FunctionHandler<any>;
};

export type DefineFunctionParams<T, O = any> = {
  description?: string;
  inputSchema: S.Schema<T, any>;
  outputSchema?: S.Schema<O, any>;
  handler: FunctionHandler<T, any, O>;
};

// TODO(dmaretskyi): Bind input type to function handler.
export const defineFunction = <T, O>(params: DefineFunctionParams<T, O>): FunctionDefinition => {
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

//
// Subscription utils.
//

export type RawSubscriptionData = {
  spaceKey?: string;
  objects?: string[];
};

export type SubscriptionData = {
  space?: Space;
  objects?: ReactiveEchoObject<any>[];
};

/**
 * Handler wrapper for subscription events; extracts space and objects.
 *
 * To test:
 * ```
 * curl -s -X POST -H "Content-Type: application/json" --data '{"space": "0446...1cbb"}' http://localhost:7100/dev/email-extractor
 * ```
 *
 * NOTE: Get space key from devtools or `dx space list --json`
 */
// TODO(burdon): Evolve into plugin definition like Composer.
export const subscriptionHandler = <TMeta>(
  handler: FunctionHandler<SubscriptionData, TMeta>,
  types?: S.Schema<any>[],
): FunctionHandler<RawSubscriptionData, TMeta> => {
  return async ({ event: { data }, context, response, ...rest }) => {
    const { client } = context;
    const space = data.spaceKey ? client.spaces.get(PublicKey.from(data.spaceKey)) : undefined;
    if (!space) {
      log.error('Invalid space');
      return response.status(500);
    }

    registerTypes(space, types);
    const objects = space
      ? data.objects
          ?.map<ReactiveEchoObject<any> | undefined>((id) => space!.db.getObjectById(id))
          .filter(isNonNullable)
      : [];

    if (!!data.spaceKey && !space) {
      log.warn('invalid space', { data });
    } else {
      log.info('handler', { space: space?.key.truncate(), objects: objects?.length });
    }

    return handler({ event: { data: { ...data, space, objects } }, context, response, ...rest });
  };
};

// TODO(burdon): Evolve types as part of function metadata.
const registerTypes = (space: Space, types: S.Schema<any>[] = []) => {
  const registry = space.db.graph.schemaRegistry;
  for (const type of types) {
    if (!registry.hasSchema(type)) {
      registry.addSchema([type]);
    }
  }
};
