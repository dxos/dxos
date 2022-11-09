#!/usr/bin/env node

//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import process from 'process';
import yargs from 'yargs';
import merge from 'lodash.merge';
import yaml from 'yaml';
import { hideBin } from 'yargs/helpers';
import { logger } from './logger';
import { executeDirectoryTemplate } from './executeDirectoryTemplate';
import { loadInputs } from './loadInputs';

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
      description: 'Provide an json file to the template as input',
      type: 'string'
    })
    .option('output', {
      description: 'Provide a destination folder',
      requiresArg: true,
      type: 'string'
    })
    .option('filter', {
      description: 'Filter the template files by regular expression string',
      requiresArg: false,
      type: 'string'
    })
    .option('exclude', {
      description: 'A regex to exclude entries from the template',
      requiresArg: false,
      type: 'string'
    })
    .option('glob', {
      description: 'Filter the template files by glob expression string',
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
        filter,
        glob,
        exclude,
        sequential = false,
        verbose = false,
        overwrite
      }: {
        _: string[];
        dry: boolean;
        input: string;
        output: string;
        filter: string;
        glob: string;
        exclude: string;
        sequential: boolean;
        verbose: boolean;
        overwrite: boolean;
      }) => {
        const tstart = Date.now();
        const debug = logger(verbose);
        const info = logger(true); // !quiet later
        const [template] = _;
        if (!template) {
          throw new Error('no template specified');
        }
        debug('working directory', process.cwd());
        debug(
          `executing template '${template}'...`,
          filter ? `filter: '${filter}'` : '',
          exclude ? ` exclude: '${exclude}'` : ''
        );
        const files = await executeDirectoryTemplate({
          outputDirectory: output,
          templateDirectory: template,
          input: await loadInputs(input.split(','), { relativeTo: output }),
          filterGlob: glob,
          filterRegEx: filter ? new RegExp(filter) : undefined,
          filterExclude: exclude ? new RegExp(exclude) : undefined,
          parallel: !sequential,
          verbose,
          overwrite
        });
        if (!dry) {
          debug(`output folder: ${output}`);
          info(`template generated ${files.length} files ...`);
          let written = 0;
          await Promise.all(
            files.map(async (f) => {
              try {
                const saved = await f.save();
                info(!!saved ? 'wrote' : 'skipped', f.shortDescription(process.cwd()));
                written += !!saved ? 1 : 0;
              } catch (err: any) {
                info('failed', f?.shortDescription(process.cwd()) ?? f);
                info(err);
              }
            })
          );
        }
        const now = Date.now();
        console.log(`wrote ${files.length} files [${fmtDuration(now - tstart)}]`);
      }
    })
    .help().argv;
};

void main();
