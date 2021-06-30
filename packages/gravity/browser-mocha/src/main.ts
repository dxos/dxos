//
// Copyright 2021 DXOS.org
//

import yargs from 'yargs';

import { Browser, run } from '.';

interface Argv {
  files: string[]
  show: boolean
  setup?: string
}

// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))
  .command<Argv>('* <files...>', 'run tests on files',
    yargs => yargs
      .positional('files', {})
      .boolean('show')
      .string('setup'),
    async (argv) => {
      await run({
        files: argv.files as string[],
        browsers: [Browser.CHROMIUM],
        show: argv.show,
        setup: argv.setup
      });
    }
  )
  .demandCommand(1)
  .argv;
