//
// Copyright 2024 DXOS.org
//

import { IdentityDid } from '@dxos/keys';
import { live, makeRef } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';
import { DataType } from '@dxos/schema';

import { ThreadType } from '../types';

export const createCommentThread = (identity: Identity) => {
  return live(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        makeRef(
          live(DataType.Message, {
            sender: {
              identityDid: faker.datatype.boolean() ? identity.did : IdentityDid.random(),
            },
            created: new Date().toISOString(),
            blocks: [{ type: 'text', text: faker.lorem.sentences(3) }],
          }),
        ),
      { count: { min: 2, max: 3 } },
    ),
  });
};
