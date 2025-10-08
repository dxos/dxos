import { createQuickJS } from '@dxos/vendor-quickjs';
import { expect, test } from 'vitest';

test('works', async ({ onTestFinished }) => {
  const QuickJS = await createQuickJS();

  const vm = QuickJS.newContext();
  onTestFinished(() => vm.dispose());

  const world = vm.newString('world');
  vm.setProp(vm.global, 'NAME', world);
  world.dispose();

  const result = vm.evalCode(`"Hello " + NAME + "!"`);
  if (result.error) {
    throw new Error('Execution failed:', vm.dump(result.error));
  } else {
    console.log('Success:', vm.dump(result.value));
    expect(vm.dump(result.value)).toBe('Hello world!');
    result.value.dispose();
  }
});
