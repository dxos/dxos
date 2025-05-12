//
// Copyright 2023 DXOS.org
//

import { Schema as S } from 'effect';
import { type Effect } from 'effect';

import { type AIServiceClient } from '@dxos/assistant';
import { type Client } from '@dxos/client';
import type { CoreDatabase, EchoDatabase } from '@dxos/echo-db';
import { type HasId } from '@dxos/echo-schema';
import { type SpaceId, type DXN } from '@dxos/keys';
import { type QueryResult } from '@dxos/protocols';

import type { FunctionTrigger } from './types';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Function handler.
 */
export type FunctionHandler<TEvent extends EventType = EventType, TData = {}, TOutput = any> = (params: {
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
   * Event data from the trigger.
   */
  event: TEvent;

  /**
   * Data passed as the input to the function.
   * Must match the function's input schema.
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

type EventType =
  | EmailTriggerOutput
  | WebhookTriggerOutput
  | QueueTriggerOutput
  | SubscriptionTriggerOutput
  | TimerTriggerOutput;

// TODO(burdon): Reuse trigger schema from @dxos/functions (TriggerType).
export const EmailTriggerOutput = S.mutable(
  S.Struct({
    from: S.String,
    to: S.String,
    subject: S.String,
    created: S.String,
    body: S.String,
  }),
);
export type EmailTriggerOutput = S.Schema.Type<typeof EmailTriggerOutput>;

export const WebhookTriggerOutput = S.mutable(
  S.Struct({
    url: S.String,
    method: S.Literal('GET', 'POST'),
    headers: S.Record({ key: S.String, value: S.String }),
    bodyText: S.String,
  }),
);
export type WebhookTriggerOutput = S.Schema.Type<typeof WebhookTriggerOutput>;

export const QueueTriggerOutput = S.mutable(
  S.Struct({
    queue: dxnSchema,
    item: S.Any,
    cursor: S.String,
  }),
);
export type QueueTriggerOutput = S.Schema.Type<typeof QueueTriggerOutput>;

export const SubscriptionTriggerOutput = S.mutable(S.Struct({ type: S.String, changedObjectId: S.String }));
export type SubscriptionTriggerOutput = S.Schema.Type<typeof SubscriptionTriggerOutput>;

export const TimerTriggerOutput = S.mutable(S.Record({ key: S.String, value: S.Any }));
export type TimerTriggerOutput = S.Schema.Type<typeof TimerTriggerOutput>;

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

export type FunctionDefinition<E extends EventType = EventType, T = {}, O = any> = {
  description?: string;
  inputSchema: S.Schema<T, any>;
  outputSchema?: S.Schema<O, any>;
  handler: FunctionHandler<E, T, O>;
};

// TODO(dmaretskyi): Bind input type to function handler.
export const defineFunction = <E extends EventType, T, O>(
  params: FunctionDefinition<E, T, O>,
): FunctionDefinition<E, T, O> => {
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
