//
// Copyright 2024 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { getObjectCore } from '@dxos/react-client/echo';

import { Sheet } from './types';

export const serializer: TypedObjectSerializer<Sheet.Sheet> = {
  serialize: async ({ object }): Promise<string> => {
    return JSON.stringify(object, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const { id, ...parsed } = JSON.parse(content);
    const sheet = Obj.make(Sheet.Sheet, parsed);

    if (!newId) {
      const core = getObjectCore(sheet);
      core.id = id;
    }

    return sheet;
  },
};
