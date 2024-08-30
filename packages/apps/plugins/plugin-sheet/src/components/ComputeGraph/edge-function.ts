//
// Copyright 2024 DXOS.org
//

import { CellError, ErrorType, FunctionArgumentType } from 'hyperformula';
import { type InterpreterState } from 'hyperformula/typings/interpreter/InterpreterState';
import { type ProcedureAst } from 'hyperformula/typings/parser';

import { getUserFunctionUrlInMetadata } from '@braneframe/plugin-script/edge';
import { ScriptType } from '@braneframe/plugin-script/types';
import { Filter, getMeta } from '@dxos/client/echo';

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
        return new CellError(ErrorType.VALUE, 'No space');
      }

      const {
        objects: [script],
      } = await space.db.query(Filter.schema(ScriptType, { binding })).run();
      if (!script) {
        return new CellError(ErrorType.VALUE, 'No script');
      }

      const path = getUserFunctionUrlInMetadata(getMeta(script));
      // TODO(wittjosiah): Get base url from client config.
      const result = await fetch(`https://functions-staging.dxos.workers.dev${path}`, { method: 'POST' });
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
