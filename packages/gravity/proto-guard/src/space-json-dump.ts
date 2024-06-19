//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';
import fs from 'node:fs';
import path from 'node:path';

import { type Client } from '@dxos/client';
import { Serializer } from '@dxos/echo-db';
import { log } from '@dxos/log';

export type SpacesDump = {
  /**
   * SpaceIds mapped to JSON dump of all objects in the space.
   */
  [spaceId: string]: {
    /**
     * ObjectIds mapped to JSON dump of the object.
     */
    [objectId: string]: any;
  };
};

export class SpacesDumper {
  static dumpSpaces = async (client: Client, filePath?: string): Promise<SpacesDump> => {
    const dump: SpacesDump = {};
    const serializer = new Serializer();

    for (const space of client.spaces.get()) {
      const { objects } = await space.db.query().run();

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

  static checkIfSpacesMatchExpectedData = async (client: Client, expected: SpacesDump) => {
    const received = await SpacesDumper.dumpSpaces(client);

    for (const [spaceId, space] of Object.entries(expected)) {
      for (const [objectId, object] of Object.entries(space)) {
        if (!equals(object, received[spaceId][objectId])) {
          log.warn('data mismatch', { spaceId, objectId, expected: object, received: received[spaceId][objectId] });
          return false;
        }
      }
    }

    return true;
  };

  static save(dump: SpacesDump, filePath: string) {
    fs.writeFileSync(path.join(filePath), JSON.stringify(dump, null, 2));
  }

  static load(filePath: string): SpacesDump {
    return JSON.parse(fs.readFileSync(path.join(filePath), 'utf-8'));
  }
}

export const equals = (actual: Record<string, any>, expected: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(expected)) {
    if (key === '@timestamp') {
      continue;
    }
    if (!isEqual(value, actual[key])) {
      return false;
    }
  }

  return true;
};
