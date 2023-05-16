//


import { Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command';

export default class Run extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Run daemon process.';

  static override flags = {
    ...BaseCommand.flags,
    listen: Flags.string({
      description: 'Expose services.'
    }),
    profile: Flags.string({
      description: 'Profile to use.'
    })
  };

  async run(): Promise<any> {
    const { flags: { listen, profile } } = await this.parse(Run);
    setInterval(() => {
      console.log('Running daemon...', { listen, profile })
    }, 1000)
    await new Promise(() => {})
  }
}
