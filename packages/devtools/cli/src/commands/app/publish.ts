//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import assert from 'assert';

import { captureException } from '@dxos/sentry';

import { BaseCommand } from '../../base-command';
import { PublisherRpcPeer, build, loadConfig, publish } from '../../util';

export default class Publish extends BaseCommand {
  static override description = 'Publish apps.';
  static override flags = {
    ...BaseCommand.flags,
    configPath: Flags.string({
      description: 'Path to dx.yml'
    }),
    skipExisting: Flags.boolean({
      description: 'Do not update content on KUBE if version already exists',
      default: false
    }),
    verbose: Flags.boolean({
      description: 'Verbose output',
      default: false
    }),
    version: Flags.string({
      description: 'Version of modules to publish'
    })
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Publish);
    const { configPath, skipExisting, verbose, version } = flags;

    try {
      const moduleConfig = await loadConfig(configPath);

      assert(moduleConfig.values.package, 'Missing package definition in dx.yml');

      for (const module of moduleConfig.values.package!.modules ?? []) {
        verbose && this.log(`Deploying module ${module.name}...`);

        await build({ verbose }, { log: (...args) => this.log(...args), module });
        const cid = await publish({ verbose }, { module, config: this.clientConfig });
        module.bundle = cid.bytes;

        if (version) {
          module.build = { ...module.build, version };
        }
      }

      this.addToTelemetryContext({
        totalBundleSize: moduleConfig.values.package!.modules?.reduce(
          (sum, { bundle }) => sum + (bundle?.length ?? 0),
          0
        )
      });

      return await this.execWithPublisher(async (publisher: PublisherRpcPeer) => {
        await publisher.rpc.publish({
          package: moduleConfig.values.package!,
          skipExisting
        });
        verbose && this.log('Published to KUBE.');
      });
    } catch (err: any) {
      captureException(err);
      this.log(`Unable to publish: ${err.message}`);
      this.error(err, { exit: 1 });
    }
  }
}
