import { createQuickJS } from '@dxos/vendor-quickjs';
import { test } from 'vitest';

test('works', async ({ onTestFinished }) => {
  const QuickJS = await createQuickJS();

  const vm = QuickJS.newContext();
  onTestFinished(() => vm.dispose());

  const world = vm.newString('world');
  vm.setProp(vm.global, 'NAME', world);
  world.dispose();

  const result = vm.evalCode(`"Hello " + NAME + "!"`);
  if (result.error) {
    console.log('Execution failed:', vm.dump(result.error));
    result.error.dispose();
  } else {
    console.log('Success:', vm.dump(result.value));
    result.value.dispose();
  }
});
