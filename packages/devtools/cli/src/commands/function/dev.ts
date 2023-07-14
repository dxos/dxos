//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import { load } from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { runFunctions } from '@dxos/functions';

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
    for (const requirePath of this.flags.require ?? []) {
      require(requirePath);
    }

    await this.execWithClient(async (client) => {
      await runFunctions({
        client,
        functionsDirectory: join(process.cwd(), 'src/functions'),
        manifest: load(await readFile(join(process.cwd(), this.flags.manifest), 'utf8')) as any,
      });

      // Hang forever.
      await new Promise(() => {});
    });
  }
}
