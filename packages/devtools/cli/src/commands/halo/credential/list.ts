//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { Trigger, sleep } from '@dxos/async';
import { TABLE_FLAGS, mapCredentials, printCredentials } from '@dxos/cli-base';
import type { Credential } from '@dxos/client/halo';

import { BaseCommand } from '../../../base';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List HALO credentials.';
  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
    type: Flags.string({
      description: 'Type',
    }),
    timeout: Flags.integer({
      description: 'Time in milliseconds to wait for at least one credential before listing.',
      default: 500,
    }),
    delay: Flags.integer({
      description: 'Delay in milliseconds before listing.',
      default: 250,
    }),
    space: Flags.string({
      description: 'Space ID of the space to show credentials from. By default, shows halo credentials.',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      let credentials: Credential[];

      if (!this.flags.space) {
        const identity = client.halo.identity;
        if (!identity) {
          this.catch('Profile not initialized.');
        }

        // Wait for at least one credential before returning a result.
        const trigger = new Trigger();
        client.halo.credentials.subscribe((credentials) => {
          if (credentials.length > 0) {
            trigger.wake();
          }
        });
        await trigger.wait({ timeout: this.flags.timeout });

        // Even if we wait for a single credential, we're still likely to miss credentials unless we wait some more.
        await sleep(this.flags.delay);
        credentials = client.halo.queryCredentials({ type: this.flags.type });
      } else {
        const space = await this.getSpaceById(client, this.flags.space, { wait: false });
        credentials = await space.internal.getCredentials();
      }

      if (this.flags.json) {
        return mapCredentials(credentials);
      } else {
        printCredentials(credentials, this.flags);
      }
    });
  }
}
