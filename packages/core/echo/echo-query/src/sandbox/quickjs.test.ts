import { createQuickJS } from '@dxos/vendor-quickjs';
import { expect, test } from 'vitest';
import { unwrapResult } from './quickjs';

test('works', async () => {
  const QuickJS = await createQuickJS();
  using context = QuickJS.newContext();

  using world = context.newString('world');
  context.setProp(context.global, 'NAME', world);

  using result = unwrapResult(context, context.evalCode(`"Hello " + NAME + "!"`));
  expect(context.dump(result)).toBe('Hello world!');
});

test('errors get propagated', async () => {
  const QuickJS = await createQuickJS();
  using runtime = QuickJS.newRuntime();
  using context = runtime.newContext();
  expect(() => unwrapResult(context, context.evalCode(`throw new Error('test')`))).toThrow();
});

test('global variables are shared in a context', async () => {
  const QuickJS = await createQuickJS();
  const context = QuickJS.newContext();

  unwrapResult(context, context.evalCode('globalThis.name = "world"')).dispose();
  using result = unwrapResult(context, context.evalCode(`"Hello " + name + "!"`));
  expect(context.dump(result)).toBe('Hello world!');
});

test('global variables are shared in a context created from runtime', async () => {
  const QuickJS = await createQuickJS();
  using runtime = QuickJS.newRuntime();
  using context = runtime.newContext();

  unwrapResult(context, context.evalCode('globalThis.name = "world"'));
  using result = unwrapResult(context, context.evalCode(`"Hello " + name + "!"`));
  expect(context.dump(result)).toBe('Hello world!');
});

test('load module', async () => {
  const QuickJS = await createQuickJS();
  using runtime = QuickJS.newRuntime({
    moduleLoader: (name, context) => {
      switch (name) {
        case 'test:name':
          return `
          export const name = 'world';
        `;
        default:
          throw new Error('unknown module');
      }
    },
  });
  using context = runtime.newContext();

  unwrapResult(context, context.evalCode('import { name } from "test:name"; globalThis.name = name;')).dispose();
  using result = unwrapResult(context, context.evalCode(`"Hello " + name + "!"`));
  expect(context.dump(result)).toBe('Hello world!');
});
