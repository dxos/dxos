//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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

      const file = this.flags.manifest ?? functionsConfig?.config?.manifest ?? join(process.cwd(), 'functions.yml');
      const directory = this.flags.baseDir ?? join(dirname(file), 'src/functions');

      const manifest = load(await readFile(file, 'utf8')) as FunctionManifest;
      const server = new DevServer(client, {
        directory,
        manifest,
      });

      await server.initialize();
      await server.start();

      // TODO(burdon): Move to plugin (make independent of runtime).
      const triggers = new TriggerManager(client, manifest, { endpoint: server.proxy! });
      await triggers.start();

      this.log(`DevServer: ${chalk.blue(server.endpoint)} (ctrl-c to exit)`);
      process.on('SIGINT', async () => {
        await triggers.stop();
        await server.stop();
        process.exit();
      });

      // TODO(burdon): Get from server API. Table.
      if (this.flags.verbose) {
        this.log(`Proxy: ${chalk.blue(server.proxy)}`);
        this.log(
          'Functions:\n' +
            server.functions
              .map(({ def: { id, path } }) => chalk`- ${id.padEnd(40)} {blue ${join(server.proxy!, path)}}`)
              .join('\n'),
        );
      }

      // Wait until exit (via SIGINT).
      await new Promise(() => {});
    });
  }
}
