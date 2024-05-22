//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { Trigger } from '@dxos/async';
import { DX_DATA, getProfilePath, type Space } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import {
  DevServer,
  type FunctionManifest,
  FunctionRegistry,
  FunctionTrigger,
  Scheduler,
  TriggerRegistry,
} from '@dxos/functions';

import { BaseCommand } from '../../base';

export default class Dev extends BaseCommand<typeof Dev> {
  static override enableJsonFlag = true;
  static override description = 'Functions development server.';
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
    manifest: Flags.string({ description: 'Functions manifest file.' }),
    baseDir: Flags.string({ description: 'Base directory for function handlers.' }),
    reload: Flags.boolean({ description: 'Reload functions on change.' }),
    space: Flags.string({ description: 'Space key.' }),
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

      // Local files.
      const file = this.flags.manifest ?? functionsConfig?.config?.manifest ?? join(process.cwd(), 'functions.yml');
      const manifest = load(await readFile(file, 'utf8')) as FunctionManifest;
      const directory = this.flags.baseDir ?? join(dirname(file), 'src/functions');

      // Local dev server.
      const registry = new FunctionRegistry(client);
      const server = new DevServer(client, registry, {
        baseDir: directory,
        reload: this.flags.reload,
        dataDir: getProfilePath(DX_DATA, this.flags.profile),
      });

      await server.start();

      // TODO(burdon): Move to agent's FunctionsPlugin.
      const triggerRegistry = new TriggerRegistry(client);
      const scheduler = new Scheduler(registry, triggerRegistry, { endpoint: server.proxy! });
      await scheduler.start();

      const update = async (space: Space) => {
        // TODO(burdon): Registry should not be space-specific.
        await registry.register(space, manifest);
        await scheduler.register(space, manifest);
      };

      client.addSchema(FunctionTrigger);
      if (this.flags.space) {
        const space = await this.getSpace(client, this.flags.space);
        await update(space);
      } else {
        // TODO(burdon): Option to subscribe for new spaces.
        for (const space of await this.getSpaces(client, true)) {
          await update(space);
        }
      }

      this.log(`DevServer running: ${chalk.blue(server.endpoint)} (ctrl-c to exit)`);
      const run = new Trigger();
      process.on('SIGINT', async () => {
        await scheduler.stop();
        await server.stop();
        run.wake();
      });

      if (this.flags.verbose) {
        // TODO(burdon): Get list of functions from plugin API endpoint.
        this.log(`Plugin proxy: ${chalk.blue(server.proxy)}`);
        this.log(
          'Functions:\n' +
            server.functions
              .map(({ def: { uri, route } }) => chalk`- ${uri.padEnd(40)} {blue ${join(server.proxy!, route)}}`)
              .join('\n'),
        );
      }

      // Wait until exit (via SIGINT).
      await run.wait();
    });
  }
}
