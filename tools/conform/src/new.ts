//
// Copyright 2022 DXOS.org
//

import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { inquire, z } from '@dxos/plate';

import packageTemplate from './templates/package/template.t';

const things = {
  package: path.resolve(__dirname, './templates/package'),
};

const templates = {
  package: packageTemplate,
};

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('new [thing]')
    .option('overwrite', {
      description: 'allow overwriting existing files',
      requiresArg: false,
      type: 'boolean',
      default: false,
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
            outputDirectory: z.string().describe('destination directory'),
          }),
        );
        const names = outputDirectory.split('/');
        const name = names[names.length - 1];
        const result = await templates[thing as keyof typeof templates].apply({
          outputDirectory,
          overwrite: overwrite ? !!overwrite : false,
          src: path.resolve(__dirname, 'templates', thing),
          input: {
            name: `@dxos/${name}`,
          },
        });
        await result.apply();
        console.log('done');
      },
    })
    .help().argv;
};

void main();
