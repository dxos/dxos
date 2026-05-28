//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';
import isEqual from 'fast-deep-equal';
import fs from 'node:fs';
import path from 'node:path';

import { type Client } from '@dxos/client';
import { Filter, type Obj, Type } from '@dxos/echo';
import { Serializer } from '@dxos/echo-db';
import { runAndForwardErrors } from '@dxos/effect';
import { DXN, EchoURI, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

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
      const types = await runAndForwardErrors(Effect.sync(() => space.db.graph.registry.list().filter(Type.isType)));
      const schemas = [...types];
      for (const schema of schemas) {
        const objects = await space.db.query(Filter.type(schema)).run();
        const expectedObjects = SpacesDumper.getExpectedObjectsOfType(expected, space.id, schema);
        const actualIds = objects.map((obj) => obj.id).sort();
        const expectedIds = expectedObjects.map((obj) => obj.id).sort();
        if (!isEqual(actualIds, expectedIds)) {
          log.warn('object ids mismatch', {
            spaceId: space.id,
            schema: Type.getURI(schema)?.toString(),
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
      // Normalize DXN-style type URIs: handles `dxn:type:<nsid>` (legacy) vs `dxn:<nsid>` (canonical).
      if (DXN.isDXN(objType) && DXN.isDXN(schemaURI)) {
        return DXN.tryMake(objType) === DXN.tryMake(schemaURI);
      }
      // Normalize EchoURI-style type references: handles `dxn:echo:@:<id>` (legacy local)
      // vs `echo://<spaceId>/<id>` (new qualified) — same object, different format.
      if (EchoURI.isEchoURI(objType) && EchoURI.isEchoURI(schemaURI)) {
        return EchoURI.getObjectId(EchoURI.parse(objType)) === EchoURI.getObjectId(EchoURI.parse(schemaURI));
      }
      return false;
    });
  };
}

/**
 * EchoURI fields whose wire format changed between snapshots and current output
 * (`dxn:echo:<space>:<id>` → `echo://<space>/<id>`). Compared semantically via
 * `EchoURI.parse` (which normalizes both forms).
 */
const ECHO_ID_FIELDS = new Set(['@uri', '@dxn', '@parent', '@source', '@target']);

/**
 * The self-URI attribute was renamed `@dxn` → `@uri` mid-PR. Snapshots predating the
 * rename use `@dxn`; current output uses `@uri`. Treat the two keys as aliases.
 */
const SELF_URI_ALIASES = new Set(['@uri', '@dxn']);
const aliasedValue = (record: Record<string, any>, key: string): any => {
  if (key in record) {
    return record[key];
  }
  if (SELF_URI_ALIASES.has(key)) {
    for (const alias of SELF_URI_ALIASES) {
      if (alias !== key && alias in record) {
        return record[alias];
      }
    }
  }
  return undefined;
};

export const equals = (actual: Record<string, any>, expected: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(expected)) {
    if (key === '@timestamp') {
      continue;
    }
    const actualValue = aliasedValue(actual, key);
    if (ECHO_ID_FIELDS.has(key) && typeof value === 'string' && typeof actualValue === 'string') {
      // Normalize both via EchoURI.parse so legacy `dxn:echo:` and new `echo://` formats compare equal.
      if (EchoURI.parse(value) !== EchoURI.parse(actualValue)) {
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
