//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { Args } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Create extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Create space.';
  static override args = { name: Args.string() };

  async run(): Promise<any> {
    const { args } = await this.parse(Create);
    let { name } = args;
    if (!name) {
      // TODO(burdon): Move to v7: https://v6.fakerjs.dev/migration-guide-v5
      name = `${faker.commerce.productName().toLowerCase().replace(/\s/g, '-')}`;
    }

    return await this.execWithClient(async (client: Client) => {
      const space = await client.createSpace();
      space.properties.name = name;
      const data = {
        key: space.key.toHex(),
        name: space.properties.name,
      };

      this.log(`Created: ${data.key}`);
      return data;
    }, true);
  }
}
