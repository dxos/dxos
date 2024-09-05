//
// Copyright 2024 DXOS.org
//

import { CellError, ErrorType, FunctionArgumentType } from 'hyperformula';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type ProcedureAst } from 'hyperformula/typings/parser';

import { Filter, getMeta } from '@dxos/client/echo';
import { getUserFunctionUrlInMetadata } from '@dxos/plugin-script/edge';
import { FunctionType } from '@dxos/plugin-script/types';

import { type AsyncFunction, FunctionPluginAsync } from './async-function';

/**
 * A hyperformula function plugin for calling EDGE functions.
 *
 * https://hyperformula.handsontable.com/guide/custom-functions.html#add-a-simple-custom-function
 */
export class EdgeFunctionPlugin extends FunctionPluginAsync {
  edge(ast: ProcedureAst, state: InterpreterState) {
    const handler: AsyncFunction = async (binding: string) => {
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

      const path = getUserFunctionUrlInMetadata(getMeta(fn));
      const result = await fetch(`${this.context.remoteFunctionUrl}${path}`, { method: 'POST' });
      return await result.text();
    };

    return this.runAsyncFunction(ast, state, handler, { ttl: 10_000 });
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
