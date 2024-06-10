//
// Copyright 2022 DXOS.org
//

import { FLAG_SPACE_KEYS } from '@dxos/cli-base';
import { FunctionDef, FunctionTrigger } from '@dxos/functions';

import { BaseCommand } from '../../../base';

export default class List extends BaseCommand<typeof List> {
  static {
    this.description = 'List schema.';
    // TODO(burdon): Is this typesafe?
    this.flags = {
      ...BaseCommand.flags,
      ...FLAG_SPACE_KEYS,
    };
  }

  // TODO(burdon): Table.

  async run(): Promise<any> {
    const { space: spaceKeys } = this.flags;
    return await this.execWithSpace(
      async ({ client, space }) => {
        client.addSchema(FunctionDef, FunctionTrigger);

        const s1 = await space.db.schemaRegistry.getAll();
        const s2 = client.experimental.graph.runtimeSchemaRegistry.schemas;
        console.log(space.key.truncate(), s1, s2);
        // TODO(burdon): Doesn't stringify.
        console.log(s2.map((s) => JSON.stringify(s)));
      },
      { spaceKeys },
    );
  }
}
