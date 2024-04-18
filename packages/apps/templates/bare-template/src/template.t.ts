import chalk from 'chalk';

import { z, interactiveDirectory, plate } from '@dxos/plate';
import { isDxosMonorepoSync } from './utils.t/getDxosRepoInfo';

export * from './utils.t/getDxosRepoInfo';
export * from './utils.t/nodePackage';

import path from 'path';
import sanitize from 'sanitize-filename';

export default interactiveDirectory({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../src'),
  exclude: ({ monorepo }) => ['project.json', 'tsconfig.plate.json', ...(monorepo ? ['patches/vite*'] : [])],
  inputShape: z
    .object({
      name: z.string().describe('Name the new package').default(path.basename(process.cwd())),
      createFolder: z.boolean().describe('Create a new folder for the project').default(true),
      react: z.boolean().describe('Include react').default(true),
      dxosUi: z.boolean().describe('Include the DXOS UI system for react').default(true),
      tailwind: z.boolean().describe('Include tailwind (https://tailwindcss.com)').default(true),
      storybook: z.boolean().describe('Include a Storybook component sandbox (https://storybook.js.org)').default(true),
      pwa: z.boolean().describe('Include PWA support').default(false),
      schema: z.boolean().describe('Include Effect Schema for typed ECHO objects').default(false),
      monorepo: z
        .boolean()
        .describe('Assume generated output is within the DXOS monorepo')
        .default(isDxosMonorepoSync()),
    })
    .refine((val) => !(val.dxosUi && !(val.react && val.tailwind)), { message: 'dxosUi requires react and tailwind' })
    .refine((val) => !(val.storybook && !val.react), { message: 'storybook requires react' }),
  inputQuestions: {
    dxosUi: { when: ({ react }) => react, default: ({ react }) => react },
    tailwind: { when: ({ react, dxosUi }) => !react || !dxosUi },
    storybook: { when: ({ react }) => react, default: ({ react }) => react },
  },
  options({ input, outputDirectory, ...rest }) {
    const { name, createFolder } = { ...input };
    return {
      input,
      outputDirectory: createFolder ? path.resolve(outputDirectory, sanitize(name ?? '')) : outputDirectory,
      ...rest,
    };
  },
  after({ outputDirectory, input: { name } }) {
    const cwd = process.cwd();
    const relative = path.relative(cwd, outputDirectory);
    console.log(plate`
    
    Application ${chalk.green(chalk.bold(name))} created.

    Run the app:
    ${!!relative && `$ cd ${relative}`}
    $ npm install
    $ npm run serve

    See also:
    - ${path.join(relative, 'README.md')}
    - https://docs.dxos.org/guide/cli/app-templates
    `);
  },
});
