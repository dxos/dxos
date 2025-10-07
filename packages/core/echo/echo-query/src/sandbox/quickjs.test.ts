import { describe, test } from 'vitest';
import { getQuickJS } from 'quickjs-emscripten';

test('works', async ({ onTestFinished }) => {
  const QuickJS = await getQuickJS();

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
