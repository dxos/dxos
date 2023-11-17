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

/**
 * Function handler.
 */
export type FunctionHandler<T extends {}> = (params: {
  context: FunctionContext;
  event: T;
}) => Promise<Response | void>;

// TODO(burdon): Types.
export type FunctionSubscriptionEvent = {
  space: string;
  objects: string[];
};
