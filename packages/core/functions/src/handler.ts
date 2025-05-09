//
// Copyright 2023 DXOS.org
//

import { Schema as S } from 'effect';
import { type Effect } from 'effect';

import { type AIServiceClient } from '@dxos/assistant';
import { type Client, PublicKey } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import type { CoreDatabase, EchoDatabase, ReactiveEchoObject } from '@dxos/echo-db';
import { type HasId } from '@dxos/echo-schema';
import { type SpaceId, type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryResult } from '@dxos/protocols';
import { isNonNullable } from '@dxos/util';
import type { FunctionTrigger } from './types';

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
   * Trigger that invoked the function.
   * In case the function is part of a workflow, this will be the trigger for the overall workflow.
   */
  trigger: FunctionTrigger;

  /**
   * Data passed as the input to the function.
   * Must match the function's input schema.
   */
  data: TData;

  /**
   * Event data from the trigger.
   */
  event: EventType;
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

// TODO(dmaretskyi): Move trigger event types from conductor.
type EventType = unknown; // EmailTriggerOutput | WebhookTriggerOutput | QueueTriggerOutput | SubscriptionTriggerOutput | TimerTriggerOutput;
/*

export const EmailTriggerOutput = S.mutable(
  S.Struct({
    from: S.String,
    to: S.String,
    subject: S.String,
    created: S.String,
    body: S.String,
  }),
);

export const WebhookTriggerOutput = S.mutable(
  S.Struct({
    url: S.String,
    method: S.Literal('GET', 'POST'),
    headers: S.Record({ key: S.String, value: S.String }),
    bodyText: S.String,
  }),
);

export const QueueTriggerOutput = S.mutable(
  S.Struct({
    queue: DXN,
    item: S.Any,
    cursor: S.String,
  }),
);
*/

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
  types?: S.Schema.AnyNoContext[],
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
const registerTypes = (space: Space, types: S.Schema.AnyNoContext[] = []) => {
  const registry = space.db.graph.schemaRegistry;
  for (const type of types) {
    if (!registry.hasSchema(type)) {
      registry.addSchema([type]);
    }
  }
};
