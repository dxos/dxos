import { Resource } from '@dxos/context';
import { QuickJSContext, type QuickJSWASMModule, createQuickJS } from '@dxos/vendor-quickjs';

/**
 * Evaluates queries written in JavaScript using QuickJS.
 * Queries are expected to use the echo Query API.
 * `Query`, `Filter` and `Order` are provided as globals.
 */
export class QuerySandbox extends Resource {
  #vm!: QuickJSContext;

  protected override async _open() {
    const quickJS = await getQuickJS();
    this.#vm = quickJS.newContext();
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
