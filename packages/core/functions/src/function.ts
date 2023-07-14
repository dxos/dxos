//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';

export interface Response {
  status(code: number): Response;
  succeed(data: any): Response;
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
};

export type FunctionConfig = {
  description?: string;
};

export type FunctionTriggers = {
  function: string;
  triggers: FunctionTrigger[];
};

export type FunctionTrigger = {
  type: string;
  spaceKey: string;
  subscription: {
    props?: Record<string, any>;
    nested?: string[];
  };
};
