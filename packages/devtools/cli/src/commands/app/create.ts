//
// Copyright 2022 DXOS.org
//

import { Args, Flags } from '@oclif/core';
import { promises as fs } from 'fs';
import os from 'os';
import { cwd } from 'process';

import { exec } from '@dxos/process';

import { BaseCommand } from '../../base-command';

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
    const { default: bare, isDxosMonorepoSync } = await import('@dxos/bare-template');
    const { default: hello } = await import('@dxos/hello-template');
    const { default: tasks } = await import('@dxos/tasks-template');
    const { fileExists } = await import('@dxos/plate');

    const { name } = this.args;
    const { template, interactive, verbose } = this.flags;

    const outputDirectory = `${cwd()}/${name}`;
    const outputDirExists = await fileExists(outputDirectory);
    const isOutputEmpty = outputDirExists && (await isDirEmpty(outputDirectory));
    if (outputDirExists && !isOutputEmpty) {
      this.catch(`Output directory ${outputDirectory} is not empty`);
    }
    // TODO:: make sure this exists in the @dxos/create packages too
    if (os.platform() === 'darwin') {
      try {
        await exec('which xcrun');
      } catch {
        this.catch('XCode Command Line Tools not found. Please run "xcode-select --install" first.');
      }
    }

    this.log('Creating app...');
    const templates = {
      bare,
      hello,
      tasks,
    };

    const monorepo = isDxosMonorepoSync();
    const result = await templates[template as keyof typeof templates].apply({
      outputDirectory,
      interactive,
      verbose,
      input: {
        monorepo,
        name,
        createFolder: false,
      },
    });

    void result.apply();
  }
}
