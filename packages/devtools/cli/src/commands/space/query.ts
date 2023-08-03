//
// Copyright 2023 DXOS.org
//

import { Args } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Query extends BaseCommand<typeof Query> {
  static override enableJsonFlag = true;
  static override description = 'Query database.';

  // TODO(burdon): Implement basic predicates.
  static override args = { key: Args.string({ description: 'Space key head in hex.', required: true }) };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      const space = spaces.find((space) => space.key.toHex().startsWith(key!));
      if (!space) {
        this.error('Invalid key');
      }

      await space.waitUntilReady();

      const { objects } = space?.db.query({ type: 'test' });
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
