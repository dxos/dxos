//
// Copyright 2024 DXOS.org
//

import * as Record from 'effect/Record';
import isEqual from 'fast-deep-equal';
import fs from 'node:fs';
import path from 'node:path';

import { type Client } from '@dxos/client';
import { type Obj, Filter, Query, Scope, Type } from '@dxos/echo';
import { Serializer } from '@dxos/echo-client';
import { type SpaceId, EID } from '@dxos/keys';
import { log } from '@dxos/log';

export type SpacesDump = {
  /**
   * SpaceIds mapped to JSON dump of all objects in the space.
   */
  [spaceId: string]: {
    /**
     * EntityIds mapped to JSON dump of the object.
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
      const types = await space.db
        .query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
        .run();
      for (const type of types) {
        const objects = await space.db.query(Filter.type(type)).run();
        const expectedObjects = SpacesDumper.getExpectedObjectsOfType(expected, space.id, type);
        const actualIds = objects.map((obj) => obj.id).sort();
        const expectedIds = expectedObjects.map((obj) => obj.id).sort();
        if (!isEqual(actualIds, expectedIds)) {
          log.warn('object ids mismatch', {
            spaceId: space.id,
            schema: Type.getURI(type)?.toString(),
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

  static getExpectedObjectsOfType = (expected: SpacesDump, spaceId: SpaceId, schema: Type.AnyEntity) => {
    const objects = expected[spaceId] ?? [];
    const schemaURI = Type.getURI(schema)?.toString();
    return Record.values(objects).filter((obj) => {
      const objType: string | undefined = obj['@type'];
      if (!objType || !schemaURI) {
        return false;
      }
      if (objType === schemaURI) {
        return true;
      }
      // Echo type references compare by entity id (local `echo:/<id>` vs qualified
      // `echo://<spaceId>/<id>` address the same object).
      if (EID.isEID(objType) && EID.isEID(schemaURI)) {
        return EID.getEntityId(EID.parse(objType)) === EID.getEntityId(EID.parse(schemaURI));
      }
      return false;
    });
  };
}

/**
 * EID-valued fields, compared semantically via `EID.parse` so the local (`echo:/<id>`) and
 * qualified (`echo://<space>/<id>`) forms of the same reference compare equal.
 */
const ECHO_ID_FIELDS = new Set(['@uri', '@parent', '@source', '@target']);

export const equals = (actual: Record<string, any>, expected: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(expected)) {
    if (key === '@timestamp') {
      continue;
    }
    const actualValue = actual[key];
    if (ECHO_ID_FIELDS.has(key) && typeof value === 'string' && typeof actualValue === 'string') {
      if (EID.parse(value) !== EID.parse(actualValue)) {
        log.warn('value mismatch', { key, expected: value, actual: actualValue });
        return false;
      }
      continue;
    }
    if (!isEqual(value, actualValue)) {
      log.warn('value mismatch', { key, expected: value, actual: actualValue });
      return false;
    }
  }

  return true;
};
