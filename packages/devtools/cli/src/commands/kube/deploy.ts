//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { DEFAULT_PROVIDER, DigitalOceanProvider, type MachineryProvider, printKubes } from '../../util/provider';

export default class Deploy extends BaseCommand<typeof Deploy> {
  static override description = 'Deploy KUBE.';
  static override flags = {
    ...BaseCommand.flags,
    hostname: Flags.string({
      description: 'Hostname',
      required: true,
    }),
    provider: Flags.string({
      description: 'Cloud Provider',
      default: DEFAULT_PROVIDER,
    }),
    accessToken: Flags.string({
      description: 'Access token for seeding admin identity',
    }),
    dev: Flags.boolean({
      description: 'Deploy latest version from dev channel',
      default: false,
    }),
  };

  async run(): Promise<any> {
    const { hostname, provider: providerName, dev, accessToken } = this.flags;
    return await this.execWithClient(async (client: Client) => {
      if (!client.halo.identity) {
        this.error('Client identity not initialized.');
      }

      // TODO(egorgripasov): HALO <-> KUBE integration.
      let provider: MachineryProvider;
      switch (providerName) {
        case DEFAULT_PROVIDER: {
          provider = new DigitalOceanProvider(this.clientConfig!);
          break;
        }

        default: {
          this.error(`Unknown provider: ${providerName}`);
        }
      }

      const kube = await provider.deploy({ hostname, dev, accessToken });
      printKubes([kube]);
    });
  }
}
