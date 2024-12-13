//
// Copyright 2024 DXOS.org
//

import { faker } from '@dxos/random';
import { type Space, create } from '@dxos/react-client/echo';
import { initializeKanban } from '@dxos/react-ui-kanban/testing';

export const stateColumns = { init: { label: 'To do' }, doing: { label: 'Doing' }, done: { label: 'Done' } };
const states = Object.keys(stateColumns);

export const createKanban = (space: Space) => {
  const { kanban, taskSchema } = initializeKanban({ space });
  Array.from({ length: 24 }).map(() => {
    return space.db.add(
      create(taskSchema, {
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        state: states[faker.number.int(states.length)],
      }),
    );
  });
  return kanban;
};
