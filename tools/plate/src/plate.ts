#!/usr/bin/env node

//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import * as process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { executeDirectoryTemplate } from './executeDirectoryTemplate';

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
      description: 'Filter the input files by glob',
      requiresArg: false,
      type: 'string'
    })
    .command({
      command: '*',
      describe: 'execute a @dxos/plate template',
      handler: async ({
        _,
        dry,
        input,
        output = process.cwd(),
        filter
      }: {
        _: string[];
        dry: boolean;
        input: string;
        output: string;
        filter: string;
      }) => {
        const tstart = Date.now();
        const [template] = _;
        if (!template) {
          throw new Error('no template specified');
        }
        console.log('working directory', process.cwd());
        console.log(
          `executing template '${template}'...`,
          filter ? `filter: '${filter}'` : ''
        );
        const files = await executeDirectoryTemplate({
          outputDirectory: output,
          templateDirectory: template,
          input: input ? JSON.parse((await fs.readFile(input)).toString()) : {},
          filterGlob: filter
        });
        if (!dry) {
          console.log(`output folder: ${output}`);
          console.log(`writing ${files.length} files...`);
          await Promise.all(
            files.map(async (f) => {
              try {
                await f.save();
                console.log('wrote', f.shortDescription(process.cwd()));
              } catch (err: any) {
                console.warn('skipped', f.shortDescription(process.cwd()));
              }
            })
          );
          console.log(`wrote ${files.length} files.`);
        }
        const now = Date.now();
        console.log(`done [${fmtDuration(now - tstart)}]`);
      }
    })
    .help().argv;
};

void main();
