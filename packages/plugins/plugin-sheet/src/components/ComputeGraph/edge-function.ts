//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { CellError, ErrorType, FunctionArgumentType } from 'hyperformula';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type ProcedureAst } from 'hyperformula/typings/parser';

import { Filter, getMeta } from '@dxos/client/echo';
import { getUserFunctionUrlInMetadata } from '@dxos/plugin-script/edge';
import { FunctionType } from '@dxos/plugin-script/types';

import { type AsyncFunction, FunctionPluginAsync } from './async-function';

const EDGE_FUNCTION_TTL = 10_000;

/**
 * A hyperformula function plugin for calling EDGE functions.
 *
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
export class EdgeFunctionPlugin extends FunctionPluginAsync {
  edge(ast: ProcedureAst, state: InterpreterState) {
    const handler =
      (subscribe = false): AsyncFunction =>
      // TODO(wittjosiah): Accept arbitrary args.
      async (binding: string) => {
        const space = this.context.space;
        if (!space) {
          return new CellError(ErrorType.REF, 'Missing space');
        }

        const {
          objects: [fn],
        } = await space.db.query(Filter.schema(FunctionType, { binding })).run();
        if (!fn) {
          return new CellError(ErrorType.REF, 'Function not found');
        }

        if (subscribe) {
          const unsubscribe = effect(() => {
            const _ = fn?.version;

            // If the function changes, force a recalculation.
            this.runAsyncFunction(ast, state, handler(false), { ttl: 0 });
          });

          this.context.createSubscription(ast.procedureName, unsubscribe);
        }

        const path = getUserFunctionUrlInMetadata(getMeta(fn));
        const result = await fetch(`${this.context.remoteFunctionUrl}${path}`, { method: 'POST' });
        return await result.text();
      };

    return this.runAsyncFunction(ast, state, handler(true), { ttl: EDGE_FUNCTION_TTL });
  }
}

EdgeFunctionPlugin.implementedFunctions = {
  EDGE: {
    method: 'edge',
    parameters: [{ argumentType: FunctionArgumentType.STRING }],
    isVolatile: true,
  },
};

export const EdgeFunctionPluginTranslations = {
  enGB: {
    EDGE: 'EDGE',
  },
  enUS: {
    EDGE: 'EDGE',
  },
};
