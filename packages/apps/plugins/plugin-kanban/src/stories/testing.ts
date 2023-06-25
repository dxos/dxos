//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

import { ObservableArray, ObservableObject } from '@dxos/observable-object';

import { KanbanColumnModel, KanbanItem, KanbanModel } from '../props';

// TODO(burdon): Types.
export const createKanban = (): ObservableObject<KanbanModel> => {
  return new ObservableObject<KanbanModel>({
    id: 'test',
    title: faker.lorem.words(3),
    columns: new ObservableArray<KanbanColumnModel>(
      ...faker.datatype.array(faker.datatype.number({ min: 2, max: 8 })).map(() => ({
        id: 'column-' + faker.datatype.uuid(),
        title: faker.lorem.words(3),
        items: new ObservableArray<KanbanItem>(
          ...faker.datatype.array(faker.datatype.number(8)).map(() => ({
            id: 'item-' + faker.datatype.uuid(),
            content: faker.lorem.words(faker.datatype.number({ min: 3, max: 8 })) + '.',
          })),
        ),
      })),
    ),
  });
};
