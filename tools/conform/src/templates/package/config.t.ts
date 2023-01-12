import { defineConfig, z } from '@dxos/plate';

export default defineConfig({
  inputShape: z.object({
    name: z.string().describe('package name')
  })
});
