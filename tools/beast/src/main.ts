//
// Copyright 2022 DXOS.org
//

import path from 'path';
import * as process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// TODO(burdon): Error if removed.
// > @dxos/beast@2.33.8 update:docs /Users/burdon/Code/dxos/dxos/tools/beast
// > ts-node --esm ./src/main.ts docs
// /Users/burdon/Code/dxos/dxos/node_modules/.pnpm/ts-node@10.9.1_sx5ynny5elbe7xjikueazwirqy/node_modules/ts-node/src/index.ts:859
//     return new TSError(diagnosticText, diagnosticCodes, diagnostics);
import { log } from '@dxos/log';

import { Processor } from './processor';

const main = () => {
  log.info('Started');

  yargs(hideBin(process.argv))
    .scriptName('beast')
    .option('json', {
      type: 'boolean'
    })

    .command({
      command: 'list',
      handler: ({ json }: { json: boolean }) => {
        const processor = new Processor(path.join(process.cwd(), '../..')).init();
        const projects = processor.projects.map(p => p.package.name);

        if (json) {
          console.log(JSON.stringify({ projects }, undefined, 2));
        } else {
          projects.forEach(m => console.log(`- ${m}`));
        }
      }
    })

    .command({
      command: 'deps [project]',
      describe: 'Checks for cycles.',
      builder: yargs => yargs
        .option('filter', {
          description: 'Dependency filter',
          type: 'string',
          default: '@dxos/*'
        }),
      handler: ({
        project: name,
        filter,
        json
      }: {
        project?: string
        filter?: string
        json?: boolean
      }) => {
        if (!name) {
          process.exit(1);
        }

        const processor = new Processor(path.join(process.cwd(), '../..')).init();
        const project = processor.projectsByName.get(name);
        if (project) {
          const descendents = [...project.descendents!.values()].sort();
          if (json) {
            console.log(JSON.stringify({
              package: project.package.name,
              descendents
            }, undefined, 2));
          } else {
            console.log(`${project.package.name}`);
            descendents.forEach(p => console.log(`- ${p}`));
          }
        }
      }
    })

    .command({
      command: 'docs [pattern]',
      describe: 'Generate docs and dependency diagrams.',
      builder: yargs => yargs
        .option('baseUrl', {
          description: 'Base URL for links',
          type: 'string',
          default: 'https://github.com/dxos/dxos/tree/main'
        })
        .option('outDir', {
          description: 'Folder for generated docs',
          type: 'string',
          default: './docs'
        })
        .option('include', {
          description: 'Dependency filter',
          type: 'string',
          default: '@dxos/*'
        })
        .option('exclude', {
          description: 'Excluded files',
          type: 'string',
          // TODO(burdon): Get from package annotation.
          default: ['@dxos/async', '@dxos/debug', '@dxos/log', '@dxos/util'].join(',')
        }),
      handler: ({
        pattern = '*',
        baseUrl,
        outDir,
        include,
        exclude
      }: {
        pattern?: string
        baseUrl : string
        outDir: string
        include?: string
        exclude?: string
      }) => {
        const processor = new Processor(path.join(process.cwd(), '../..'), include, exclude?.split(',') ?? []).init();
        processor.match(pattern).forEach(project => {
          console.log(`Updating: ${project.name.padEnd(32)} ${project.subdir}`);
          processor.createDocs(project, outDir, baseUrl);
        });
      }
    })
    .help()
    .argv;
};

void main();
