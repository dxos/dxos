//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../../base';

export default class Generate extends BaseCommand<typeof Generate> {
  static override enableJsonFlag = true;
  static override description = 'Generate a seedphrase that can be used for identity recovery.';

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      const result = await client.services.services.IdentityService!.createRecoveryPhrase();
      console.log(result.seedphrase);
      return result.seedphrase;
    });
  }
}
