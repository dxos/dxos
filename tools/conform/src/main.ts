import yargs from 'yargs';
import { executeDirectoryTemplate, loadInputs } from '@dxos/plate';
import { hideBin } from 'yargs/helpers';
import minimatch from 'minimatch';
import readDir from 'recursive-readdir';
import path from 'path';

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
        console.log('conforming packages done');
        console.log(results.length, 'results');
        results.forEach((r) => r.map((r) => console.log(r.shortDescription(process.cwd()))));
      }
    })
    .help().argv;
};

main();
