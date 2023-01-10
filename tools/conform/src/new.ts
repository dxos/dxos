//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
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
        const promises = await executeDirectoryTemplate({
          outputDirectory,
          overwrite: overwrite ? !!overwrite : false,
          templateDirectory: path.resolve(__dirname, 'templates', thing),
          input: {
            name: `@dxos/${name}`
          }
        });
        const results = await Promise.all(promises);
        const savePromises = results.flat().map(async (file) => {
          const result = await file.save();
          const msg = file.shortDescription(process.cwd());
          console.log(result ? 'wrote' : 'skipped', result ? msg : chalk.gray(msg));
        });
        await Promise.all(savePromises);
        console.log('done');
      }
    })
    .help().argv;
};

void main();
