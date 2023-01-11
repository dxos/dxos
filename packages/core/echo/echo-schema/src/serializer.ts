//
// Copyright 2023 DXOS.org
//

import { EchoDatabase } from './database';
import { base, id, schema } from './defs';

export type SerializedObject = {};

export type SerializedSpace = {
  objects: SerializedObject[];
};

// TODO(burdon): Option to decode JSON/protobuf.
// TODO(burdon): Schema not present when reload from persistent store.
// TODO(burdon): Sort JSON.
export class Serializer {
  async export(database: EchoDatabase): Promise<SerializedSpace> {
    const result = database.query();
    const objects = result.getObjects();
    const data = {
      objects: objects
        .map((object) => {
          // TODO(burdon): Skip Space object.
          if (!object[schema]) {
            return undefined;
          }

          // TODO(burdon): Confusion re when to use base (see Document).
          return {
            '@id': object[id],
            '@type': object[schema].name,
            ...object[base].toJSON()
          };
        })
        .filter(Boolean)
    };

    return data;
  }

  async import(database: EchoDatabase, data: SerializedSpace) {}
}
