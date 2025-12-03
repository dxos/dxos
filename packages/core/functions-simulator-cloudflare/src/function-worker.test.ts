import { describe, expect, test } from 'vitest';
import { FunctionWorker, makeJsModule } from './function-worker';

describe('FunctionWorker', async () => {
  test('hello world', async () => {
    await using worker = new FunctionWorker({
      mainModule: 'index.js',
      modules: {
        'index.js': makeJsModule(`
          export default {
            async fetch(request, env, ctx) {
              return new Response(JSON.stringify({ success: true, data: 'Hello Miniflare!' }));
            }
          }
        `),
      },
    });
    const result = await worker.invoke({});
    expect(result).toEqual({ _kind: 'success', result: 'Hello Miniflare!' });
  });

  test('multiple modules', async () => {
    await using worker = new FunctionWorker({
      mainModule: 'index.js',
      modules: {
        'const.js': makeJsModule(`
          export const constValue = 'Hello Miniflare!';
        `),
        'index.js': makeJsModule(`
          import { constValue } from './const.js';
          export default {
            async fetch(request, env, ctx) {
              return new Response(JSON.stringify({ success: true, data: constValue }));
            }
          }
        `),
      },
    });
    const result = await worker.invoke({});
    expect(result).toEqual({ _kind: 'success', result: 'Hello Miniflare!' });
  });
});
