//
// Copyright 2023 DXOS.org
//

import { type Schema as S } from '@effect/schema';

import { type Client, PublicKey } from '@dxos/client';
import { type Space, type SpaceId } from '@dxos/client/echo';
import type { CoreDatabase, EchoReactiveObject } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Function handler.
 */
export type FunctionHandler<TData = {}, TMeta = {}> = (params: {
  context: FunctionContext;
  event: FunctionEvent<TData, TMeta>;

  /**
   * @deprecated
   */
  response: FunctionResponse;
}) => Promise<Response | FunctionResponse | void>;

/**
 * Function context.
 */
export interface FunctionContext {
  getSpace: (spaceId: SpaceId) => Promise<SpaceAPI>;

  /**
   * Space from which the function was invoked.
   */
  space: SpaceAPI | undefined;

  ai: FunctionContextAi;

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

/**
 * Event payload.
 */
export type FunctionEvent<TData = {}, TMeta = {}> = {
  data: FunctionEventMeta<TMeta> & TData;
};

/**
 * Metadata from trigger.
 */
export type FunctionEventMeta<TMeta = {}> = {
  meta: TMeta;
};

/**
 * Function response.
 */
export type FunctionResponse = {
  status(code: number): FunctionResponse;
};

//
// API.
//

/**
 * Space interface available to functions.
 */
export interface SpaceAPI {
  get id(): SpaceId;
  get crud(): CoreDatabase;
}

const __assertFunctionSpaceIsCompatibleWithTheClientSpace = () => {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const y: SpaceAPI = {} as Space;
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
// TODO(burdon): Evolve into plugin definition like Composer.
export const subscriptionHandler = <TMeta>(
  handler: FunctionHandler<SubscriptionData, TMeta>,
  types?: S.Schema<any>[],
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
      ? data.objects?.map<EchoReactiveObject<any> | undefined>((id) => space!.db.getObjectById(id)).filter(nonNullable)
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
const registerTypes = (space: Space, types: S.Schema<any>[] = []) => {
  const registry = space.db.graph.schemaRegistry;
  for (const type of types) {
    if (!registry.hasSchema(type)) {
      registry.addSchema([type]);
    }
  }
};
