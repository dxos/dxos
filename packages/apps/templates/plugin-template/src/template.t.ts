import { z, interactiveDirectory } from '@dxos/plate';
import sanitize from 'sanitize-filename';
import path from 'path';

export default interactiveDirectory({
  src: __filename.endsWith('.ts') ? __dirname : path.resolve(__dirname, '../../src'),
  inputShape: z.object({
    name: z.string().describe('Name the new package').default(path.basename(process.cwd())),
    createFolder: z.boolean().describe('Create a new folder for the project').default(true)
  }),
  options({ input, outputDirectory, ...rest }) {
    const { name, createFolder } = {...input};
    return {
      input,
      outputDirectory: createFolder ? path.resolve(outputDirectory, sanitize(name ?? '')) : outputDirectory,
      ...rest,
    };
  },
});