//
// Copyright 2022 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import fs from 'fs';

import { DX_CACHE, DX_DATA, DX_RUNTIME, DX_STATE, getProfilePath } from '@dxos/client-protocol';

import { BaseCommand } from '../../base-command';

export default class Reset extends BaseCommand<typeof Reset> {
  static override description = 'Reset user data.';
  static override flags = {
    ...BaseCommand.flags,
    force: Flags.boolean({
      description: 'Force delete.',
      default: false,
    }),
  };

  async run(): Promise<any> {
    const storage = this.clientConfig?.get('runtime.client.storage.path');
    const profile = this.flags.profile;
    const paths = [
      ...new Set<string>(
        [
          getProfilePath(DX_CACHE, profile),
          getProfilePath(DX_DATA, profile),
          getProfilePath(DX_STATE, profile),
          getProfilePath(DX_RUNTIME, profile),
          storage,
        ]
          .sort()
          .filter(Boolean) as string[],
      ),
    ];

    if (storage && storage !== getProfilePath(DX_DATA, profile)) {
      this.warn(
        chalk`The config storage path does not match the default:\n- config: {yellow ${storage}}\n- expected: {green ${getProfilePath(
          DX_DATA,
          profile,
        )}}`,
      );
    }

    const dryRun =
      this.flags['dry-run'] ||
      !(this.flags.force || (await ux.confirm(chalk`\n{red Delete all data? {white (Profile: ${profile})}}`)));

    if (!dryRun) {
      // TODO(burdon): Problem if running manually.
      await this.execWithDaemon(async (daemon) => daemon.stop(this.flags.profile, { force: this.flags.force }));
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
