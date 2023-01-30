import chalk from 'chalk';

import { defineConfig, z, text } from '@dxos/plate';
import { isDxosMonorepoSync } from './utils.t/getDxosRepoInfo';

export * from './utils.t/getDxosRepoInfo';
export * from './utils.t/nodePackage';

import appTsx from './src/App.tsx.t';
import indexHtml from './index.html.t';
import path from 'path';
export { appTsx, indexHtml };

export default defineConfig({
  exclude: ({ monorepo }) => ['project.json', 'tsconfig.plate.json', ...(monorepo ? ['patches/vite*'] : [])],
  inputShape: z
    .object({
      name: z.string().describe('Name the new package'),
      react: z.boolean().describe('Include react').default(true),
      tailwind: z.boolean().describe('Include tailwind (https://tailwindcss.com)').default(true),
      dxosUi: z.boolean().describe('Include DXOS UI packages for react').default(true),
      storybook: z.boolean().describe('Include a Storybook component sandbox (https://storybook.js.org)').default(true),
      pwa: z.boolean().describe('Enable PWA support').default(true),
      monorepo: z
        .boolean()
        .describe('Assume generated output is within the DXOS monorepo')
        .default(isDxosMonorepoSync())
    })
    .refine((val) => !(val.dxosUi && !(val.react && val.tailwind)), { message: 'dxosUi requires react and tailwind' })
    .refine((val) => !(val.storybook && !val.react), { message: 'storybook requires react' }),
  message: ({ outputDirectory, input: { name } }) => {
    const cwd = process.cwd();
    const relative = path.relative(cwd, outputDirectory);
    return text`
    
    Application ${chalk.bold(name)} created.

    Run the app:
    ${relative ? `$ cd ${relative}` : null}
    $ pnpm install
    $ pnpm serve

    See also:
    - ${path.join(relative, 'README.md')}
    - https://docs.dxos.org/guide/cli/app-templates
    
    `;
  }
});
