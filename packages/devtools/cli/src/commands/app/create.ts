//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import { promises as fs } from 'fs';
import { exec } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { cwd } from 'process';
import tempy from 'tempy';

import { executeDirectoryTemplate, exists } from '@dxos/plate';

import { BaseCommand } from '../../base-command';

export const APP_TEMPLATES = ['hello', 'bare', 'tasks'];

// TODO: factor this out into @dxos/fs or something (along with 'exists' from plate?)
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
    })
  };

  async run(): Promise<any> {
    const { args, flags } = await this.parse(Create);
    const { name } = args;
    const { tag = `v${this.config.version}`, template } = flags;

    const tmpDirectory = tempy.directory({ prefix: `dxos-app-create-${name}` });
    const templateDirectory = `${tmpDirectory}/packages/apps/templates/${template}-template`;
    const outputDirectory = `${cwd()}/${name}`;

    const outputDirExists = await exists(outputDirectory);

    const isOutputEmpty = outputDirExists && (await isDirEmpty(outputDirectory));
    if (outputDirExists && !isOutputEmpty) {
      this.error(`Output directory ${outputDirectory} is not empty`, { exit: 1 });
    }
    try {
      await promisify(exec)('which pnpm');
    } catch {
      this.error('pnpm not found. Please run "npm i -g pnpm" first.', { exit: 1 });
    }
    try {
      this.log('Cloning template from Github...');
      await promisify(exec)(`
        git clone --filter=blob:none --no-checkout git@github.com:dxos/dxos.git ${tmpDirectory} &&
          cd ${tmpDirectory} &&
          git sparse-checkout set --cone tsconfig.json patches ${
            template !== 'bare' ? 'packages/apps/templates/bare-template ' : ''
          }packages/apps/templates/${template}-template &&
          git checkout ${tag} && mkdir node_modules && pnpm link ${require
        .resolve('@dxos/plate')
        .slice(0, -'/dist/lib/node/index.cjs'.length)}
      `);

      // this.log('Preparing template...');

      // Copy vite patch.
      // await mkdir(`${templateDirectory}/patches`);
      // await copyFile(`${tmpDirectory}/patches/vite@3.0.9.patch`, `${templateDirectory}/patches/vite@3.0.9.patch`);

      this.log('Creating app...');

      // TS templating.
      const result = await executeDirectoryTemplate({
        templateDirectory,
        outputDirectory,
        input: {
          monorepo: false,
          name
        }
      });

      await Promise.all(result.map((file) => file.save()));

      this.log(`App created. To get started run the following commands:\n\n  cd ${name}\n  pnpm install\n  pnpm serve`);
    } catch (err: any) {
      this.log(`Unable to create: ${err.message}`);
      this.log(err?.stack);
      this.error(err, { exit: 1 });
    } finally {
      await rm(tmpDirectory, { recursive: true, force: true });
    }
  }
}
