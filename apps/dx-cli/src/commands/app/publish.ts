//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command';
// import { PublisherRpcPeer } from '../../util/publisher-rpc-peer';
import { build } from '../../util/publish/build';
import { loadConfig } from '../../util/publish/config';
import { publish } from '../../util/publish/publish';

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

      for (const module of moduleConfig.values.package?.modules ?? []) {
        verbose && this.log(`Deploying module ${module.name}...`);

        await build({ verbose }, { log: (...args) => this.log(...args), module });
        const cid = await publish({ verbose }, { module, config: this.clientConfig });
        this.log(`Deployed module ${module.name} to ${cid}`);

        // await build(module)(argv);
        // const cid = await publish({ config: params.config, module })(argv);
        // const client = await params.getDXNSClient();
        // const account = await client.getDXNSAccount(argv);
        // await register({ cid, account, license: moduleConfig.values.package?.license, module, ...params })(argv);
        // verbose && log(`Deployed ${module.name}.`);
      }

      // return await this.execWithPublisher(async (rpc: PublisherRpcPeer) => {
      //   const apps = await rpc.rpc.list();
      //   console.log('Received published apps', JSON.stringify(apps));
      //   return apps;
      // });
    } catch (err: any) {
      // TODO(egorgripasov): Thrown errors are not caught properly.
      this.error(err);
    }
  }
}
