import { defineConfig, z } from '@dxos/plate';
import { isDxosMonorepoSync } from './utils.t/getDxosRepoInfo';

export default defineConfig({
  exclude: ['project.json', 'tsconfig.plate.json'],
  inputShape: z.object({
    name: z.string().describe('name the new package'),
    monorepo: z.boolean().describe('assume the generated output is within dxos monorepo').default(isDxosMonorepoSync())
  })
});
