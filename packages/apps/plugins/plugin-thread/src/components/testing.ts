//
// Copyright 2024 DXOS.org
//

import { MessageType, ThreadType, TextV0Type, type BlockType } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';

export const createChatThread = (identity: Identity) => {
  return E.object(ThreadType, {
    messages: Array.from({ length: 8 }).map(() =>
      E.object(MessageType, {
        from: {
          identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
        },
        blocks: faker.helpers.multiple(
          () =>
            faker.datatype.boolean({ probability: 0.8 })
              ? ({
                  timestamp: new Date().toISOString(),
                  content: E.object(TextV0Type, { content: faker.lorem.sentences(3) }),
                } satisfies BlockType)
              : ({
                  timestamp: new Date().toISOString(),
                  object: E.object(E.ExpandoType, { title: faker.lorem.sentence() }),
                } satisfies BlockType),
          { count: { min: 1, max: 3 } },
        ),
      }),
    ),
  });
};

export const createCommentThread = (identity: Identity) => {
  return E.object(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        E.object(MessageType, {
          from: {
            identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
          },
          blocks: faker.helpers.multiple(
            () => ({
              timestamp: new Date().toISOString(),
              content: E.object(TextV0Type, { content: faker.lorem.sentences(3) }),
            }),
            { count: { min: 1, max: 2 } },
          ),
        }),
      { count: { min: 2, max: 3 } },
    ),
  });
};
