//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { FunctionServer } from '@dxos/functions';

import { BaseCommand } from '../../base-command';

export default class Dev extends BaseCommand<typeof Dev> {
  static override enableJsonFlag = true;
  static override description = 'Functions dev server.';

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

    await this.execWithClient(async (client) => {
      const server = new FunctionServer(client, {
        directory: join(process.cwd(), 'src/functions'),
        manifest: load(await readFile(join(process.cwd(), this.flags.manifest), 'utf8')) as any,
      });

      await server.initialize();
      await server.start();

      this.log(`Running: ${server.endpoint} (ctrl-c to exit)`);
      process.on('SIGINT', async () => {
        await server.stop();
        process.exit();
      });

      // Wait until exit (via SIGINT).
      await new Promise(() => {});
    });
  }
}
