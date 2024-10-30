//
// Copyright 2024 DXOS.org
//

import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { create, getObjectCore } from '@dxos/react-client/echo';

import { SheetType } from './types';

export const serializer: TypedObjectSerializer<SheetType> = {
  serialize: async ({ object }): Promise<string> => {
    const { threads: _threads, ...sheet } = object;
    return JSON.stringify(sheet, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const { id, ...parsed } = JSON.parse(content);
    const sheet = create(SheetType, parsed);

    if (!newId) {
      const core = getObjectCore(sheet);
      core.id = id;
    }

    return sheet;
  },
};
