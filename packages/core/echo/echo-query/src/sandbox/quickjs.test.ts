import { describe, test } from 'vitest';
import { newQuickJSWASMModuleFromVariant, newVariant, RELEASE_SYNC } from 'quickjs-emscripten';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - ?url returns a URL resolving to the given asset.
import wasmLocation from '@jitl/quickjs-wasmfile-release-sync/wasm?url';

const variant = newVariant(RELEASE_SYNC, {
  wasmLocation,
});

async function load() {
  return await newQuickJSWASMModuleFromVariant(variant);
}

test('works', async ({ onTestFinished }) => {
  const QuickJS = await load();

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
