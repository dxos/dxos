//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type AiService } from '@dxos/ai';
import { Obj, Type } from '@dxos/echo';
import { type DatabaseService } from '@dxos/echo-db';
import { failedInvariant, assertArgument } from '@dxos/invariant';
import { Context } from 'effect';

import {
  type CredentialsService,
  type FunctionInvocationService,
  type QueueService,
  type TracingService,
} from './services';
import { Function } from './types';
import { getUserFunctionIdInMetadata, setUserFunctionIdInMetadata } from './url';

// TODO(burdon): Model after http request. Ref Lambda/OpenFaaS.
// https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
// https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml/#functions
// https://www.npmjs.com/package/aws-lambda

/**
 * Services that are provided at the function call site by the caller.
 */
export type InvocationServices = TracingService;

/**
 * Services that are available to invoked functions.
 */
export type FunctionServices =
  | InvocationServices
  | AiService.AiService
  | CredentialsService
  | DatabaseService
  | QueueService
  | FunctionInvocationService;

/**
 * Function handler.
 */
export type FunctionHandler<TData = {}, TOutput = any, S extends FunctionServices = never> = (params: {
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
}) => TOutput | Promise<TOutput> | Effect.Effect<TOutput, any, S>;

/**
 * Function context.
 */
export interface FunctionContext {
  // TODO(dmaretskyi):
}

const typeId = Symbol.for('@dxos/functions/FunctionDefinition');

export type FunctionDefinition<T = any, O = any, S extends FunctionServices = never> = {
  [typeId]: true;
  key: string;
  name: string;
  description?: string;
  inputSchema: Schema.Schema<T, any>;
  outputSchema?: Schema.Schema<O, any>;

  /**
   * Keys of the required services.
   */
  services: readonly string[];

  handler: FunctionHandler<T, O, S>;
  meta?: {
    /**
     * Tools that are projected from functions have this annotation.
     *
     * deployedFunctionId:
     * - Backend deployment ID assigned by the EDGE function service (typically a UUID).
     * - Used for remote invocation via `FunctionInvocationService` → `RemoteFunctionExecutionService`.
     * - Persisted on the corresponding ECHO `Function.Function` object's metadata under the
     *   `FUNCTIONS_META_KEY` and retrieved with `getUserFunctionIdInMetadata`.
     */
    deployedFunctionId?: string;
  };
};

export type FunctionProps<T, O> = {
  key: string;
  name: string;
  description?: string;
  inputSchema: Schema.Schema<T, any>;
  outputSchema?: Schema.Schema<O, any>;
  // TODO(dmaretskyi): This currently doesn't cause a compile-time error if the handler requests a service that is not specified
  services?: readonly Context.Tag<any, any>[];

  handler: FunctionHandler<T, O, FunctionServices>;
};

// TODO(dmaretskyi): Output type doesn't get typechecked.
export const defineFunction: {
  <I, O>(params: FunctionProps<I, O>): FunctionDefinition<I, O, FunctionServices>;
} = ({ key, name, description, inputSchema, outputSchema = Schema.Any, handler, services }) => {
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
    services: !services ? [] : getServiceKeys(services),
  } satisfies FunctionDefinition.Any;
};

const getServiceKeys = (services: readonly Context.Tag<any, any>[]) => {
  return services.map((tag: any) => {
    if (typeof tag.key === 'string') {
      return tag.key;
    }
    console.log(tag);
    failedInvariant();
  });
};

export const FunctionDefinition = {
  make: defineFunction,
  isFunction: (value: unknown): value is FunctionDefinition.Any => {
    return typeof value === 'object' && value !== null && Symbol.for('@dxos/functions/FunctionDefinition') in value;
  },
  serialize: (functionDef: FunctionDefinition.Any): Function.Function => {
    assertArgument(FunctionDefinition.isFunction(functionDef), 'functionDef');
    return serializeFunction(functionDef);
  },
  deserialize: (functionObj: Function.Function): FunctionDefinition.Any => {
    assertArgument(Obj.instanceOf(Function.Function, functionObj), 'functionObj');
    return deserializeFunction(functionObj);
  },
};
export declare namespace FunctionDefinition {
  export type Any = FunctionDefinition<any, any>;
  export type Input<T extends FunctionDefinition> = T extends FunctionDefinition<infer I, any> ? I : never;
  export type Output<T extends FunctionDefinition> = T extends FunctionDefinition<any, infer O> ? O : never;
}

export const serializeFunction = (functionDef: FunctionDefinition<any, any>): Function.Function => {
  const fn = Function.make({
    key: functionDef.key,
    name: functionDef.name,
    version: '0.1.0',
    description: functionDef.description,
    inputSchema: Type.toJsonSchema(functionDef.inputSchema),
    outputSchema: !functionDef.outputSchema ? undefined : Type.toJsonSchema(functionDef.outputSchema),
    services: functionDef.services,
  });
  if (functionDef.meta?.deployedFunctionId) {
    setUserFunctionIdInMetadata(Obj.getMeta(fn), functionDef.meta.deployedFunctionId);
  }
  return fn;
};

export const deserializeFunction = (functionObj: Function.Function): FunctionDefinition<unknown, unknown> => {
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
    services: functionObj.services ?? [],
    meta: {
      deployedFunctionId: getUserFunctionIdInMetadata(Obj.getMeta(functionObj)),
    },
  };
};
