//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

export type Item = {
  id: string;
  type: string;
  title: string;
  description: string;
};

export const useTestItems = (n: number): Item[] => {
  return Array.from({ length: n }).map(() => ({
    id: faker.datatype.uuid(),
    type: faker.lorem.word(),
    title: faker.lorem.sentence(4),
    description: faker.lorem.sentences(
      faker.datatype.number({ min: 4, max: 16 })
    )
  }));
};
