//
// Copyright 2023 DXOS.org
//

import { Help } from '@oclif/core';
import chalk from 'chalk';
import rev from 'git-rev-sync';

// http://patorjk.com/software/taag/#p=testall&f=Patorjk-HeX&t=DXOS
export const BANNER =
  '_/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\______/\\/\\/\\/\\/\\_\n' +
  '_/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\__/\\/\\_________\n' +
  '_/\\/\\____/\\/\\______/\\/\\______/\\/\\____/\\/\\____/\\/\\/\\/\\___\n' +
  '_/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\__________/\\/\\_\n' +
  '_/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\/\\/\\/\\___\n';

export default class CustomHelp extends Help {
  override async showHelp(args: string[]) {
    if (!args.length) {
      console.log(BANNER);
    }

    const warnings = [];
    if (process.env.NODE_ENV === 'development') {
      warnings.push(chalk`{blue NODE_ENV}: {red ${process.env.NODE_ENV}} (${rev.branch()} #${rev.short()})`);
    }

    if (process.env.DX_PROFILE) {
      warnings.push(this.log(chalk`{blue DX_PROFILE}: {green ${process.env.DX_PROFILE}}`));
    }

    if (warnings.length) {
      this.log(warnings.join('\n'));
    }

    await super.showHelp(args);
  }
}
