//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import * as process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { processFiles } from './processor.js';

const main = () => {
  yargs(hideBin(process.argv))
    .scriptName('ridoculous')
    .option('files', {
      description: 'Markdown files glob',
      type: 'string',
      default: 'docs/**/*.md'
    })
    .option('baseDir', {
      description: 'Root directory for referenced files',
      type: 'string'
    })
    .option('autoNumber', {
      description: 'Generate auto-numbered headings',
      type: 'boolean'
    })
    .option('html', {
      description: 'Output HTML',
      type: 'boolean'
    })
    .option('verbose', {
      type: 'boolean'
    })
    .command({
      command: '*',
      describe: 'Markdown processor to enhance Github docs (e.g., table of contents; snippets; links).',
      handler: ({
        autoNumber,
        baseDir,
        files,
        html,
        verbose
      }: {
        autoNumber: boolean,
        baseDir: string,
        files: string,
        html: boolean,
        verbose: boolean
      }) => {
        debug.enable(process.env.DEBUG ?? verbose ? 'dxos:ridoculous:*' : 'dxos:ridoculous:error');
        void processFiles({
          autoNumber,
          baseDir,
          files,
          html,
          verbose
        });
      }
    })
    .help()
    .argv;
};

void main();
