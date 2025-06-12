//
// Copyright 2024 DXOS.org
//

import { type TypedObjectSerializer } from '@dxos/plugin-space/types';
import { live, getObjectCore } from '@dxos/react-client/echo';

import { SheetType } from './types';

export const serializer: TypedObjectSerializer<SheetType> = {
  serialize: async ({ object }): Promise<string> => {
    return JSON.stringify(object, null, 2);
  },

  deserialize: async ({ content, newId }) => {
    const { id, ...parsed } = JSON.parse(content);
    const sheet = live(SheetType, parsed);

    if (!newId) {
      const core = getObjectCore(sheet);
      core.id = id;
    }

    return sheet;
  },
};
