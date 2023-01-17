//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import minimatch from 'minimatch';
import path from 'path';
import readDir from 'recursive-readdir';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { catFiles } from '@dxos/plate';

import template from './templates/readme/config.t';

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('conform [glob]')
    .option('overwrite', {
      description: 'allow overwriting existing files',
      requiresArg: false,
      type: 'boolean',
      default: false
    })
    .command({
      command: '*',
      describe: 'conform packages specified by glob',
      handler: async ({ _, overwrite }) => {
        const glob = (_?.[0] as string) ?? '**/package.json';
        const dirContents = await readDir(process.cwd(), [(file) => /node_modules|\/dist\//.test(file)]);
        const packages = dirContents
          .filter((file) => minimatch(path.relative(process.cwd(), file), glob))
          .map((pkg) => path.dirname(pkg));
        const promises = packages.map(async (pkg) =>
          template.execute({
            outputDirectory: pkg,
            overwrite: overwrite ? !!overwrite : false,
            input: await catFiles(['package.json', 'README.yml'], {
              relativeTo: pkg
            })
          })
        );
        console.log(`conforming ${packages.length} packages ...`);
        const results = await Promise.all(promises);
        console.log(results.length, 'results');
        const savePromises = results.flat().map(async (file) => {
          const result = await file.save();
          const msg = file.shortDescription(process.cwd());
          console.log(result ? 'wrote' : 'skip', result ? msg : chalk.gray(msg));
        });
        await Promise.all(savePromises);
        console.log(packages.length, 'packages conformed');
      }
    })
    .help().argv;
};

void main();
