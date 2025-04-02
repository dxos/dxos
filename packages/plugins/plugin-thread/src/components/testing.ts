//
// Copyright 2024 DXOS.org
//

import { Expando } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { create, makeRef } from '@dxos/live-object';
import { ThreadType } from '@dxos/plugin-space/types';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';
import { MessageType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

export const createChatThread = (identity: Identity) => {
  return create(ThreadType, {
    messages: Array.from({ length: 8 }).map(() =>
      makeRef(
        create(MessageType, {
          sender: {
            identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
          },
          created: faker.date.recent().toISOString(),
          blocks: [{ type: 'text', text: faker.lorem.sentences(3) }],
          attachments: faker.helpers
            .multiple(
              () =>
                faker.datatype.boolean({ probability: 0.8 })
                  ? undefined
                  : (makeRef(create(Expando, { name: faker.lorem.sentence() })) as any), // TODO(dmaretskyi): Fix types in schema.
              { count: { min: 1, max: 3 } },
            )
            .filter(isNonNullable),
        }),
      ),
    ),
  });
};

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
