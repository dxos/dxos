//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

/**
 * A space's objects as JSON, in the format echo-client's serializer writes, so either backend reads
 * the other's exports.
 */
export type SerializedSpace = {
  version: number;
  timestamp?: string;
  objects: Obj.JSON[];
};

export type ImportOptions = {
  /** Called for each object before importing; false skips it. */
  onObject?: (object: Obj.JSON) => Promise<boolean>;
};

/**
 * Exports a space's objects to JSON and imports them into another database.
 */
export class Serializer {
  static version = 1;

  /**
   * The objects a query selects, or every object of the space.
   */
  async export(database: Database.Database, query?: Query.Any): Promise<SerializedSpace> {
    const objects = await database.query(query ?? Query.select(Filter.everything())).run();
    return {
      version: Serializer.version,
      timestamp: new Date().toISOString(),
      objects: objects.filter(Obj.isObject).map((object) => this.exportObject(object)),
    };
  }

  /**
   * Adds exported objects to a database: objects first, then relations, whose endpoints must exist.
   */
  async import(database: Database.Database, data: SerializedSpace, opts?: ImportOptions): Promise<void> {
    invariant(data.version === Serializer.version, `Invalid version: ${data.version}`);
    const relations: Obj.JSON[] = [];
    for (const object of data.objects) {
      if (opts?.onObject && !(await opts.onObject(object))) {
        continue;
      }
      if (object['@relationSource'] || object['@relationTarget']) {
        relations.push(object);
      } else {
        await this.#importObject(database, object);
      }
    }
    await database.flush();
    for (const relation of relations) {
      await this.#importObject(database, relation);
    }
    await database.flush();
  }

  exportObject(object: Obj.Any): Obj.JSON {
    return Obj.toJSON(object);
  }

  async #importObject(database: Database.Database, data: Obj.JSON): Promise<void> {
    const object = await Obj.fromJSON(data, {
      refResolver: database.graph.createRefResolver({ context: { space: database.spaceId } }),
    });
    // Type entities persist through `addType`, which `add` refuses them for.
    if (Type.isType(object)) {
      await database.addType(object);
    } else {
      database.add(object);
    }
  }
}
