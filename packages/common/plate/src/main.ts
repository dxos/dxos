#!/usr/bin/env node

//
// Copyright 2022 DXOS.org
//

import process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { catFiles } from './catFiles';

import { executeDirectoryTemplate } from './executeDirectoryTemplate';
import { includeExclude } from './includeExclude';
import { logger } from './logger';

const fmtDuration = (d: number) => `${Math.floor(d / 1000)}.${d - Math.floor(d / 1000) * 1000}s`;

const main = async () => {
  yargs(hideBin(process.argv))
    .scriptName('plate')
    .option('dry', {
      description: 'Show only what files would be generated without writing them to disk',
      type: 'boolean',
      default: false
    })
    .option('input', {
      description: 'Comma separated filenames of json or yaml files to merge as input',
      type: 'string'
    })
    .option('output', {
      description: 'Destination folder',
      requiresArg: true,
      type: 'string'
    })
    .option('include', {
      description: 'filter the template files by a set of glob strings (comma separated)',
      requiresArg: false,
      type: 'string'
    })
    .option('exclude', {
      description: 'globs to exclude entries from the template (comma separated)',
      requiresArg: false,
      type: 'string'
    })
    .option('sequential', {
      description: 'Run templates one after the other instead of in parallel',
      requiresArg: false,
      type: 'boolean'
    })
    .option('verbose', {
      description: 'Print debugging information',
      requiresArg: false,
      type: 'boolean',
      alias: ['-v']
    })
    .option('quiet', {
      description: 'Print nothing to standard out',
      requiresArg: false,
      type: 'boolean',
      alias: ['-v'],
      default: false
    })
    .option('overwrite', {
      description: 'allow overwriting existing files or not',
      requiresArg: false,
      type: 'boolean'
    })
    .command({
      command: '*',
      describe: 'execute a @dxos/plate template',
      handler: async ({
        _,
        dry,
        input,
        output = process.cwd(),
        include,
        exclude,
        sequential = false,
        verbose = false,
        quiet = false,
        overwrite
      }: {
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
      }) => {
        const tstart = Date.now();
        const debug = logger(verbose);
        const info = logger(!quiet);
        const [template] = _;
        if (!template) {
          throw new Error('no template specified');
        }
        debug('working directory', process.cwd());
        debug(
          `executing template '${template}'...`,
          include ? `include: '${include}'` : '',
          exclude ? ` exclude: '${exclude}'` : ''
        );
        const files = await executeDirectoryTemplate({
          outputDirectory: output,
          templateDirectory: template,
          input: input ? await catFiles(input?.split(',')) : {},
          parallel: !sequential,
          verbose,
          overwrite,
          include: include?.split(','),
          exclude: exclude?.split(',')
        });
        let written = 0;
        if (!dry) {
          debug(`output folder: ${output}`);
          info(`template generated ${files.length} files ...`);
          await Promise.all(
            files.map(async (f) => {
              try {
                const saved = await f.save();
                info(saved ? 'wrote' : 'skipped', f.shortDescription(process.cwd()));
                written += saved ? 1 : 0;
              } catch (err: any) {
                info('failed', f?.shortDescription(process.cwd()) ?? f);
                info(err);
              }
            })
          );
        }
        const now = Date.now();
        info(`wrote ${written} files [${fmtDuration(now - tstart)}]`);
      }
    }).argv;
};

void main();
