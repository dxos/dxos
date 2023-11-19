//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Config } from '@dxos/config';
import { DevServer, type FunctionManifest, TriggerManager } from '@dxos/functions';

import { BaseCommand } from '../../base-command';

export default class Dev extends BaseCommand<typeof Dev> {
  static override enableJsonFlag = true;
  static override description = 'Development server.';
  static override aliases = ['function:dev-server'];
  static override examples = [
    {
      description: 'Run with TypeScript support.',
      command: 'dx function dev -r ts-node/register --verbose',
    },
  ];

  static override flags = {
    ...BaseCommand.flags,
    require: Flags.string({ multiple: true, aliases: ['r'], default: ['ts-node/register'] }),
    baseDir: Flags.string({ default: join(process.cwd(), 'src/functions') }),
    manifest: Flags.string({ default: join(process.cwd(), 'functions.yml') }),
  };

  async run(): Promise<any> {
    // TODO(burdon): Move into server?
    for (const requirePath of this.flags.require ?? []) {
      require(requirePath);
    }

    await this.execWithClient(async (client) => {
      // TODO(dmaretskyi): Move into system service?
      const config = new Config(JSON.parse((await client.services.services.DevtoolsHost!.getConfig()).config));
      const functionsConfig = config.values.runtime?.agent?.plugins?.find(
        (plugin) => plugin.id === 'dxos.org/agent/plugin/functions', // TODO(burdon): Use const.
      );

      const manifest = load(await readFile(this.flags.manifest, 'utf8')) as FunctionManifest;

      // TODO(burdon): Reconcile with FunctionsPlugin: dev command vs. agent.
      //  - FunctionsPlugin
      //  - OpenFaasPlugin
      //  - DevServer
      //  - TriggerManager

      const server = new DevServer(client, {
        port: functionsConfig?.config?.port,
        directory: this.flags.baseDir,
        manifest,
      });

      await server.initialize();
      await server.start();

      const runtime = 'dev'; // TODO(burdon): Const.

      // TODO(burdon): Factor out (keep CLI commands simple).
      const triggers = new TriggerManager(client, manifest, { endpoint: server.endpoint, runtime });
      await triggers.start();

      this.log(`Function endpoint: ${server.endpoint} (ctrl-c to exit)`);
      process.on('SIGINT', async () => {
        await triggers.stop();
        await server.stop();
        process.exit();
      });

      // TODO(burdon): Get from server API.
      if (this.flags.verbose) {
        this.log(
          chalk`{green Functions}:\n${server.functions
            .map(({ def: { id, path } }) => chalk`- {blue ${join(server.endpoint, path).padEnd(40)}} => ${id}`)
            .join('\n')}`,
        );
      }

      // Wait until exit (via SIGINT).
      await new Promise(() => {});
    });
  }
}
