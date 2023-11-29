//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/client';

// TODO(burdon): No response?
export interface Response {
  status(code: number): Response;
}

// TODO(burdon): Limit access to individual space?
export interface FunctionContext {
  client: Client;
  dataDir?: string;
}

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
export type FunctionHandler<T extends {}> = (params: {
  event: T;
  context: FunctionContext;
  response: Response;
}) => Promise<Response | void>;

export type FunctionSubscriptionEvent = {
  space: string; // TODO(burdon): Convert to PublicKey.
  objects: string[];
};
