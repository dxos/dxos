//
// Copyright 2021 DXOS.org
//

import { Space } from '@dxos/client';
import { MessengerModel } from '@dxos/messenger-model';
import { ObjectModel } from '@dxos/object-model';
import { TextModel } from '@dxos/text-model';

export type ModelType = 'ObjectModel' | 'MessengerModel' | 'TextModel';

export const modelTypes: { [index: string]: any } = {
  ObjectModel: {
    model: ObjectModel,
    createItem: (space: Space) =>
      space.database.createItem({
        model: ObjectModel,
        type: 'example:type/object'
      })
  },
  MessengerModel: {
    model: MessengerModel,
    createItem: (space: Space) =>
      space.database.createItem({
        model: MessengerModel,
        type: 'example:type/messenger'
      })
  },
  TextModel: {
    model: TextModel,
    createItem: (space: Space) =>
      space.database.createItem({
        model: TextModel,
        type: 'example:type/text'
      })
  }
};
