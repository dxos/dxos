//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/client';

import { BaseCommand, SPACE_KEY } from '../../base';

export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';

  // TODO(burdon): Implement basic predicates.
  // TODO(burdon): Standardize and factor out selector.
  static override args = SPACE_KEY;

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, this.args.key);
      const { objects } = await space.db.query().run();
      if (this.flags.json) {
        if (this.flags.verbose) {
          return { objects };
        } else {
          return { objects: objects.length };
        }
      } else {
        this.log('Objects:', objects.length);
        if (this.flags.verbose) {
          for (const object of objects) {
            this.log(`- ${object.id}`);
          }
        }
      }
    });
  }
}
