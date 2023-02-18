//
// Copyright 2022 DXOS.org
//

import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { executeDirectoryTemplate, inquire, z } from '@dxos/plate';

const things = {
  package: path.resolve(__dirname, './templates/package')
};

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('new [thing]')
    .option('overwrite', {
      description: 'allow overwriting existing files',
      requiresArg: false,
      type: 'boolean',
      default: false
    })
    .command({
      command: '*',
      describe: 'create a new thing',
      handler: async ({ _, overwrite }) => {
        const thing = _?.[0] as string;
        const templateDirectory = (things as any)[thing];
        if (!templateDirectory) {
          throw new Error('failed to new, invalid request: ' + thing);
        }
        const { outputDirectory } = await inquire(
          z.object({
            outputDirectory: z.string().describe('destination directory')
          })
        );
        const names = outputDirectory.split('/');
        const name = names[names.length - 1];
        const result = await executeDirectoryTemplate({
          outputDirectory,
          overwrite: overwrite ? !!overwrite : false,
          templateDirectory: path.resolve(__dirname, 'templates', thing),
          input: {
            name: `@dxos/${name}`
          }
        });
        void result.save();
        console.log('done');
      }
    })
    .help().argv;
};

void main();
