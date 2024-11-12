//
// Copyright 2024 DXOS.org
//

import { StoredSchema } from '@dxos/echo-schema';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { create, getObjectCore } from '@dxos/react-client/echo';

import { TableType } from './types';

export const serializer: TypedObjectSerializer<TableType> = {
  serialize: async ({ object }): Promise<string> => {
    const table = { id: object.id, name: object.name, view: object.view };
    return JSON.stringify(table, null, 2);
  },

  deserialize: async ({ content, space, newId }) => {
    const {
      schema: { id: schemaId, ...parsedSchema },
      ...parsed
    } = JSON.parse(content);
    // TODO(wittjosiah): Should the rows also be copied?
    // TODO(wittjosiah): This is a hack to get the schema to be deserialized correctly.
    const storedSchema = space.db.add(create(StoredSchema, parsedSchema));
    const table = create(TableType, { name: parsed.name, view: parsed.view });

    if (!newId) {
      const core = getObjectCore(table);
      core.id = parsed.id;
      const schemaCore = getObjectCore(storedSchema);
      schemaCore.id = schemaId;
    }

    return table;
  },
};
