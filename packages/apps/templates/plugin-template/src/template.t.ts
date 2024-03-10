import { z, plate, interactiveDirectory } from '@dxos/plate';
import sanitize from 'sanitize-filename';
import path from 'path';
import chalk from 'chalk';

export default interactiveDirectory({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../src'),
  inputShape: z.object({
    name: z.string().describe('Name the new package').default(path.basename(process.cwd())),
    createFolder: z.boolean().describe('Create a new folder for the project').default(true),
    defaultPlugins: z.boolean().describe('Include default plugins').default(true),
  }),
  options({ input, outputDirectory, ...rest }) {
    const { name, createFolder } = {...input};
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
    
    Plugin ${chalk.green(chalk.bold(name))} created.

    Run the app:
    ${!!relative && `$ cd ${relative}`}
    $ npm install
    $ npm run dev

    See also:
    - ${path.join(relative, 'README.md')}

    Warning:
    - pnpm is not supported for now, please use npm. (issue locating css in node_modules).
    `);
  },
});