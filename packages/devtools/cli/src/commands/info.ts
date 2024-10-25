//
// Copyright 2022 DXOS.org
//

import inquirer from 'inquirer';

import { BaseCommand } from '../base';

// TODO(burdon): Basic info.
export default class Info extends BaseCommand<typeof Info> {
  static override enableJsonFlag = true;
  static override description = 'System info.';
  static override flags = {
    ...BaseCommand.flags,
  };

  async run(): Promise<any> {
    const { input } = await inquirer.prompt<{ input: string }>({
      type: 'input',
      message: '>',
      name: 'input',
    });
    console.log(input);
    return {};
  }
}
