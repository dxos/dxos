//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import assert from 'node:assert';

import { BaseCommand } from '../../base-command';
import { PublisherRpcPeer, printTunnels } from '../../util';

export default class Set extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Enable or disable tunnel.';

  static override flags = {
    ...BaseCommand.flags,
    app: Flags.string({
      description: 'Application name',
      required: true
    }),
    enabled: Flags.boolean({
      description: 'Enable tunnel.'
    }),
    disabled: Flags.boolean({
      description: 'Disable tunnel.'
    })
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Set);
    const { app, enabled, disabled } = flags;
    try {
      if (!!enabled === !!disabled) {
        throw new Error('Specify either --enabled or --disabled.');
      }
      return await this.execWithPublisher(async (publisher: PublisherRpcPeer) => {
        const tunnelResponse = await publisher.rpc.tunnel({ name: app, enabled: enabled && !disabled });
        assert(tunnelResponse, 'Unable to set tunnel.');
        printTunnels([tunnelResponse], flags);
      });
    } catch (err: any) {
      this.log(`Unable to set tunnel: ${err.message}`);
      this.error(err, { exit: 1 });
    }
  }
}
