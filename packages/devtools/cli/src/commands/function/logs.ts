//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';
import { BaseCommand } from '../../base';

/**
 * @deprecated
 */
export default class Logs extends BaseCommand<typeof Logs> {
  static override enableJsonFlag = true;
  static override description = 'Get function logs.';
  static override state = 'deprecated';

  static override args = {
    name: Args.string({ required: true, description: 'Function name.' }),
  };

  async run(): Promise<any> {
    // https://docs.openfaas.com/architecture/logs-provider
    const config = this.clientConfig.values.runtime?.services?.faasd ?? {};
    const res = await fetch(`${config.gateway}/system/logs?name=${this.args.name}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
      },
    });

    const reader = res.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const str = Buffer.from(value!).toString('utf-8') as any;
        const { timestamp, text } = JSON.parse(str);
        console.log(timestamp, text);
      }
    }
  }
}
