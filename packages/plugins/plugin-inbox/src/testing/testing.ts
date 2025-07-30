//
// Copyright 2023 DXOS.org
//

import { Obj } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { faker } from '@dxos/random';
import { DataType } from '@dxos/schema';

faker.seed(1);

export const createMessages = (count = 10) => {
  // const now = new Date();

  // TODO(burdon): Timestamp.
  return faker.helpers.multiple(
    () =>
      Obj.make(DataType.Message, {
        created: faker.date.recent().toISOString(),
        sender: {
          identityDid: IdentityDid.random(),
          name: faker.person.fullName(),
        },
        blocks: [{ _tag: 'text', text: faker.lorem.paragraph() }],
        properties: {
          subject: faker.commerce.productName(),
        },
      }),
    { count },
  );
};
