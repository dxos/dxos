//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { load } from 'js-yaml';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { DevServer, InvokeOptions, mountTrigger, FunctionsManifest } from '@dxos/functions';

import { BaseCommand } from '../../base-command';

export default class Dev extends BaseCommand<typeof Dev> {
  static override enableJsonFlag = true;
  static override description = 'Development server.';
  static override aliases = ['function:dev'];
  static override examples = [
    {
      description: 'Run with TypeScript support.',
      command: 'dx function dev-server -r ts-node/register --verbose',
    },
  ];

  static override flags = {
    ...BaseCommand.flags,
    require: Flags.string({ multiple: true, aliases: ['r'] }),
    manifest: Flags.string({ default: 'functions.yml' }),
  };

  async run(): Promise<any> {
    // TODO(burdon): Move into server?
    for (const requirePath of this.flags.require ?? []) {
      require(requirePath);
    }

    const functionsManifest = load(
      await readFile(join(process.cwd(), this.flags.manifest), 'utf8'),
    ) as FunctionsManifest;

    await this.execWithClient(async (client) => {
      // TODO(dmaretskyi): Move into system service?
      const config = new Config(JSON.parse((await client.services.services.DevtoolsHost!.getConfig()).config));
      assert(config.values.runtime?.agent?.functions?.port, 'Port not set.');

      const server = new DevServer(client, {
        directory: join(process.cwd(), 'src/functions'),
        manifest: functionsManifest,
      });

      const invokeOptions: InvokeOptions = {
        runtime: 'dev',
        endpoint: `http://localhost:${config.values.runtime?.agent?.functions?.port}`,
      };

      // TODO(burdon): Start/stop.
      for (const trigger of functionsManifest.triggers) {
        await mountTrigger({
          ctx: new Context(),
          client,
          trigger,
          invokeOptions, // TODO(burdon): Rename.
        });
      }

      await server.initialize();
      await server.start();

      this.log(`Running: ${server.endpoint} (ctrl-c to exit)`);
      process.on('SIGINT', async () => {
        await server.stop();
        process.exit();
      });

      if (this.flags.verbose) {
        this.log(chalk`{green Functions:\n${server.functions.map((name) => `- ${name}`).join('\n')}}`);
      }

      // Wait until exit (via SIGINT).
      await new Promise(() => {});
    });
  }
}
