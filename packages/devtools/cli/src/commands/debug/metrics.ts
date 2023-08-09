//
// Copyright 2022 DXOS.org
//

import { Args } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

// TODO(burdon): Move to logging.
export default class Metrics extends BaseCommand<typeof Metrics> {
  static override description = 'Control metrics.';
  static override args = {
    command: Args.string({ description: 'Space key head in hex.', values: ['reset', 'start', 'stop'] }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      switch (this.args.command) {
        case 'reset': {
          client.services.services.LoggingService?.controlMetrics({ reset: true });
          break;
        }

        case 'start': {
          client.services.services.LoggingService?.controlMetrics({ record: true });
          break;
        }

        case 'stop': {
          client.services.services.LoggingService?.controlMetrics({ record: false });
          break;
        }

        default: {
        }
      }
    });
  }
}
