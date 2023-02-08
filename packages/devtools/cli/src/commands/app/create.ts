//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import { promises as fs } from 'fs';
import os from 'os';
import { cwd } from 'process';

import bare, { isDxosMonorepoSync } from '@dxos/bare-template';
import hello from '@dxos/hello-template';
import { exists } from '@dxos/plate';
import tasks from '@dxos/tasks-template';

import { BaseCommand } from '../../base-command';
import { exec } from '../../util/exec';

export const APP_TEMPLATES = ['hello', 'bare', 'tasks'];

// TODO(zhenyasav): factor this out into @dxos/fs or something (along with 'exists' from plate?)
const isDirEmpty = async (dirpath: string) => {
  const dirIter = await fs.opendir(dirpath);
  const { done } = await dirIter[Symbol.asyncIterator]().next();
  if (!done) {
    await dirIter.close();
  }
  return !!done;
};

export default class Create extends BaseCommand {
  static override description = 'Create a DXOS project.';

  static override args = [
    {
      name: 'name',
      required: true,
      description: 'Name of the project'
    }
  ];

  static override flags = {
    ...BaseCommand.flags,
    tag: Flags.string({
      description: 'Git tag or branch of the DXOS repo to checkout.'
    }),
    template: Flags.string({
      char: 't',
      description: 'Template to use when creating the project.',
      default: 'hello',
      options: APP_TEMPLATES
    }),
    interactive: Flags.boolean({
      char: 'i',
      description: 'Customize app template options via interactive prompt',
      default: false
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Verbose output',
      default: false
    })
  };

  async run(): Promise<any> {
    const { args, flags } = await this.parse(Create);
    const { name } = args;
    const { template, interactive, verbose } = flags;

    const outputDirectory = `${cwd()}/${name}`;

    const outputDirExists = await exists(outputDirectory);
    const isOutputEmpty = outputDirExists && (await isDirEmpty(outputDirectory));
    if (outputDirExists && !isOutputEmpty) {
      this.error(`Output directory ${outputDirectory} is not empty`, { exit: 1 });
    }
    try {
      await exec('which pnpm');
    } catch {
      this.error('pnpm not found. Please run "npm i -g pnpm" first.', { exit: 1 });
    }
    // TODO:: make sure this exists in the @dxos/create packages too
    if (os.platform() === 'darwin') {
      try {
        await exec('which xcrun');
      } catch {
        this.error('XCode Command Line Tools not found. Please run "xcode-select --install" first.', { exit: 1 });
      }
    }
    try {
      this.log('Creating app...');

      const plates = {
        tasks,
        bare,
        hello
      };

      const monorepo = isDxosMonorepoSync();

      const result = await plates[template as keyof typeof plates].execute({
        outputDirectory,
        interactive,
        verbose,
        input: {
          monorepo,
          name
        }
      });
      void result.save({ printFiles: verbose });
    } catch (err: any) {
      this.error(err, { exit: 1 });
    }
  }
}
