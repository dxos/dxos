//
// Copyright 2024 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { create, makeRef } from '@dxos/live-object';
import { ThreadType } from '@dxos/plugin-space/types';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';
import { MessageType } from '@dxos/schema';

export const createCommentThread = (identity: Identity) => {
  return create(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        makeRef(
          create(MessageType, {
            sender: {
              identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
            },
            created: new Date().toISOString(),
            blocks: [{ type: 'text', text: faker.lorem.sentences(3) }],
          }),
        ),
      { count: { min: 2, max: 3 } },
    ),
  });
};
