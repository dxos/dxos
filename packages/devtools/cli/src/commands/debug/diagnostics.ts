//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import rev from 'git-rev-sync';
import defaultsDeep from 'lodash.defaultsdeep';

import { asyncTimeout } from '@dxos/async';
import { type ConfigProto } from '@dxos/config';

import { BaseCommand } from '../../base';

export default class Diagnostics extends BaseCommand<typeof Diagnostics> {
  static override enableJsonFlag = true;
  static override description = 'Create diagnostics report.';
  static override flags = {
    ...BaseCommand.flags,
    humanize: Flags.boolean({
      description: 'Humanize keys.',
    }),
    truncate: Flags.boolean({
      description: 'Truncate keys.',
    }),
  };

  static override examples = [
    {
      description: 'Inspect diagnostics.',
      command: "dx debug diagnostics --json --truncate | jq -r '.metrics'",
    },
    {
      description: 'Upload diagnostics to GitHub.',
      command: 'dx debug diagnostics --json --truncate | gh gist create --filename diagnostics.json',
    },
  ];

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      const data = await asyncTimeout(
        client.diagnostics({ humanize: this.flags.humanize, truncate: this.flags.truncate }),
        this.flags.timeout,
      );

      const config: ConfigProto = {
        runtime: {
          app: {
            build: {
              timestamp: rev.date().toISOString(),
              commitHash: rev.long(),
              branch: rev.branch(),
            },
          },
        },
      };

      return defaultsDeep({}, data, {
        diagnostics: {
          config,
        },
      });
    });
  }
}
