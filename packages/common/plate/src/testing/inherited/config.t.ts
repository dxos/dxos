import { z, defineConfig } from '@dxos/plate';
import inherited from '../template/config.t';

export const inputShape = z.object({
  bar: z.boolean().describe('bar prompt').default(true)
});

const inheritedShape = inputShape.and(inherited.inputShape!);

export type Input = z.infer<typeof inheritedShape>;

export default defineConfig({
  inherits: '../template',
  inputShape: inheritedShape
});
