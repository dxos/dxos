//


import { BaseCommand } from '../../base-command';

export default class Daemon extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Run daemon process.';

  async run(): Promise<any> {
    setInterval(() => {
      console.log('Running daemon...')
    }, 1000)
    await new Promise(() => {})
  }
}
