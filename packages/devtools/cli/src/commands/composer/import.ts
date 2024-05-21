//
// Copyright 2024 DXOS.org
//

import { Args, Flags } from '@oclif/core';
import * as fs from 'fs-extra';

import { create, type Space } from '@dxos/client/echo';
import { getTypename, S } from '@dxos/echo-schema';

import { BaseCommand } from '../../base';

// TODO(burdon): Move to @dxos/cli-composer.
//  https://oclif.io/docs/command_discovery_strategies

export default class Import extends BaseCommand<typeof Import> {
  static override description = 'Composer commands';
  static override flags = {
    ...BaseCommand.flags,
    space: Flags.string({ multiple: true }),
  };

  static override args = { file: Args.string() };

  async run() {
    return await this.execWithClient(async (client) => {
      // Load schema.
      const types = await import('@braneframe/types');
      const schemaMap = new Map<string, S.Schema.Any>();
      for (const schema of Object.values(types)) {
        if (S.isSchema(schema)) {
          client.addSchema(schema as any);
          schemaMap.set(getTypename(schema)!, schema);
        }
      }

      const data = JSON.parse(String(fs.readFileSync(this.args.file!)));

      const load = async (space: Space) => {
        this.log(`Importing: ${space.key.truncate()}`);
        for (const [type, objects] of Object.entries(data)) {
          for (const object of objects as any[]) {
            const schema = schemaMap.get(type);
            if (!schema) {
              this.error(`Schema not found: ${type}`);
            } else {
              console.log(create(schema as any, object));
            }

            // client.addSchema();
          }
        }
      };

      if (!this.flags.space) {
        const space = await this.getSpace(client);
        await load(space);
      } else {
        for (const key of this.flags.space) {
          const space = await this.getSpace(client, key);
          await load(space);
        }
      }
    });
  }
}
