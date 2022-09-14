//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import assert from 'assert';

import { BaseCommand } from '../../base-command';
import { build } from '../../util/publish/build';
import { loadConfig } from '../../util/publish/config';
import { publish } from '../../util/publish/publish';
import { PublisherRpcPeer } from '../../util/publisher-rpc-peer';

export default class Publish extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Publish apps.';
  static override flags = {
    ...BaseCommand.flags,
    configPath: Flags.string({
      description: 'Path to dx.yml'
    }),
    verbose: Flags.boolean({
      description: 'Verbose output'
    })
  };

  async run (): Promise<any> {
    const { flags } = await this.parse(Publish);
    const { configPath, verbose } = flags;

    try {
      const moduleConfig = await loadConfig(configPath);

      assert(moduleConfig.values.package, 'Missing package definition in dx.yml');

      for (const module of moduleConfig.values.package!.modules ?? []) {
        verbose && this.log(`Deploying module ${module.name}...`);

        await build({ verbose }, { log: (...args) => this.log(...args), module });
        const cid = await publish({ verbose }, { module, config: this.clientConfig });
        module.bundle = cid.bytes;
      }

      return await this.execWithPublisher(async (rpc: PublisherRpcPeer) => {
        await rpc.rpc.publish({ package: moduleConfig.values.package! });
        verbose && this.log('Deployed');
      });
    } catch (err: any) {
      // TODO(egorgripasov): Thrown errors are not caught properly.
      this.error(err);
    }
  }
}
