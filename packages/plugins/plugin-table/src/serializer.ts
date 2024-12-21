//
// Copyright 2024 DXOS.org
//

import { createStoredSchema } from '@dxos/echo-schema';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { create, getObjectCore } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table/types';
import { ViewType } from '@dxos/schema';

export const serializer: TypedObjectSerializer<TableType> = {
  serialize: async ({ object, space }): Promise<string> => {
    const view = object.view && {
      name: object.view.name,
      fields: object.view.fields,
    };
    const typename = object.view?.query.typename;
    // TODO(wittjosiah): Remove. Shouldn't have access to space.
    const dbSchema = typename ? space.db.schemaRegistry.getSchema(typename) : undefined;
    const schema = dbSchema && {
      typename: dbSchema.typename,
      version: dbSchema.version,
      jsonSchema: dbSchema.jsonSchema,
    };
    const table = { id: object.id, name: object.name, view, schema };
    return JSON.stringify(table, null, 2);
  },

  deserialize: async ({ content, space, newId }) => {
    const parsed = JSON.parse(content);
    const schema = createStoredSchema({
      typename: parsed.schema.typename,
      version: parsed.schema.version,
      jsonSchema: parsed.schema.jsonSchema,
    });
    // TODO(wittjosiah): Remove. Shouldn't have access to space.
    space.db.add(schema);
    const view = create(ViewType, { ...parsed.view, query: { typename: parsed.schema.typename } });
    const table = create(TableType, { name: parsed.name, view });

    if (!newId) {
      const core = getObjectCore(table);
      core.id = parsed.id;
    }

    return table;
  },
};
