//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { SchemaAST } from 'effect';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type ProcedureAst } from 'hyperformula/typings/parser';

import { Filter, getMeta } from '@dxos/client/echo';
import { toEffectSchema } from '@dxos/echo-schema';
import { FunctionType, getUserFunctionIdInMetadata } from '@dxos/functions';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

import { CellError, ErrorType, FunctionArgumentType } from '#hyperformula';

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
        } = await space.db.query(Filter.type(FunctionType, { binding })).run();
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

        const body: Record<string, any> = {};
        if (fn.inputSchema) {
          const schema = toEffectSchema(fn.inputSchema);
          SchemaAST.getPropertySignatures(schema.ast).forEach(({ name }, index) => {
            body[name.toString()] = args[index];
          });
        } else {
          body.args = args.filter(isNonNullable);
        }
        const id = getUserFunctionIdInMetadata(getMeta(fn));
        const response = await fetch(`${this.context.remoteFunctionUrl}/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await response.text();
        log('function executed', { result });

        return result;
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
