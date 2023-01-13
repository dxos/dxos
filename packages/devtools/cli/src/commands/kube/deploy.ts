//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { DEFAULT_PROVIDER, DigitalOceanProvider, MachineryProvider, printKubes } from '../../util/provider';

export default class Deploy extends BaseCommand {
  static override description = 'Deploy KUBE.';
  static override flags = {
    ...BaseCommand.flags,
    hostname: Flags.string({
      description: 'Hostname',
      required: true
    }),
    provider: Flags.string({
      description: 'Cloud Provider',
      default: DEFAULT_PROVIDER
    }),
    accessToken: Flags.string({
      description: 'Access token for seeding admin identity'
    }),
    dev: Flags.boolean({
      description: 'Deploy latest version from dev channel',
      default: false
    })
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Deploy);
    const { hostname, provider: providerName, dev, accessToken } = flags;

    try {
      return await this.execWithClient(async (client: Client) => {
        if (!client.halo.profile) {
          throw new Error('Halo profile should be initialized first.');
        }
        // TODO(egorgripasov): HALO <-> KUBE integration.
        let provider: MachineryProvider;
        switch (providerName) {
          case DEFAULT_PROVIDER: {
            provider = new DigitalOceanProvider(this.clientConfig!);
            break;
          }
          default: {
            throw new Error(`Unknown provider: ${providerName}`);
          }
        }

        const kube = await provider.deploy({
          hostname,
          dev,
          accessToken
        });

        printKubes([kube]);
      });
    } catch (err: any) {
      this.error(err, { exit: 1 });
    }
  }
}
