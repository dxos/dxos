//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Config } from '@dxos/config';
import { DevServer, type FunctionsManifest, TriggerManager } from '@dxos/functions';
import { invariant } from '@dxos/invariant';

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
    require: Flags.string({ multiple: true, aliases: ['r'], default: ['ts-node/register'] }),
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
      const server = new DevServer(client, {
        directory: join(process.cwd(), 'src/functions'),
        manifest: functionsManifest,
      });

      await server.initialize();
      await server.start();

      // TODO(dmaretskyi): Move into system service?
      const config = new Config(JSON.parse((await client.services.services.DevtoolsHost!.getConfig()).config));
      invariant(config.values.runtime?.agent?.plugins?.functions?.port, 'Port not set.');
      const endpoint = `http://localhost:${config.values.runtime?.agent?.plugins?.functions?.port}`;
      const triggers = new TriggerManager(client, functionsManifest.triggers, { runtime: 'dev', endpoint });
      await triggers.start();

      this.log(`Function dev-server: ${server.endpoint} (ctrl-c to exit)`);
      process.on('SIGINT', async () => {
        await triggers.start();
        await server.stop();
        process.exit();
      });

      if (this.flags.verbose) {
        this.log(
          chalk`{green Function endpoints: ${endpoint}\n${server.functions.map((name) => `- ${name}`).join('\n')}}`,
        );
      }

      // Wait until exit (via SIGINT).
      await new Promise(() => {});
    });
  }
}
