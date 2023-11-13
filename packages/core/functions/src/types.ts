//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/client';

export type FunctionDef = {
  // FQ function name.
  id: string;
  // HTTP endpoint.
  endpoint: string;
  // Path of handler.
  handler: string;
  description?: string;
};

export type TriggerSubscription = {
  type: string;
  spaceKey: string;
  props?: Record<string, any>;
  nested?: string[];
};

// TODO(burdon): Generalize binding.
// https://www.npmjs.com/package/aws-lambda
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
export type FunctionTrigger = {
  function: string;
  subscription: TriggerSubscription;
};

export type FunctionManifest = {
  functions: FunctionDef[];
  triggers: FunctionTrigger[];
};

export interface Response {
  status(code: number): Response;
  succeed(data?: object): Response;
}

export interface FunctionContext {
  client: Client;
  status(code: number): Response;
}

export type FunctionHandler<T extends {}> = (params: {
  event: T;
  context: FunctionContext;
}) => Promise<Response | void>;

// TODO(burdon): Types.
export type FunctionSubscriptionEvent = {
  space: string;
  objects: string[];
};
