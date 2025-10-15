//
// Copyright 2023 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type * as Types from 'effect/Types';

import { Obj, Type } from '@dxos/echo';
import { type HasId } from '@dxos/echo/internal';
import { type EchoDatabase } from '@dxos/echo-db';
import { assertArgument } from '@dxos/invariant';
import { type DXN, type SpaceId } from '@dxos/keys';
import { type QueryResult } from '@dxos/protocols';

import { FunctionType } from './schema';
import { type Services } from './services';
import { getUserFunctionIdInMetadata, setUserFunctionIdInMetadata } from './url';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Function handler.
 */
export type FunctionHandler<TData = {}, TOutput = any> = (params: {
  /**
   * Services and context available to the function.
   */
  context: FunctionContext;

  /**
   * Data passed as the input to the function.
   * Must match the function's input schema.
   * This will be the payload from the trigger or other data passed into the function in a workflow.
   */
  data: TData;
}) => TOutput | Promise<TOutput> | Effect.Effect<TOutput, any, Services>;

/**
 * Function context.
 */
export interface FunctionContext {
  /**
   * Space from which the function was invoked.
   */
  space: SpaceAPI | undefined;

  /**
   * Resolves a service available to the function.
   * @throws if the service is not available.
   */
  getService: <T extends Context.Tag<any, any>>(tag: T) => Context.Tag.Service<T>;

  getSpace: (spaceId: SpaceId) => Promise<SpaceAPI>;
}

export interface FunctionContextAi {
  // TODO(dmaretskyi): Refer to cloudflare AI docs for more comprehensive typedefs.
  run(model: string, inputs: any, options?: any): Promise<any>;
}

//
// API.
//

// TODO(dmaretskyi): Temporary API to get the queues working.
// TODO(dmaretskyi): To be replaced with integrating queues into echo.
export interface QueuesAPI {
  queryQueue(queue: DXN, options?: {}): Promise<QueryResult>;
  insertIntoQueue(queue: DXN, objects: HasId[]): Promise<void>;
}

/**
 * Space interface available to functions.
 */
export interface SpaceAPI {
  get id(): SpaceId;
  get db(): EchoDatabase;

  // TODO(dmaretskyi): Align with echo api: queues.get(id).append(items);
  get queues(): QueuesAPI;
}

// TODO(wittjosiah): Queues are incompatible.
const __assertFunctionSpaceIsCompatibleWithTheClientSpace = () => {
  // const _: SpaceAPI = {} as Space;
};

const typeId = Symbol.for('@dxos/functions/FunctionDefinition');

export type FunctionDefinition<T = any, O = any> = {
  [typeId]: true;
  key: string;
  name: string;
  description?: string;
  inputSchema: Schema.Schema<T, any>;
  outputSchema?: Schema.Schema<O, any>;
  handler: FunctionHandler<T, O>;
  meta?: {
    /**
     * Tools that are projected from functions have this annotation.
     *
     * deployedFunctionId:
     * - Backend deployment ID assigned by the EDGE function service (typically a UUID).
     * - Used for remote invocation via `FunctionInvocationService` → `RemoteFunctionExecutionService`.
     * - Persisted on the corresponding ECHO `FunctionType` object's metadata under the
     *   `FUNCTIONS_META_KEY` and retrieved with `getUserFunctionIdInMetadata`.
     */
    deployedFunctionId?: string;
  };
};

// TODO(dmaretskyi): Output type doesn't get typechecked.
export const defineFunction: {
  <I, O>(params: {
    key: string;
    name: string;
    description?: string;
    inputSchema: Schema.Schema<I, any>;
    outputSchema?: Schema.Schema<O, any>;
    handler: Types.NoInfer<FunctionHandler<I, O>>;
  }): FunctionDefinition<I, O>;
} = ({ key, name, description, inputSchema, outputSchema = Schema.Any, handler }) => {
  if (!Schema.isSchema(inputSchema)) {
    throw new Error('Input schema must be a valid schema');
  }
  if (typeof handler !== 'function') {
    throw new Error('Handler must be a function');
  }

  // Captures the function definition location.
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 2;
  const traceError = new Error();
  Error.stackTraceLimit = limit;
  let cache: false | string = false;
  const captureStackTrace = () => {
    if (cache !== false) {
      return cache;
    }
    if (traceError.stack !== undefined) {
      const stack = traceError.stack.split('\n');
      if (stack[2] !== undefined) {
        cache = stack[2].trim();
        return cache;
      }
    }
  };

  const handlerWithSpan = (...args: any[]) => {
    const result = (handler as any)(...args);
    if (Effect.isEffect(result)) {
      return Effect.withSpan(result, `${key ?? name}`, {
        captureStackTrace,
      });
    }
    return result;
  };

  return {
    [typeId]: true,
    key,
    name,
    description,
    inputSchema,
    outputSchema,
    handler: handlerWithSpan,
  };
};

export const FunctionDefinition = {
  make: defineFunction,
  isFunction: (value: unknown): value is FunctionDefinition.Any => {
    return typeof value === 'object' && value !== null && Symbol.for('@dxos/functions/FunctionDefinition') in value;
  },
  serialize: (functionDef: FunctionDefinition.Any): FunctionType => {
    assertArgument(FunctionDefinition.isFunction(functionDef), 'functionDef');
    return serializeFunction(functionDef);
  },
  deserialize: (functionObj: FunctionType): FunctionDefinition.Any => {
    assertArgument(Obj.instanceOf(FunctionType, functionObj), 'functionObj');
    return deserializeFunction(functionObj);
  },
};
export declare namespace FunctionDefinition {
  export type Any = FunctionDefinition<any, any>;
  export type Input<T extends FunctionDefinition> = T extends FunctionDefinition<infer I, any> ? I : never;
  export type Output<T extends FunctionDefinition> = T extends FunctionDefinition<any, infer O> ? O : never;
}

export const serializeFunction = (functionDef: FunctionDefinition<any, any>): FunctionType => {
  const fn = Obj.make(FunctionType, {
    key: functionDef.key,
    name: functionDef.name,
    version: '0.1.0',
    description: functionDef.description,
    inputSchema: Type.toJsonSchema(functionDef.inputSchema),
    outputSchema: !functionDef.outputSchema ? undefined : Type.toJsonSchema(functionDef.outputSchema),
  });
  if (functionDef.meta?.deployedFunctionId) {
    setUserFunctionIdInMetadata(Obj.getMeta(fn), functionDef.meta.deployedFunctionId);
  }
  return fn;
};

export const deserializeFunction = (functionObj: FunctionType): FunctionDefinition<unknown, unknown> => {
  return {
    [typeId]: true,
    // TODO(dmaretskyi): Fix key.
    key: functionObj.key ?? functionObj.name,
    name: functionObj.name,
    description: functionObj.description,
    inputSchema: !functionObj.inputSchema ? Schema.Unknown : Type.toEffectSchema(functionObj.inputSchema),
    outputSchema: !functionObj.outputSchema ? undefined : Type.toEffectSchema(functionObj.outputSchema),
    // TODO(dmaretskyi): This should throw error.
    handler: () => {},
    meta: {
      deployedFunctionId: getUserFunctionIdInMetadata(Obj.getMeta(functionObj)),
    },
  };
};
