import { defineConfig, z } from '@dxos/plate';
import { isDxosMonorepoSync } from './utils.t/getDxosRepoInfo';

console.log('bare template', { defineConfig, z });

export default defineConfig({
  exclude: ['project.json', 'tsconfig.plate.json'],
  inputShape: z.object({
    name: z.string().describe('name the new package'),
    react: z.boolean().describe('use react').default(true),
    monorepo: z.boolean().describe('assume the generated output is within dxos monorepo').default(isDxosMonorepoSync()),
    dxosUi: z.boolean().describe('use the DXOS UI packages for react').default(true),
    storybook: z.boolean().describe('use storybook').default(true),
    pwa: z.boolean().describe('enable PWA support').default(true)
  })
});
