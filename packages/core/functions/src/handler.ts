//
// Copyright 2023 DXOS.org
//

import { type Client, PublicKey } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

// TODO(burdon): No response?
export interface Response {
  status(code: number): Response;
}

export interface FunctionContext {
  // TODO(burdon): Limit access to individual space.
  client: Client;
  // TODO(burdon): Replace with storage service abstraction.
  dataDir?: string;
}

export type FunctionHandler<T = {}> = (params: {
  event: FunctionEvent<T>;
  context: FunctionContext;
  response: Response;
}) => Promise<Response | void>;

export type FunctionEventMeta = {
  meta: any;
};

export type FunctionEvent<T = {}> = {
  data: FunctionEventMeta & T;
};

export type RawSubscriptionData = {
  spaceKey?: string;
  objects?: string[];
};

export type SubscriptionData = {
  space?: Space;
  objects?: EchoReactiveObject<any>[];
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
export const subscriptionHandler = (
  handler: FunctionHandler<SubscriptionData>,
): FunctionHandler<RawSubscriptionData> => {
  return ({ event: { data }, context, ...rest }) => {
    const { client } = context;
    const space = data.spaceKey ? client.spaces.get(PublicKey.from(data.spaceKey)) : undefined;
    const objects = space
      ? data.objects?.map<EchoReactiveObject<any> | undefined>((id) => space!.db.getObjectById(id)).filter(nonNullable)
      : [];

    if (!!data.spaceKey && !space) {
      log.warn('invalid space', { data });
    } else {
      log.info('handler', { space: space?.key.truncate(), objects: objects?.length });
    }

    return handler({ event: { data: { ...data, space, objects } }, context, ...rest });
  };
};
