//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';

import type { JsonSchema as JsonSchemaType } from '@dxos/echo/JsonSchema';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeResponse, makeInProcessClient } from '@dxos/protocols';
import type { EdgeFunctionEnv, FunctionProtocol } from '@dxos/protocols';
import { DataService, FeedService, QueryService } from '@dxos/protocols/rpc';

import { ServiceContainer } from './internal';
import { FUNCTION_ROUTE_HEADER, type FunctionMetadata, FunctionRouteValue } from './types';

/**
 * Wraps a user function in a Cloudflare-compatible handler.
 */
export const wrapHandlerForCloudflare = (func: FunctionProtocol.Func): ExportedHandlerFetchHandler<any> => {
  return async (request: Request, env: EdgeFunctionEnv.Env): Promise<Response> => {
    // TODO(dmaretskyi): Should theÓ scope name reflect the function name?
    // TODO(mykola): Wrap in withCleanAutomergeWasmState;
    // TODO(mykola): Wrap in withNewExecutionContext;
    // Meta route is used to get the input schema of the function by the functions service.
    if (request.headers.get(FUNCTION_ROUTE_HEADER) === FunctionRouteValue.Meta) {
      return handleFunctionMetaCall(func, request);
    }

    try {
      const spaceId = new URL(request.url).searchParams.get('spaceId');
      if (spaceId) {
        if (!SpaceId.isValid(spaceId)) {
          return new Response('Invalid spaceId', { status: 400 });
        }
      }

      const serviceContainer = new ServiceContainer({}, env.DATA_SERVICE, env.QUEUE_SERVICE, env.FUNCTIONS_AI_SERVICE);
      // The bridged in-process rpc clients live for the duration of a single invocation.
      const serviceScope = Effect.runSync(Scope.make());
      try {
        const context = await createFunctionContext({
          serviceContainer,
          contextSpaceId: spaceId as SpaceId | undefined,
          serviceScope,
        });

        return EdgeResponse.success(await invokeFunction(func, context, request));
      } finally {
        await EffectEx.runPromise(Scope.close(serviceScope, Exit.void));
      }
    } catch (error: any) {
      log.error('error invoking function', { error, stack: error.stack });
      return EdgeResponse.failure({
        message: error?.message ?? 'Internal error',
        error,
      });
    }
  };
};

const invokeFunction = async (func: FunctionProtocol.Func, context: FunctionProtocol.Context, request: Request) => {
  // TODO(dmaretskyi): For some reason requests get wrapped like this.
  const { data } = await decodeRequest(request);

  return func.handler({
    context,
    data,
  });
};

const decodeRequest = async (request: Request) => {
  const {
    data: { bodyText, ...rest },
    trigger,
  } = (await request.json()) as any;

  if (!bodyText) {
    return { data: rest, trigger };
  }

  // Webhook passed body as bodyText. Use it as function input if a well-formatted JSON
  // TODO: better trigger input mapping
  try {
    const data = JSON.parse(bodyText);
    return { data, trigger: { ...trigger, ...rest } };
  } catch (err) {
    log.catch(err);
    return { data: { bodyText, ...rest } };
  }
};

const handleFunctionMetaCall = (functionDefinition: FunctionProtocol.Func, request: Request): Response => {
  const response: FunctionMetadata = {
    key: functionDefinition.meta.key,
    name: functionDefinition.meta.name,
    description: functionDefinition.meta.description,
    inputSchema: functionDefinition.meta.inputSchema as JsonSchemaType | undefined,
    outputSchema: functionDefinition.meta.outputSchema as JsonSchemaType | undefined,
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const createFunctionContext = async ({
  serviceContainer,
  contextSpaceId,
  serviceScope,
}: {
  serviceContainer: ServiceContainer;
  contextSpaceId: SpaceId | undefined;
  serviceScope: Scope.Scope;
}): Promise<FunctionProtocol.Context> => {
  const services = await serviceContainer.createServices();
  // Bridge the host Handlers to the effect-rpc client surface in-process (no wire hop), matching the
  // client shape consumers expect.
  const [dataService, queryService, queueService] = await EffectEx.runPromise(
    Effect.all([
      makeInProcessClient(DataService.Rpcs, services.dataService),
      makeInProcessClient(QueryService.Rpcs, services.queryService),
      makeInProcessClient(FeedService.Rpcs, services.queueService),
    ]).pipe(Effect.provideService(Scope.Scope, serviceScope)),
  );

  let spaceKey: string | undefined;
  let rootUrl: string | undefined;
  if (contextSpaceId) {
    const meta = await serviceContainer.getSpaceMeta(contextSpaceId);
    if (!meta) {
      throw new Error(`Space not found: ${contextSpaceId}`);
    }
    spaceKey = meta.spaceKey;
    invariant(!meta.rootDocumentId.startsWith('automerge:'));
    rootUrl = `automerge:${meta.rootDocumentId}`;
  }

  return {
    services: {
      dataService,
      queryService,
      queueService,
      functionsAiService: services.functionsAiService,
    },
    spaceId: contextSpaceId,
    spaceKey,
    spaceRootUrl: rootUrl,
  };
};
