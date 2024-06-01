//
// Copyright 2022 DXOS.org
//

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';

// TODO(burdon): Move to logging.
export default class Metrics extends BaseCommand<typeof Metrics> {
  static override enableJsonFlag = true;
  static override description = 'Control metrics.';
  static override args = {
    command: Args.string({ description: 'Control metrics recording.', values: ['reset', 'start', 'stop'] }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      switch (this.args.command) {
        case 'reset': {
          await client.services.services.LoggingService?.controlMetrics({ reset: true });
          break;
        }

        case 'start': {
          await client.services.services.LoggingService?.controlMetrics({ record: true });
          break;
        }

        case 'stop': {
          await client.services.services.LoggingService?.controlMetrics({ record: false });
          break;
        }
      }

      const response = await client.services.services.LoggingService?.controlMetrics({});
      if (this.flags.json) {
        return response;
      } else {
        this.log(`recording: ${response?.recording}`);
      }
    });
  }
}
