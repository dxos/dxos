//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import { exec } from 'node:child_process';
import { mkdir, copyFile, rm } from 'node:fs/promises';
import { promisify } from 'node:util';
import { cwd } from 'process';

import { executeDirectoryTemplate } from '@dxos/plate';

import { BaseCommand } from '../../base-command';

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
      description: 'Git tag or branch of the DXOS repo to checkout.',
      default: 'production'
    }),
    template: Flags.string({
      char: 't',
      description: 'Template to use when creating the project.',
      default: 'hello',
      options: ['hello', 'bare']
    })
  };

  async run(): Promise<any> {
    const { args, flags } = await this.parse(Create);
    const { name } = args;
    const { tag, template } = flags;

    // TODO(wittjosiah): Cross-platform.
    const tmpDirectory = `/tmp/dxos-app-create-${Date.now()}`;
    const templateDirectory = `${tmpDirectory}/packages/apps/templates/${template}-template`;
    const outputDirectory = `${cwd()}/${name}`;

    try {
      // Git clone template.
      await promisify(exec)(`
        git clone --filter=blob:none --no-checkout git@github.com:dxos/dxos.git ${tmpDirectory} &&
          cd ${tmpDirectory} &&
          git sparse-checkout set --cone tsconfig.json patches packages/apps/templates/${template} &&
          git checkout ${tag}
      `);

      // Copy vite patch.
      await mkdir(`${templateDirectory}/patches`);
      await copyFile(
        `${tmpDirectory}/patches/vite@3.0.9.patch`,
        `${templateDirectory}/patches/vite@3.0.9.patch`
      );

      // Remove unneccessary files.
      await rm(`${templateDirectory}/project.json`);
      await rm(`${templateDirectory}/tsconfig.plate.json`);

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
    } catch (err: any) {
      this.log(`Unable to create: ${err.message}`);
      this.error(err, { exit: 1 });
    } finally {
      await rm(tmpDirectory, { recursive: true, force: true });
    }
  }
}
