import envCode from '#query-env?raw';
import { Resource } from '@dxos/context';
import { todo } from '@dxos/debug';
import type { QueryAST } from '@dxos/echo';
import { type QuickJSRuntime, type QuickJSWASMModule, createQuickJS } from '@dxos/vendor-quickjs';
import { unwrapResult } from './quickjs';

/**
 * Evaluates queries written in JavaScript using QuickJS.
 * Queries are expected to use the echo Query API.
 * `Query`, `Filter` and `Order` are provided as globals.
 */
export class QuerySandbox extends Resource {
  #runtime!: QuickJSRuntime;

  protected override async _open() {
    const quickJS = await getQuickJS();
    this.#runtime = quickJS.newRuntime({
      moduleLoader: (moduleName, context) => {
        switch (moduleName) {
          case 'dxos:query-env':
            // return mockEnvCode;
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
    unwrapResult(
      context,
      context.evalCode(
        ` 
        import { Query, Filter, Order } from 'dxos:query-env';
        globalThis.Query = Query;
        globalThis.Filter = Filter;
        globalThis.Order = Order;
      `,
      ),
    ).dispose();

    using query = unwrapResult(context, context.evalCode(queryCode));
    console.log({ query: context.dump(query) });

    return todo();
  }
}

// Caching the wasm module.
let quickJS: Promise<QuickJSWASMModule> | null = null;
const getQuickJS = () => {
  if (!quickJS) {
    quickJS = createQuickJS();
  }
  return quickJS;
};

const mockEnvCode = `export const Query = {
  select(filter) {
    return {
      ast: {
        type: 'select',
        filter: filter.ast,
      },
    };
  },
};

export const Filter = {
  typename(typename) {
    return {
      ast: {
        type: 'type',
        typename,
      },
    };
  },
}

export const Order = {
}

`;
