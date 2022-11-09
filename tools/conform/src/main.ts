import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import minimatch from 'minimatch';
import readDir from 'recursive-readdir';

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('conform')
    .command({
      command: '*',
      describe: 'conform packages specified by glob',
      handler: async ({ _ }) => {
        const glob = _?.[0] as string ?? '**/package.json';
        const dirContents = await readDir(process.cwd(), [(file) => /node_modules/.test(file)]);
        const packages = dirContents.filter((file) => minimatch(file, glob));
        console.log(packages);
      }
    })
    .help().argv;
};

main();
