//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';

import { Kanban as KanbanType } from '@braneframe/types';
import { Text } from '@dxos/echo-schema';

// TODO(burdon): Types.
export const createKanban = () => {
  return new KanbanType({
    title: faker.lorem.words(3),
    columns: faker.datatype.array(faker.datatype.number({ min: 2, max: 8 })).map(
      () =>
        new KanbanType.Column({
          title: faker.lorem.words(3),
          items: faker.datatype.array(faker.datatype.number(8)).map(
            () =>
              new KanbanType.Item({
                title: new Text(faker.lorem.words(faker.datatype.number({ min: 3, max: 24 })) + '.'),
              }),
          ),
        }),
    ),
  });
};
