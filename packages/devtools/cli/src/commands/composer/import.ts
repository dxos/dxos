//
// Copyright 2024 DXOS.org
//

import { Args } from '@oclif/core';
import * as fs from 'fs-extra';

import { Filter, type Space } from '@dxos/client/echo';
import { compareForeignKeys, getTypename } from '@dxos/echo-schema';
import { diff } from '@dxos/util';

import { ComposerBaseCommand } from './base';
import { BaseCommand, FLAG_SPACE_KEYS } from '../../base';

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
export default class Import extends ComposerBaseCommand<typeof Import> {
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
    const { objects } = JSON.parse(String(fs.readFileSync(this.args.file!))) as DataFile;

    // Load objects.
    const load = async (space: Space) => {
      const results: any[] = [];
      for (const object of objects) {
        const obj = this.parseObject(this.schemaMap, object);

        // Merge based on FKs (need to query by FK).
        const { objects } = await space.db.query(Filter.typename(getTypename(obj)!)).run();
        const { added } = diff(objects, [obj], compareForeignKeys);
        added.forEach((obj) => {
          if (this.flags.verbose) {
            this.log('Adding: ', getTypename(obj));
          }
          if (this.flags['dry-run']) {
            this.log(JSON.stringify(obj, undefined, 2));
          } else {
            space.db.add(obj);
          }
        });

        results.push(...added);
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
