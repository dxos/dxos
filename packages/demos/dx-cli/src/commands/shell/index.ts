//
// Copyright 2022 DXOS.org
//

import { CliUx, run } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class Shell extends BaseCommand {
  static override description = 'Interactive shell.';
  static override flags = {}; // Required.

  // TODO(burdon): Inquirer vs. ink (different apps?)

  async run (): Promise<void> {
    while (true) {
      // https://github.com/oclif/cli-ux
      const command = await CliUx.ux.prompt('>');
      if (command === 'quit') {
        break;
      }

      // TODO(burdon): Catch not working.
      try {
        await run(command.split(' '));
      } catch (err: any) {
        this.error(err);
      }
    }
  }
}
