#!/usr/bin/env node

//
// Copyright 2022 DXOS.org
//

import process from 'node:process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { executeDirectoryTemplate } from './api';
import { catFiles } from './util/catFiles';
import { logger } from './util/logger';

const fmtDuration = (d: number) => `${Math.floor(d / 1000)}.${d - Math.floor(d / 1000) * 1000}s`;

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('plate')
    .usage('$0 <template> [options]', 'execute a @dxos/plate template')
    .option('dry', {
      description: 'Show only what files would be generated without writing them to disk',
      type: 'boolean',
      default: false,
    })
    .option('input', {
      description: 'Comma separated filenames of json or yaml files to merge as input',
      type: 'string',
    })
    .option('output', {
      description: 'Destination folder',
      requiresArg: true,
      type: 'string',
    })
    .option('include', {
      description: 'filter the template files by a set of glob strings (comma separated)',
      requiresArg: false,
      type: 'string',
    })
    .option('exclude', {
      description: 'globs to exclude entries from the template (comma separated)',
      requiresArg: false,
      type: 'string',
    })
    .option('sequential', {
      description: 'Run templates one after the other instead of in parallel',
      requiresArg: false,
      type: 'boolean',
    })
    .option('verbose', {
      description: 'Print debugging information',
      requiresArg: false,
      type: 'boolean',
    })
    .option('quiet', {
      description: 'Print nothing to standard out',
      requiresArg: false,
      type: 'boolean',
      default: false,
    })
    .option('overwrite', {
      description: 'allow overwriting existing files or not',
      requiresArg: false,
      type: 'boolean',
    })
    .option('interactive', {
      description: 'allow templates to ask questions interactively',
      requiresArg: false,
      type: 'boolean',
      default: true,
    })
    .option('executeFileTemplates', {
      description: 'execute any .t.ts files discovered in the template directory',
      requiresArg: false,
      type: 'boolean',
      default: true,
    })
    .options('inheritance', {
      description: 'controls whether inherited templates should be executed',
      requiresArg: false,
      type: 'boolean',
    })
    .options('printMessage', {
      description: 'whether to print the template message if any',
      requiresArg: false,
      type: 'boolean',
    })
    .command({
      command: '*',
      describe: 'execute a @dxos/plate template',
      handler: async (
        args: {
          _: string[];
          dry: boolean;
          input: string;
          output: string;
          include: string;
          exclude: string;
          sequential: boolean;
          verbose: boolean;
          overwrite: boolean;
          quiet: boolean;
          interactive: boolean;
          executeFileTemplates: boolean;
          inheritance: boolean;
          printMessage: boolean;
        } & any,
      ) => {
        const tstart = Date.now();
        const {
          _,
          input,
          output = process.cwd(),
          include,
          exclude,
          sequential = false,
          verbose = false,
          quiet = false,
          overwrite,
          interactive,
          ...restArgs
        } = args;
        const debug = logger(verbose);
        const info = logger(!quiet);
        const [template] = _;
        if (!template) {
          console.error('no template specified');
          process.exit(1);
        }
        debug('working directory', process.cwd());
        const extraArgs = { ...restArgs };
        delete extraArgs.$0; // yargs cruft
        const result = await executeDirectoryTemplate({
          src: template,
          outputDirectory: output,
          input: input ? await catFiles(input?.split(',')) : extraArgs,
          parallel: !sequential,
          verbose,
          overwrite,
          include: include?.split(','),
          exclude: exclude?.split(','),
          interactive,
        });
        debug(`output folder: ${output}`);
        info(`template generated ${result.files.length} files ...`);
        const { filesWritten } = await result.apply();
        info(`wrote ${filesWritten} files [${fmtDuration(Date.now() - tstart)}]`);
      },
    }).argv;
};

void main();
