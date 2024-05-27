//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import os from 'os';

import { invariant } from '@dxos/invariant';

import { BaseCommand } from '../../base';
import { build, loadConfig, publish, type PublisherRpcPeer } from '../../util';

/**
 * @deprecated
 */
export default class Publish extends BaseCommand<typeof Publish> {
  static override state = 'deprecated';
  static override description = 'Publish apps.';
  static override flags = {
    ...BaseCommand.flags,
    // TODO(burdon): Change to hyphenated flags.
    configPath: Flags.string({
      description: 'Path to dx.yml',
    }),
    accessToken: Flags.string({
      description: 'Access token for publishing.',
    }),
    skipExisting: Flags.boolean({
      description: 'Do not update content on KUBE if version already exists.',
      default: false,
    }),
    version: Flags.string({
      description: 'Version of modules to publish.',
    }),
  };

  async run(): Promise<any> {
    const { accessToken, configPath, skipExisting, verbose, version } = this.flags;

    const moduleConfig = await loadConfig(configPath);
    invariant(moduleConfig.values.package, 'Missing package definition in dx.yml');
    for (const module of moduleConfig.values.package!.modules ?? []) {
      build({ verbose }, { log: (...args) => this.log(...args), module });
      const cid = await publish({
        config: this.clientConfig,
        log: (...args) => this.log(...args),
        module,
        verbose,
      });

      module.bundle = cid.bytes;
      if (version) {
        module.build = { ...module.build, version };
      }
    }

    const totalBundleSize = moduleConfig.values.package!.modules?.reduce(
      (sum, { bundle }) => sum + (bundle?.length ?? 0),
      0,
    );

    invariant(totalBundleSize, 'Missing bundle size');
    this._observability?.setTag('totalBundleSize', totalBundleSize.toString(), 'telemetry');

    this.log('Publishing to KUBE...');
    return await this.execWithPublisher(async (publisher: PublisherRpcPeer) => {
      const result = await publisher.rpc.publish({
        package: moduleConfig.values.package!,
        skipExisting,
        accessToken,
      });

      result?.modules?.forEach(({ module, urls }) => {
        // TODO(zhenyasav): This is to de-advertise any non localhost urls because of security sandboxes
        //  in the browser requiring https for those domains to support halo vault
        //  also allow https urls but not any http urls unless they contain localhost (not perfect)
        const filteredUrls = urls?.length ? urls.filter((u) => !/^http:/.test(u) || /localhost/.test(u)) : [];
        this.log(`Module ${module.name} published.${filteredUrls?.length ? os.EOL + filteredUrls.join(os.EOL) : ''}`);
      });
    });
  }
}
