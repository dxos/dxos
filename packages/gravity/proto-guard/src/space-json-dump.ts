//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';
import fs from 'node:fs';
import path from 'node:path';

import { type Client } from '@dxos/client';
import { Serializer } from '@dxos/echo-db';

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

  static checkIfSpacesMatchExpectedData = async (client: Client, dump: SpacesDump) => {
    const serializer = new Serializer();
    for (const space of client.spaces.get()) {
      const { objects } = await space.db.query().run();
      for (const object of objects) {
        if (!equals(serializer.exportObject(object), dump[space.id][object.id])) {
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

export const equals = (container: Record<string, any>, contained: Record<string, any>): boolean => {
  for (const [key, value] of Object.entries(contained)) {
    if (key === '@timestamp') {
      continue;
    }
    if (!isEqual(value, container[key])) {
      return false;
    }
  }

  return true;
};
