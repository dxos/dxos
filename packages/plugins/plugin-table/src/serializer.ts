//
// Copyright 2024 DXOS.org
//

import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { create, getObjectCore } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table/types';
import { ViewType } from '@dxos/schema';

export const serializer: TypedObjectSerializer<TableType> = {
  serialize: async ({ object }): Promise<string> => {
    const view = object.view && {
      name: object.view.name,
      query: object.view.query,
      fields: object.view.fields,
    };
    const table = { id: object.id, name: object.name, view };
    return JSON.stringify(table, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const parsed = JSON.parse(content);
    const view = create(ViewType, parsed.view)
    const table = create(TableType, { name: parsed.name, view });

    console.log({parsed, view, table})

    if (!newId) {
      const core = getObjectCore(table);
      core.id = parsed.id;
    }

    return table;
  },
};
