//
// Copyright 2022 DXOS.org
//

import { Args, Flags } from '@oclif/core';
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

export default class Create extends BaseCommand<typeof Create> {
  static override description = 'Manage applications.';

  static override args = {
    name: Args.string({ required: true, description: 'App name.' }),
  };

  static override flags = {
    ...BaseCommand.flags,
    tag: Flags.string({
      description: 'Git tag or branch of the DXOS repo to checkout.',
    }),
    template: Flags.string({
      char: 't',
      description: 'Template to use when creating the project.',
      default: 'hello',
      options: APP_TEMPLATES,
    }),
    interactive: Flags.boolean({
      char: 'i',
      description: 'Customize app template options via interactive prompt.',
      default: false,
    }),
  };

  async run(): Promise<any> {
    const { name } = this.args;
    const { template, interactive, verbose } = this.flags;

    const outputDirectory = `${cwd()}/${name}`;
    const outputDirExists = await exists(outputDirectory);
    const isOutputEmpty = outputDirExists && (await isDirEmpty(outputDirectory));
    if (outputDirExists && !isOutputEmpty) {
      this.error(`Output directory ${outputDirectory} is not empty`, { exit: 1 });
    }
    // TODO:: make sure this exists in the @dxos/create packages too
    if (os.platform() === 'darwin') {
      try {
        await exec('which xcrun');
      } catch {
        this.error('XCode Command Line Tools not found. Please run "xcode-select --install" first.', { exit: 1 });
      }
    }

    this.log('Creating app...');
    const plates = {
      tasks,
      bare,
      hello,
    };

    const monorepo = isDxosMonorepoSync();
    const result = await plates[template as keyof typeof plates].execute({
      outputDirectory,
      interactive,
      verbose,
      input: {
        monorepo,
        name,
      },
    });

    void result.save({ printFiles: verbose });
  }
}
