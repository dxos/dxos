//
// Copyright 2022 DXOS.org
//

import { run } from '@oclif/core';
import inquirer from 'inquirer';

import { BaseCommand } from '../../base';

export default class Shell extends BaseCommand<typeof Shell> {
  static override description = 'Interactive shell.';

  async run(): Promise<void> {
    while (true) {
      // https://github.com/oclif/cli-ux
      const { command } = await inquirer.prompt<{ command: string }>({ name: 'command' });
      if (command === 'quit') {
        break;
      }

      // https://oclif.io/docs/running_programmatically
      await run(command.split(' '));
    }
  }
}
