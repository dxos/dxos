//
// Copyright 2023 DXOS.org
//

import { Kanban as KanbanType } from '@braneframe/types';
import { faker } from '@dxos/random';
import { TextObject } from '@dxos/react-client/echo';

// TODO(burdon): Types.
export const createKanban = () => {
  return new KanbanType({
    title: faker.lorem.words(3),
    columns: faker.helpers.multiple(
      () =>
        new KanbanType.Column({
          title: faker.lorem.words(3),
          items: faker.helpers.multiple(
            () =>
              new KanbanType.Item({
                title: new TextObject(faker.lorem.words(faker.number.int({ min: 3, max: 24 })) + '.'),
              }),
            { count: faker.number.int(8) },
          ),
        }),
      { min: 2, max: 8 },
    ),
  });
};
