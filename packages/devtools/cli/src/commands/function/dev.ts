//
// Copyright 2023 DXOS.org
//



import { runFunctions } from '@dxos/functions';
import { join } from 'node:path';
import { BaseCommand } from '../../base-command';
import { Args, Flags } from '@oclif/core';

export default class Dev extends BaseCommand<typeof Dev> {
  static override enableJsonFlag = true;
  static override description = 'Functions dev server.';

  static override flags = {
    ...BaseCommand.flags,
    require: Flags.string({ multiple: true, aliases: ['r'] }),
  };

  async run(): Promise<any> {
    for(const requirePath of this.flags.require ?? []) {
      require(requirePath);
    }

    await this.execWithClient(async (client) => {
      await runFunctions({
        client,
        functionsDirectory: join(process.cwd(), 'src/functions')
      })

      // Hang forever.
      await new Promise(() => {});
    });
  }
}
