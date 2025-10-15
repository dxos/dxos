//
// Copyright 2024 DXOS.org
//

import { Args } from '@oclif/core';

import { FLAG_SPACE_KEYS } from '@dxos/cli-base';
import { Filter, type Space, compareForeignKeys } from '@dxos/client/echo';
import { getTypename } from '@dxos/echo/internal';
import { diff } from '@dxos/util';

import { BaseCommand } from '../../base.js';

type DataFile = {
  objects: Record<string, any>[];
};

/**
 * The import command allow importing ECHO objects from a JSON file.
 *
 * ```bash
 * dx composer import ./testing/data/space.json --space 043a42f1 --dry-run
 * ```
 */
export default class Import extends BaseCommand<typeof Import> {
  static override description = 'Import ECHO objects.';
  static override flags = {
    ...BaseCommand.flags,
    ...FLAG_SPACE_KEYS,
  };

  static override args = {
    file: Args.string({ required: true }),
  };

  async run() {
    // Parse data.
    const { objects } = this.parseJson<DataFile>(this.args.file);

    // Load objects.
    const load = async (space: Space) => {
      const results: any[] = [];
      for (const object of objects) {
        const obj = this.parseObject(this.schemaMap, object);

        // Merge based on FKs (need to query by FK).
        const { objects } = await space.db.query(Filter.typename(getTypename(obj)!)).run();
        const { added, updated } = diff(objects, [obj], compareForeignKeys);
        added.forEach((obj) => {
          if (this.flags.verbose) {
            this.log('Adding: ', getTypename(obj));
          }
          if (this.flags['dry-run']) {
            this.log(JSON.stringify(obj, undefined, 2));
          } else {
            // TODO(dmaretskyi): Fix types.
            space.db.add(obj as any);
          }
        });
        updated.forEach((obj) => {
          if (this.flags.verbose) {
            this.log('Updating: ', getTypename(obj));
          }
          if (this.flags['dry-run']) {
            // TODO(burdon): API Issue (is this safe)?
            Object.assign(object, obj);
          }
        });

        results.push(...added, ...updated);
      }

      await space.db.flush();
      return results;
    };

    return await this.execWithSpace(async ({ space }) => await load(space), {
      spaceKeys: this.flags.key,
      verbose: true,
    });
  }
}
