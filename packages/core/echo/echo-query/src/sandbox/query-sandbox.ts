//
// Copyright 2025 DXOS.org
//

import { Resource } from '@dxos/context';
import { Query, type QueryAST } from '@dxos/echo';
import { trim } from '@dxos/util';
import { type QuickJSRuntime, type QuickJSWASMModule, createQuickJS } from '@dxos/vendor-quickjs';

import envCode from '#query-env?raw';

import { unwrapResult } from './quickjs';

/**
 * Evaluates queries written in JavaScript using QuickJS.
 * Queries are expected to use the echo Query API.
 * `Query`, `Filter` and `Order` are provided as globals.
 */
export class QuerySandbox extends Resource {
  // Caching the wasm module.
  static quickJS: Promise<QuickJSWASMModule> | null = null;
  static getQuickJS() {
    if (!QuerySandbox.quickJS) {
      QuerySandbox.quickJS = createQuickJS();
    }

    return QuerySandbox.quickJS;
  }

  #runtime!: QuickJSRuntime;

  protected override async _open() {
    const quickJS = await QuerySandbox.getQuickJS();
    this.#runtime = quickJS.newRuntime({
      moduleLoader: (moduleName, _context) => {
        switch (moduleName) {
          case 'dxos:query-env':
            return envCode;
          default:
            throw new Error(`Module not found: ${moduleName}`);
        }
      },
    });
  }

  protected override async _close() {
    this.#runtime.dispose();
  }

  /**
   * Evaluates the query code.
   * @param queryCode Example: `Query.select(Filter.typename('dxos.org/type/Person'))`
   */
  eval(queryCode: string): QueryAST.Query {
    using context = this.#runtime.newContext();
    const globals = trim`
      import { Filter, Order, Query } from 'dxos:query-env';
      globalThis.Filter = Filter;
      globalThis.Order = Order;
      globalThis.Query = Query;
    `;

    unwrapResult(context, context.evalCode(globals)).dispose();
    using query = unwrapResult(context, context.evalCode(queryCode));
    const result = context.dump(query);
    if ('~Filter' in result) {
      return Query.select(result).ast;
    } else {
      return result.ast;
    }
  }
}
