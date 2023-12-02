//
// Copyright 2023 DXOS.org
//

import { type Client, PublicKey } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { isTypedObject, type TypedObject } from '@dxos/echo-schema';
import { nonNullable } from '@dxos/util';

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
  space?: string; // TODO(burdon): Convert to PublicKey.
  objects?: string[];
};

export type FunctionSubscriptionEvent2 = {
  space?: Space;
  objects?: TypedObject[];
};

export const subscriptionHandler = (
  handler: FunctionHandler<FunctionSubscriptionEvent2>,
): FunctionHandler<FunctionSubscriptionEvent> => {
  return ({ event, context, ...rest }) => {
    const { client } = context;
    const space = event.space ? client.spaces.get(PublicKey.from(event.space)) : undefined;
    const objects =
      space &&
      event.objects
        ?.map<TypedObject | undefined>((id) => space!.db.getObjectById(id))
        .filter(nonNullable)
        .filter(isTypedObject);

    return handler({ event: { space, objects }, context, ...rest });
  };
};
