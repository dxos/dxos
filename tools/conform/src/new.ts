//
// Copyright 2022 DXOS.org
//

import minimatch from 'minimatch';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { executeDirectoryTemplate, catFiles, inquire, z } from '@dxos/plate';

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
            outputDirectory: z.string().describe('specify package location').default('packages')
          })
        );
        const promises = await executeDirectoryTemplate({
          outputDirectory,
          overwrite: overwrite ? !!overwrite : false,
          templateDirectory: path.resolve(__dirname, './template'),
          input: {
            name
          }
        });
        const results = await Promise.all(promises);
        console.log(results.length, 'results');
        const savePromises = results.flat().map(async (file) => {
          const result = await file.save();
          console.log(result ? 'wrote' : 'skipped', file.shortDescription(process.cwd()));
        });
        await Promise.all(savePromises);
      }
    })
    .help().argv;
};

void main();
