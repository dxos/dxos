//
// Copyright 2024 DXOS.org
//

import { type Command } from '@oclif/core';
import { Schema } from 'effect';

import { AbstractBaseCommand } from '@dxos/cli-base';
import { type Client } from '@dxos/client';
import { ATTR_META, ATTR_TYPE, type ObjectMeta, getTypeAnnotation } from '@dxos/echo/internal';
import { FUNCTION_TYPES } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/echo/internal';
import { isNonNullable } from '@dxos/util';

/**
 * Plugin base command.
 */
export abstract class BaseCommand<T extends typeof Command = any> extends AbstractBaseCommand<T> {
  // TODO(burdon): Move to BaseCommand.
  protected _schemaMap?: Map<string, Schema.Schema.AnyNoContext>;

  get schemaMap() {
    invariant(this._schemaMap, 'Schema map not initialized.');
    return this._schemaMap;
  }

  protected override async onClientInit(client: Client): Promise<void> {
    this._schemaMap = await this.addTypes(client);
  }

  /**
   * build typename
   */
  protected async addTypes(client: Client): Promise<Map<string, Schema.Schema.AnyNoContext>> {
    const schemaMap = new Map<string, Schema.Schema.AnyNoContext>();
    // TODO(burdon): Enable dynamic import? (e.g., from npm.)
    // const types = await import('@braneframe/types');
    if (this.flags.verbose) {
      this.log('Adding schema...');
    }

    const schemata = [...FUNCTION_TYPES]
      .map((schema) => {
        if (Schema.isSchema(schema)) {
          const { typename } = getTypeAnnotation(schema as any) ?? {};
          if (typename) {
            return [typename, schema];
          }
        }

        return null;
      })
      .filter<[string, any]>(isNonNullable<any>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    for (const [typename, schema] of schemata) {
      // if (this.flags.verbose) {
      //   this.log(`- ${typename}`);
      // }

      client.addTypes(schema as any);
      schemaMap.set(typename, schema);
    }

    return schemaMap;
  }

  /**
   * Parse object.
   */
  protected parseObject(schemaMap: Map<string, Schema.Schema.AnyNoContext>, data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.parseObject(schemaMap, item));
    } else if (typeof data === 'object') {
      const typename = data[ATTR_TYPE];
      if (typename) {
        const type = schemaMap.get(typename);
        invariant(type, `Schema not found: ${typename}`);
        let meta: ObjectMeta | undefined;
        const object = Object.entries(data).reduce<Record<string, any>>((object, [key, value]) => {
          if (key === ATTR_META) {
            meta = value as ObjectMeta;
          } else {
            object[key] = this.parseObject(schemaMap, value);
          }

          return object;
        }, {});

        // if (this.flags.verbose) {
        //   this.log(JSON.stringify({ object, meta }, undefined, 2));
        // }

        return live(type, object, meta);
      }
    }

    return data;
  }
}
