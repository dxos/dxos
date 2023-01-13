//
// Copyright 2022 DXOS.org
//

import { CliUx, run } from '@oclif/core';

import { BaseCommand } from '../../base-command';

export default class Shell extends BaseCommand {
  static override description = 'Interactive shell.';

  // BaseCommand handler is also called.
  override async catch() {
    void this.run();
  }

  async run(): Promise<void> {
    while (true) {
      // https://github.com/oclif/cli-ux
      const command = await CliUx.ux.prompt('');
      if (command === 'quit') {
        break;
      }

      // https://oclif.io/docs/running_programmatically
      await run(command.split(' '));
    }
  }
}
