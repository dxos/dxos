//
// Copyright 2022 DXOS.org
//

import * as process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { processFiles } from './processor.js';

const main = () => {
  yargs(hideBin(process.argv))
    .scriptName('ridoculous')
    .option('autoNumber', {
      description: 'Generate auto-numbered headings',
      type: 'boolean'
    })
    .option('baseDir', {
      description: 'Root directory (otherwise assumes relative)',
      type: 'string'
    })
    .option('dryRun', {
      description: 'Run without writing files',
      type: 'boolean'
    })
    .option('files', {
      description: 'Markdown files glob',
      type: 'string',
      default: './docs/**/*.md'
    })
    .option('html', {
      description: 'Output HTML',
      type: 'boolean'
    })
    .option('outDir', {
      description: 'Output directory',
      type: 'string',
      default: './out'
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
        dryRun,
        files,
        html,
        outDir,
        verbose
      }: {
        autoNumber: boolean,
        baseDir: string,
        dryRun: boolean,
        files: string,
        html: boolean,
        outDir: string,
        verbose: boolean
      }) => {
        void processFiles({
          autoNumber,
          baseDir,
          dryRun,
          files,
          html,
          outDir,
          verbose
        });
      }
    })
    .help()
    .argv;
};

void main();
