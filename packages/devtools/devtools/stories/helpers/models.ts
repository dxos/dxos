//
// Copyright 2021 DXOS.org
//

import { Party } from '@dxos/client';
import { MessengerModel } from '@dxos/messenger-model';
import { ObjectModel } from '@dxos/object-model';
import { TextModel } from '@dxos/text-model';

export type ModelType = 'ObjectModel' | 'MessengerModel' | 'TextModel'

export const modelTypes: { [index: string]: any } = {
  'ObjectModel': {
    model: ObjectModel,
    createItem: (party: Party) => party.database.createItem({
      model: ObjectModel,
      type: 'example:type/object'
    })
  },
  'MessengerModel': {
    model: MessengerModel,
    createItem: (party: Party) => party.database.createItem({
      model: MessengerModel,
      type: 'example:type/messenger'
    })
  },
  'TextModel': {
    model: TextModel,
    createItem: (party: Party) => party.database.createItem({
      model: TextModel,
      type: 'example:type/text'
    })
  }
};
