import { z, defineConfig } from '../..';

const inputShape = z.object({
  name: z.string().default('mypackage').describe('the name of your package')
});

export type Input = z.infer<typeof inputShape>;

export default defineConfig({ inputShape });
