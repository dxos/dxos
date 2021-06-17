import yargs from 'yargs';
import { Browser, run } from '.';

yargs(process.argv.slice(2))
  .command('* <files...>', 'run tests on files',
    yargs => yargs.positional('files', {}),
    async (argv) => {
      await run({
        files: argv.files as string[],
        browsers: [Browser.CHROMIUM],
      })
   }
  )
  .demandCommand(1)
  .argv

