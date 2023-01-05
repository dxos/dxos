import { defineConfig, z } from '@dxos/plate';
import { isDxosMonorepoSync } from './utils.t/getDxosRepoInfo';

export default defineConfig({
  exclude: ['project.json', 'tsconfig.plate.json'],
  inputShape: z.object({
    name: z.string().describe('Name the new package'),
    react: z.boolean().describe('Use react').default(true),
    monorepo: z.boolean().describe('Assume generated output is within dxos monorepo').default(isDxosMonorepoSync()),
    dxosUi: z.boolean().describe('Use DXOS UI packages for react').default(true),
    storybook: z.boolean().describe('Use Storybook (https://storybook.js.org/)').default(true),
    pwa: z.boolean().describe('Enable PWA support').default(true)
  })
});
