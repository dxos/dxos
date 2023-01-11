//
// Copyright 2023 DXOS.org
//

import { EchoDatabase } from './database';
import { base, id, schema } from './defs';
import { strip } from './util';

export type SerializedObject = {};

export type SerializedSpace = {
  objects: SerializedObject[];
};

// TODO(burdon): Schema not present when reloaded from persistent store.
// TODO(burdon): Option to decode JSON/protobuf.
// TODO(burdon): Sort JSON keys (npm canonical serialize util).
export class Serializer {
  async export(database: EchoDatabase): Promise<SerializedSpace> {
    const result = database.query();
    const objects = result.getObjects();
    const data = {
      objects: objects.map((object) => {
        return strip({
          '@id': object[id],
          '@type': object[schema] ? object[schema].name : undefined,
          ...object[base].toJSON() // TODO(burdon): Not working unless schema.
        });
      })
    };

    return data;
  }

  // TODO(burdon): Implement.
  async import(database: EchoDatabase, data: SerializedSpace) {
    console.log(data);
  }
}
