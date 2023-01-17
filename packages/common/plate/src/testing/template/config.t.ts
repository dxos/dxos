import { z, defineConfig } from '../..';

export default defineConfig({
  inputShape: z.object({
    name: z.string().default('mypackage').describe('the name of your package')
  })
});
