//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';

import { sleep, Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';

import { BaseCommand } from '../../../base';
import { printCredentials, mapCredentials } from '../../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List HALO credentials.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
    type: FlagS.String({
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
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
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
      const credentials = client.halo.queryCredentials({ type: this.flags.type });
      console.log(credentials);
      if (this.flags.json) {
        return mapCredentials(credentials);
      } else {
        printCredentials(credentials, this.flags);
      }
    });
  }
}
