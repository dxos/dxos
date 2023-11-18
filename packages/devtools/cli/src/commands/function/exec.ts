//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';

import { FaasClient } from '@dxos/agent';
import { PublicKey } from '@dxos/keys';

import { BaseCommand } from '../../base-command';

/**
 * @deprecated
 */
export default class Exec extends BaseCommand<typeof Exec> {
  static override enableJsonFlag = true;
  static override description = 'Invoke function.';

  static override args = {
    name: Args.string({ required: true, description: 'Function name.' }),
  };

  async run(): Promise<any> {
    // TODO(burdon): Pass in clientUrl.
    // TODO(burdon): Rebuild function with new API.
    // TODO(burdon): Use JWT instead of password.
    //  https://docs.openfaas.com/reference/authentication
    //  faas-cli registry-login
    const context = {
      clientUrl: 'ws://localhost:4567',
      // clientUrl: '/tmp/dx/run/profile/test/agent.sock',
    };

    const client = new FaasClient(this.clientConfig.values.runtime?.services?.faasd ?? {}, context);
    const res = await client.dispatch({
      trigger: { id: PublicKey.random().toHex(), function: { name: this.args.name } },
    });

    console.log(res);
  }
}
