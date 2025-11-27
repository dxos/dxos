//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import * as Effect from 'effect/Effect';
import * as SchemaAST from 'effect/SchemaAST';

import { Filter } from '@dxos/client/echo';
import { JsonSchema } from '@dxos/echo';
import { Function, FunctionInvocationService, TracingService } from '@dxos/functions';
import { FunctionDefinition } from '@dxos/functions';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';
import { type ProcedureAst } from '@dxos/vendor-hyperformula';
import { type InterpreterState } from '@dxos/vendor-hyperformula';
import { CellError, ErrorType, FunctionArgumentType } from '@dxos/vendor-hyperformula';

import { type AsyncFunction, AsyncFunctionPlugin } from './async-function';

export const EDGE_FUNCTION_NAME = 'DX';

const FUNCTION_TTL = 10_000;

/**
 * A hyperformula function plugin for calling remote (EDGE) functions.
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
export class EdgeFunctionPlugin extends AsyncFunctionPlugin {
  dx(ast: ProcedureAst, state: InterpreterState) {
    const handler =
      (subscribe = false): AsyncFunction =>
      async (binding: string, ...args: any) => {
        const space = this.context.space;
        if (!space) {
          return new CellError(ErrorType.REF, 'Missing space');
        }

        const {
          objects: [fn],
        } = await space.db.query(Filter.type(Function.Function, { binding })).run();
        if (!fn) {
          log.info('Function not found', { binding });
          return new CellError(ErrorType.REF, 'Function not found');
        }

        if (subscribe) {
          const unsubscribe = effect(() => {
            log('function changed', { fn });
            const _ = fn?.version;

            // TODO(wittjosiah): `ttl` should be 0 to force a recalculation when a new version is deployed.
            //  This needs a ttl to prevent a binding change from causing the function not to be found.
            this.runAsyncFunction(ast, state, handler(false), { ttl: FUNCTION_TTL });
          });

          this.context.createSubscription(ast.procedureName, unsubscribe);
        }

        const runtime = this.context.runtime;
        const functionDef = FunctionDefinition.deserialize(fn);
        // If input schema exists, construct an object from args using the schema props order, otherwise pass { args }.
        let input: any;
        if (fn.inputSchema) {
          const schema = JsonSchema.toEffectSchema(fn.inputSchema);
          const props = SchemaAST.getPropertySignatures(schema.ast);
          input = {} as any;
          props.forEach(({ name }, index) => {
            input[name.toString()] = args[index];
          });
        } else {
          input = { args: args.filter(isNonNullable) };
        }
        const result = runtime.runPromise(
          Effect.gen(function* () {
            return yield* FunctionInvocationService.invokeFunction(functionDef, input);
          }).pipe(Effect.provide(TracingService.layerNoop)),
        );
        return result as any;
      };

    return this.runAsyncFunction(ast, state, handler(true), { ttl: FUNCTION_TTL });
  }
}

EdgeFunctionPlugin.implementedFunctions = {
  [EDGE_FUNCTION_NAME]: {
    method: 'dx',
    parameters: [
      // Binding
      { argumentType: FunctionArgumentType.STRING },

      // Remote function arguments (currently supporting up to 8).
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
      { argumentType: FunctionArgumentType.ANY, optionalArg: true },
    ],
    isVolatile: true,
  },
};

export const EdgeFunctionPluginTranslations = {
  enGB: {
    [EDGE_FUNCTION_NAME]: 'Remote function',
  },
  enUS: {
    [EDGE_FUNCTION_NAME]: 'Remote function',
  },
};
