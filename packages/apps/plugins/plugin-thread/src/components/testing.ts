//
// Copyright 2024 DXOS.org
//

import { TextV0Schema } from '@braneframe/plugin-markdown';
import * as E from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';

import { MessageSchema, ThreadSchema } from '../types';

export const createChatThread = (identity: Identity) => {
  return E.object(ThreadSchema, {
    messages: Array.from({ length: 8 }).map(() =>
      E.object(MessageSchema, {
        from: {
          identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
        },
        blocks: faker.helpers.multiple(
          () =>
            faker.datatype.boolean({ probability: 0.8 })
              ? {
                  content: E.object(TextV0Schema, { content: faker.lorem.sentences(3) }),
                }
              : {
                  object: E.object({ title: faker.lorem.sentence() }),
                },
          { count: { min: 1, max: 3 } },
        ),
      }),
    ),
  });
};

export const createCommentThread = (identity: Identity) => {
  return E.object(ThreadSchema, {
    messages: faker.helpers.multiple(
      () =>
        E.object(MessageSchema, {
          from: {
            identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
          },
          blocks: faker.helpers.multiple(
            () => ({
              timestamp: new Date().toISOString(),
              content: E.object(TextV0Schema, { content: faker.lorem.sentences(3) }),
            }),
            { count: { min: 1, max: 2 } },
          ),
        }),
      { count: { min: 2, max: 3 } },
    ),
  });
};
