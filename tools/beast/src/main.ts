//
// Copyright 2022 DXOS.org
//

import path from 'path';
import * as process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Processor } from './processor';

const main = () => {
  yargs(hideBin(process.argv))
    .scriptName('beast')
    .option('project', {
      description: 'Project',
      type: 'string',
      default: '*'
    })
    .option('filter', {
      description: 'Dependency filter',
      type: 'string',
      default: '@dxos/*'
    })
    .option('verbose', {
      type: 'boolean'
    })
    .command({
      command: 'check',
      describe: 'Checks for cycles.',
      handler: ({
        project,
        filter,
        verbose
      }: {
        project?: string
        filter?: string
        verbose?: boolean
      }) => {
        new Processor(
          path.join(process.cwd(), '../..')
        ).run({ project, filter, verbose });
      }
    })
    .help()
    .argv;
};

void main();
