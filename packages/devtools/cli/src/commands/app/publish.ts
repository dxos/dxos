//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import assert from 'node:assert';
import os from 'os';

import { captureException } from '@dxos/sentry';

import { BaseCommand } from '../../base-command';
import { PublisherRpcPeer, build, loadConfig, publish } from '../../util';

export default class Publish extends BaseCommand {
  static override description = 'Publish apps.';
  static override flags = {
    ...BaseCommand.flags,
    configPath: Flags.string({
      description: 'Path to dx.yml',
    }),
    accessToken: Flags.string({
      description: 'Access token for publishing',
    }),
    skipExisting: Flags.boolean({
      description: 'Do not update content on KUBE if version already exists',
      default: false,
    }),
    verbose: Flags.boolean({
      description: 'Verbose output',
      default: false,
    }),
    version: Flags.string({
      description: 'Version of modules to publish',
    }),
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(Publish);
    const { accessToken, configPath, skipExisting, verbose, version } = flags;

    try {
      const moduleConfig = await loadConfig(configPath);

      assert(moduleConfig.values.package, 'Missing package definition in dx.yml');

      for (const module of moduleConfig.values.package!.modules ?? []) {
        await build({ verbose }, { log: (...args) => this.log(...args), module });
        const cid = await publish(
          { verbose },
          { log: (...args) => this.log(...args), module, config: this.clientConfig },
        );
        module.bundle = cid.bytes;

        if (version) {
          module.build = { ...module.build, version };
        }
      }

      this.addToTelemetryContext({
        totalBundleSize: moduleConfig.values.package!.modules?.reduce(
          (sum, { bundle }) => sum + (bundle?.length ?? 0),
          0,
        ),
      });

      this.log('Publishing to KUBE...');

      return await this.execWithPublisher(async (publisher: PublisherRpcPeer) => {
        const result = await publisher.rpc.publish({
          package: moduleConfig.values.package!,
          skipExisting,
          accessToken,
        });

        result?.modules?.forEach(({ module, urls }) => {
          // TODO (zhenyasav): this is to de-advertise any non localhost urls because of security sandboxes
          // in the browser requiring https for those domains to support halo vault
          // also allow https urls but not any http urls unless they contain localhost (not perfect)
          const filteredUrls = urls?.length ? urls.filter((u) => !/^http:/.test(u) || /localhost/.test(u)) : [];
          this.log(`Module ${module.name} published.${filteredUrls?.length ? os.EOL + filteredUrls.join(os.EOL) : ''}`);
        });
      });
    } catch (err: any) {
      captureException(err);
      this.log(`Unable to publish: ${err.message}`);
      this.error(err, { exit: 1 });
    }
  }
}
