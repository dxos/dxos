//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/client';

export interface Response {
  status(code: number): Response;
  succeed(data?: object): Response;
}

export interface FunctionContext {
  client: Client;
  status(code: number): Response;
}

export interface FunctionHandler {
  (event: any, context: FunctionContext): Promise<Response>;
}

export type FunctionsManifest = {
  functions: Record<string, FunctionConfig>;
  triggers: FunctionTrigger[];
};

export type FunctionConfig = {
  description?: string;
};

export type FunctionTrigger = {
  function: string;
  subscription: TriggerSubscription;
};

export type TriggerSubscription = {
  type: string;
  spaceKey: string;
  props?: Record<string, any>;
  nested?: string[];
};
