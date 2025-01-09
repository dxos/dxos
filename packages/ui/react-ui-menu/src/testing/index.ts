//
// Copyright 2025 DXOS.org
//

import { type NodeArg } from '@dxos/app-graph';
import { faker } from '@dxos/random';

export type CreateActionsParams = Partial<{
  callback: () => void;
  count: number;
}>;

export const createActions = (params?: CreateActionsParams) => {
  const { callback = () => console.log('invoke'), count = 12 } = params ?? {};
  return faker.helpers.multiple(
    () =>
      ({
        id: faker.string.uuid(),
        type: 'action',
        data: callback,
        properties: {
          label: faker.lorem.words(2),
          icon: 'ph--circle--regular',
        },
      }) satisfies NodeArg<any>,
    { count },
  );
};
