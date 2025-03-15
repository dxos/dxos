//
// Copyright 2024 DXOS.org
//

import { Expando } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { create, makeRef } from '@dxos/live-object';
import { MessageType, ThreadType } from '@dxos/plugin-space/types';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';

export const createChatThread = (identity: Identity) => {
  return create(ThreadType, {
    messages: Array.from({ length: 8 }).map(() =>
      makeRef(
        create(MessageType, {
          sender: {
            identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
          },
          timestamp: faker.date.recent().toISOString(),
          text: faker.lorem.sentences(3),
          parts: faker.helpers.multiple(
            () =>
              faker.datatype.boolean({ probability: 0.8 })
                ? undefined
                : (makeRef(create(Expando, { name: faker.lorem.sentence() })) as any), // TODO(dmaretskyi): Fix types in schema.
            { count: { min: 1, max: 3 } },
          ),
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
            timestamp: new Date().toISOString(),
            text: faker.lorem.sentences(3),
          }),
        ),
      { count: { min: 2, max: 3 } },
    ),
  });
};
