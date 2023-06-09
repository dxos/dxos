import { z, defineConfig, TemplateFunction, TemplateContext } from '@dxos/plate';
import inherits from '@dxos/bare-template';

const withInputs: <T>(template: TemplateFunction<T>, inputs: Partial<T>) => TemplateFunction =
  (fun, input) =>
  <T>(o: TemplateContext<T>) =>
    fun({ ...o, input: { ...o?.input, ...input } as any });

export default defineConfig({
  inherits: inherits,
  inputShape: inherits.inputShape,
  defaults: {
    react: true,
    dxosUi: true,
    tailwind: true
  },
});
