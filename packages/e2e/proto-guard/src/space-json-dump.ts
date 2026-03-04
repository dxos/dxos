//
// Copyright 2024 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import isEqual from 'fast-deep-equal';

import { type Client } from '@dxos/client';
import { Filter, Serializer } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { Type, type Obj } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';
import { Record } from 'effect';

export type SpacesDump = {
  /**
   * SpaceIds mapped to JSON dump of all objects in the space.
   */
  [spaceId: string]: {
    /**
     * ObjectIds mapped to JSON dump of the object.
     */
    [objectId: string]: Obj.JSON;
  };
};

export class SpacesDumper {
  static dumpSpaces = async (client: Client, filePath?: string): Promise<SpacesDump> => {
    const dump: SpacesDump = {};
    const serializer = new Serializer();

    for (const space of client.spaces.get()) {
      await space.waitUntilReady();
      const objects = await space.db.query(Filter.everything()).run();

      dump[space.id] = {};
      for (const object of objects) {
        dump[space.id][object.id] = serializer.exportObject(object);
      }
    }

    if (filePath) {
      SpacesDumper.save(dump, filePath);
    }

    return dump;
  };

  /**
   * Compares object content of each space in the client with the expected data.
   */
  static checkIfSpacesMatchExpectedData = async (client: Client, expected: SpacesDump) => {
    const received = await SpacesDumper.dumpSpaces(client);

    for (const [spaceId, space] of Object.entries(expected)) {
      for (const [objectId, object] of Object.entries(space)) {
        if (!received[spaceId][objectId]) {
          log.warn('object not found', { spaceId, objectId });
          return false;
        }

        if (!equals(received[spaceId][objectId], object)) {
          log.warn('data mismatch', {
            spaceId,
            objectId,
            expected: object,
            received: received[spaceId][objectId],
          });
          return false;
        }
      }
    }

    return true;
  };

  /**
   * Runs a query for each schema in each space and compares the object ids with the expected data.
   */
  static checkIfSpacesMatchExpectedDataUsingQuery = async (client: Client, expected: SpacesDump): Promise<boolean> => {
    for (const space of client.spaces.get()) {
      const schemas = await space.db.schemaRegistry.query({ location: ['database', 'runtime'] }).run();
      for (const schema of schemas) {
        const objects = await space.db.query(Filter.type(schema)).run();
        const expectedObjects = SpacesDumper.getExpectedObjectsOfType(expected, space.id, schema);
        const actualIds = objects.map((obj) => obj.id).sort();
        const expectedIds = expectedObjects.map((obj) => obj.id).sort();
        if (!isEqual(actualIds, expectedIds)) {
          log.warn('object ids mismatch', {
            spaceId: space.id,
            schema: Type.getDXN(schema)?.toString(),
            actualIds,
            expectedIds,
          });
          return false;
        }
      }
    }
    return true;
  };

  static save(dump: SpacesDump, filePath: string): void {
    fs.writeFileSync(path.join(filePath), JSON.stringify(dump, null, 2));
  }

  static async load(filePath: string): Promise<SpacesDump> {
    const data: SpacesDump = JSON.parse(fs.readFileSync(path.join(filePath), 'utf-8'));
    return data;
  }

  static getExpectedObjectsOfType = (expected: SpacesDump, spaceId: SpaceId, schema: Type.Entity.Any) => {
    const objects = expected[spaceId] ?? [];
    return Record.values(objects).filter((obj) => obj['@type'] === Type.getDXN(schema)?.toString());
  };
}

export const equals = (actual: Record<string, any>, expected: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(expected)) {
    if (key === '@timestamp') {
      continue;
    }
    if (!isEqual(value, actual[key])) {
      log.warn('value mismatch', { key, expected: value, actual: actual[key] });
      return false;
    }
  }

  return true;
};
