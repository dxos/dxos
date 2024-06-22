//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs';
import inquirer from 'inquirer';

import { DX_CACHE, DX_CONFIG, DX_DATA, DX_RUNTIME, DX_STATE, getProfilePath } from '@dxos/client-protocol';

import { BaseCommand } from '../../base';

export default class Reset extends BaseCommand<typeof Reset> {
  static override description = 'Reset user data.';
  static override flags = {
    ...BaseCommand.flags,
    force: Flags.boolean({
      description: 'Force delete.',
      default: false,
    }),
    'default-config': Flags.boolean({
      description: 'Replace config with defaults.',
      default: false,
    }),
  };

  async run(): Promise<any> {
    const storage = this.clientConfig?.get('runtime.client.storage.dataRoot');
    const profile = this.flags.profile;
    const paths = [
      ...new Set<string>(
        [
          getProfilePath(DX_CACHE, profile),
          getProfilePath(DX_DATA, profile),
          getProfilePath(DX_STATE, profile),
          getProfilePath(DX_RUNTIME, profile),
          this.flags['default-config'] && getProfilePath(DX_CONFIG, profile) + '.yml',
          storage,
        ]
          .sort()
          .filter(Boolean) as string[],
      ),
    ];

    if (storage && storage !== getProfilePath(DX_DATA, profile)) {
      this.warn(
        chalk`The storage path does not match the default:\n- config: {yellow ${storage}}\n- expected: {green ${getProfilePath(
          DX_DATA,
          profile,
        )}}`,
      );
    }

    let dryRun = this.flags['dry-run'];
    if (!dryRun && !this.flags.force) {
      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        default: false,
        message: chalk`{red Delete all data? {white (Profile: ${profile})}}`,
      });
      dryRun = !confirm;
    }

    if (!dryRun) {
      await this.execWithDaemon(async (daemon) => {
        await daemon.stop(this.flags.profile, { force: this.flags.force });
      }, true);

      await this.execWithDaemon(async (daemon) => {
        if (await daemon.isRunning(this.flags.profile)) {
          await daemon.stop(this.flags.profile, { force: this.flags.force });
        }
      }, false);
      if (this.flags.verbose) {
        this.log(chalk`{red Deleting files...}`);
        paths.forEach((path) => this.log(`- ${path}`));
      }

      paths.forEach((path) => {
        fs.rmSync(path, { recursive: true, force: true });
      });
    } else {
      this.log('Files', paths);
    }

    return paths;
  }
}
