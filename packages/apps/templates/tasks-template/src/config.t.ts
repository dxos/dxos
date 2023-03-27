import { z, defineConfig } from '@dxos/plate';
import inherits from '@dxos/bare-template';

export default defineConfig({
  inherits,
  inputShape: z.object({
    name: z.string().default('tasks').describe('Name the new package')
  })
});
