//
// Copyright 2022 DXOS.org
//

import * as process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { log } from '@dxos/log';

import { PackageDependencyBuilder, WorkspaceProcessor } from './nx';
import { getBaseDir } from './util';

const main = () => {
  log.info('Started');

  yargs(hideBin(process.argv))
    .scriptName('beast')
    .option('json', {
      type: 'boolean'
    })
    .option('verbose', {
      type: 'boolean'
    })
    .option('base-dir', {
      type: 'string',
      default: getBaseDir()
    })

    .command({
      command: 'list',
      handler: ({ json, verbose, baseDir }: { json: boolean; verbose?: boolean; baseDir: string }) => {
        const processor = new WorkspaceProcessor(baseDir, { verbose }).init();
        const projects = processor.getProjects().map((p) => p.package.name);

        if (json) {
          console.log(JSON.stringify({ projects }, undefined, 2));
        } else {
          projects.forEach((m) => console.log(`- ${m}`));
        }
      }
    })

    .command({
      command: 'deps [project]',
      describe: 'Checks for cycles.',
      builder: (yargs) =>
        yargs.option('filter', {
          description: 'Dependency filter',
          type: 'string',
          default: '@dxos/*'
        }),
      handler: ({
        json,
        verbose,
        baseDir,
        project: name
      }: {
        json?: boolean;
        verbose?: boolean;
        baseDir: string;
        project?: string;
      }) => {
        if (!name) {
          process.exit(1);
        }

        const processor = new WorkspaceProcessor(baseDir, { verbose }).init();
        const project = processor.getProjectByName(name);
        if (project) {
          const descendents = [...project.descendents!.values()].sort();
          if (json) {
            console.log(
              JSON.stringify(
                {
                  package: project.package.name,
                  descendents
                },
                undefined,
                2
              )
            );
          } else {
            console.log(`${project.package.name}`);
            descendents.forEach((p) => console.log(`- ${p}`));
          }
        }
      }
    })

    .command({
      command: 'docs [pattern]',
      describe: 'Generate docs and dependency diagrams.',
      builder: (yargs) =>
        yargs
          .option('baseUrl', {
            description: 'Base URL for links',
            type: 'string',
            default: 'dxos/dxos/tree/main'
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
            // TODO(burdon): Get from config or package annotation (e.g., "dxos/beast" key).
            default: [
              '@dxos/async',
              '@dxos/debug',
              '@dxos/feeds',
              '@dxos/keys',
              '@dxos/log',
              '@dxos/testutils',
              '@dxos/util'
            ].join(',')
          }),
      handler: ({
        verbose,
        baseDir,
        pattern = 'packages/**',
        baseUrl,
        outDir,
        include,
        exclude = ''
      }: {
        verbose?: boolean;
        baseDir: string;
        pattern?: string;
        baseUrl: string;
        outDir: string;
        include: string;
        exclude: string;
      }) => {
        const processor = new WorkspaceProcessor(baseDir, { verbose, include }).init();
        const builder = new PackageDependencyBuilder(processor, {
          verbose,
          exclude: exclude?.split(',')
        });

        processor.getProjects(pattern).forEach((project) => {
          if (verbose) {
            console.log(`Updating: ${project.name.padEnd(32)} ${project.subDir}`);
          }

          builder.createDocs(project, outDir, baseUrl);
        });
      }
    })
    .help().argv;
};

void main();
