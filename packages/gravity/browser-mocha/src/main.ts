//
// Copyright 2021 DXOS.org
//

import yargs from 'yargs';

import { Browser, run } from './runner';

interface Argv {
  files: string[]
  stayOpen?: boolean
  headless?: boolean
  debug: boolean
  setup?: string
  browserArg?: string[]
  checkLeaks: boolean
  browser?: Browser[]
}

// eslint-disable-next-line no-unused-expressions
yargs(process.argv.slice(2))
  .command<Argv>('* <files...>', 'run tests on files',
    yargs => yargs
      .positional('files', {})
      .boolean('stayOpen')
      .boolean('headless')
      .boolean('debug')
      .string('setup')
      .string('browserArg')
      .array('browserArg')
      .boolean('checkLeaks')
      .string('browser')
      .array('browser'),
    async (argv) => {
      await run({
        files: argv.files as string[],
        browsers: argv.browser ?? [Browser.CHROMIUM],
        stayOpen: argv.stayOpen ?? false,
        setup: argv.setup,
        debug: argv.debug,
        browserArgs: argv.browserArg,
        headless: argv.headless ?? true,
        checkLeaks: argv.checkLeaks ?? true
      });
    }
  )
  .demandCommand(1)
  .argv;
