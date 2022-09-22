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
    .option('json', {
      type: 'boolean'
    })

    .command({
      command: 'list',
      handler: ({ json }: { json: boolean }) => {
        const processor = new Processor(path.join(process.cwd(), '../..'));
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

        const processor = new Processor(path.join(process.cwd(), '../..'));
        const project = processor.process(name, { filter });
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
        .option('filter', {
          description: 'Dependency filter',
          type: 'string',
          default: '@dxos/*'
        }),
      handler: ({
        pattern = '*',
        filter
      }: {
        pattern?: string
        filter?: string
      }) => {
        const processor = new Processor(path.join(process.cwd(), '../..'));

        processor.match(pattern).forEach(project => {
          console.log(`Updating: ${project.name.padEnd(32)} ${project.subdir}`);
          processor.process(project.name, { filter });
          processor.createDocs(project);
        });
      }
    })
    .help()
    .argv;
};

void main();
