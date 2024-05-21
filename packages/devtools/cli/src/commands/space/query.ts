//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';

export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';

  // TODO(burdon): Implement basic predicates.
  // TODO(burdon): Standardize and factor out selector.
  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key);
      const { objects } = await space.db.query({ type: 'test' }).run();
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
