//
// Copyright 2024 DXOS.org
//

import { Args, Flags } from '@oclif/core';
import * as fs from 'fs-extra';

import { type Client } from '@dxos/client';
import { create, type Space } from '@dxos/client/echo';
import { getEchoObjectAnnotation, S } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { BaseCommand } from '../../base';

// TODO(burdon): Move to @dxos/cli-composer.
//  https://oclif.io/docs/command_discovery_strategies

const SCHEMA = [FunctionDef, FunctionTrigger];

const TYPE_ATTR = '@typename';

/**
 * ```bash
 * dx composer import ./testing/data/space.json --space 043a42f1 --dry-run
 * ```
 */
export default class Import extends BaseCommand<typeof Import> {
  static override description = 'Import ECHO objects.';
  static override flags = {
    ...BaseCommand.flags,
    space: Flags.string({ multiple: true }),
  };

  static override args = { file: Args.string() };

  async run() {
    return await this.execWithClient(async (client) => {
      const schemaMap = await this.addTypes(client);

      // Parse data.
      const objects = JSON.parse(String(fs.readFileSync(this.args.file!))) as any[];

      // Load objects.
      const load = async (space: Space) => {
        this.log(`Space: ${space.key.truncate()}`);
        for (const object of objects) {
          const obj = this.parseObject(schemaMap, object);
          if (this.flags['dry-run'] || this.flags.verbose) {
            this.log(JSON.stringify(obj, undefined, 2));
          }

          if (!this.flags['dry-run']) {
            space.db.add(obj);
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

  /**
   * build typename
   */
  // TODO(burdon): Factor out.
  async addTypes(client: Client) {
    const schemaMap = new Map<string, S.Schema<any>>();
    const types = await import('@braneframe/types');
    if (this.flags.verbose) {
      this.log('Adding schema');
    }

    const schemata = [...SCHEMA, ...Object.values(types)]
      .map((schema) => {
        if (S.isSchema(schema)) {
          const { typename } = getEchoObjectAnnotation(schema as any) ?? {};
          if (typename) {
            return [typename, schema];
          }
        }

        return null;
      })
      .filter<[string, any]>(nonNullable<any>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    for (const [typename, schema] of schemata) {
      if (this.flags.verbose) {
        this.log(`- ${typename}`);
      }

      client.addSchema(schema as any);
      schemaMap.set(typename, schema);
    }

    return schemaMap;
  }

  /**
   * Parse object.
   */
  // TODO(burdon): Factor out.
  parseObject(schemaMap: Map<string, S.Schema<any>>, data: Record<string, any>): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.parseObject(schemaMap, item));
    } else if (typeof data === 'object') {
      const typename = data[TYPE_ATTR];
      if (typename) {
        const type = schemaMap.get(typename);
        invariant(type, `Schema not found: ${typename}`);
        if (this.flags.verbose) {
          this.log(`- Creating: ${typename}`);
        }

        const object = Object.entries(data).reduce<Record<string, any>>((object, [key, value]) => {
          object[key] = this.parseObject(schemaMap, value);
          return object;
        }, {});

        // if (this.flags.verbose) {
        //   this.log(JSON.stringify(object, undefined, 2));
        // }

        return create(type, object);
      }
    }

    return data;
  }
}
