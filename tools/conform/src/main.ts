//
// Copyright 2022 DXOS.org
//

import minimatch from 'minimatch';
import path from 'path';
import readDir from 'recursive-readdir';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { executeDirectoryTemplate, loadInputs } from '@dxos/plate';

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('conform')
    .command({
      command: '*',
      describe: 'conform packages specified by glob',
      handler: async ({ _ }) => {
        const glob = (_?.[0] as string) ?? '**/package.json';
        const dirContents = await readDir(process.cwd(), [(file) => /node_modules/.test(file)]);
        const packages = dirContents.filter((file) => minimatch(file, glob)).map((pkg) => path.dirname(pkg));
        const promises = packages.map(async (pkg) =>
          executeDirectoryTemplate({
            outputDirectory: pkg,
            overwrite: false,
            templateDirectory: path.resolve(__dirname, './template'),
            input: await loadInputs(['package.json', 'README.yml'], {
              relativeTo: pkg
            })
          })
        );
        console.log(`conforming ${packages.length} packages ...`);
        const results = await Promise.all(promises);
        console.log(results.length, 'results');
        const savePromises = results.flat().map(async (file) => {
          const result = await file.save();
          console.log(result ? 'wrote' : 'skipped', file.shortDescription(process.cwd()));
        });
        await Promise.all(savePromises);
        console.log(packages.length, 'packages conformed');
      }
    })
    .help().argv;
};

void main();
