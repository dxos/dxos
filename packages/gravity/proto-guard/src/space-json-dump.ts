//
// Copyright 2024 DXOS.org
//

import isEqual from 'lodash.isequal';

import { type Client } from '@dxos/client';
import { Serializer } from '@dxos/echo-db';

export type SpacesDump = {
  /**
   * SpaceIds mapped to JSON dump of all objects in the space.
   */
  [key: string]: {
    /**
     * ObjectIds mapped to JSON dump of the object.
     */
    [key: string]: any;
  };
};

export const dumpSpaces = async (client: Client): Promise<SpacesDump> => {
  const dump: SpacesDump = {};
  const serializer = new Serializer();

  for (const space of client.spaces.get()) {
    const { objects } = await space.db.query().run();

    dump[space.id] = {};
    for (const object of objects) {
      dump[space.id][object.id] = serializer.exportObject(object);
    }
  }

  return dump;
};

export const checkIfSpacesMatchDump = async (client: Client, dump: SpacesDump) => {
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
