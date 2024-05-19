//
// Copyright 2023 DXOS.org
//

import { type Client, PublicKey } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

// Lambda-like function definitions.
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html

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
export type FunctionHandler<T extends {}> = (params: {
  event: T;
  context: FunctionContext;
  response: Response;
}) => Promise<Response | void>;

export type RawSubscriptionEvent = {
  spaceKey?: string;
  objects?: string[];
};

export type SubscriptionEvent = {
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
  handler: FunctionHandler<SubscriptionEvent>,
): FunctionHandler<RawSubscriptionEvent> => {
  return ({ event, context, ...rest }) => {
    const { client } = context;
    const space = event.spaceKey ? client.spaces.get(PublicKey.from(event.spaceKey)) : undefined;
    const objects =
      space &&
      event.objects?.map<EchoReactiveObject<any> | undefined>((id) => space!.db.getObjectById(id)).filter(nonNullable);

    if (!!event.spaceKey && !space) {
      log.warn('invalid space', { event });
    } else {
      log.info('handler', { space: space?.key.truncate(), objects: objects?.length });
    }

    return handler({ event: { space, objects }, context, ...rest });
  };
};
