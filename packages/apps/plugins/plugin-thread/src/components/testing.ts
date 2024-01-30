//
// Copyright 2024 DXOS.org
//

import { Message as MessageType, Thread as ThreadType } from '@braneframe/types';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';

export const createChatThread = (identity: Identity) => {
  return new ThreadType({
    messages: Array.from({ length: 8 }).map(
      () =>
        new MessageType({
          from: {
            identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
          },
          blocks: faker.helpers.multiple(
            () =>
              faker.datatype.boolean({ probability: 0.8 })
                ? {
                    text: faker.lorem.sentences(3),
                  }
                : {
                    data: JSON.stringify(
                      faker.helpers.multiple(
                        () => ({
                          id: PublicKey.random().truncate(),
                          name: faker.lorem.word(),
                          content: faker.lorem.sentences(3),
                        }),
                        {
                          count: { min: 2, max: 5 },
                        },
                      ),
                    ),
                  },
            { count: { min: 1, max: 3 } },
          ),
        }),
    ),
  });
};

export const createCommentThread = (identity: Identity) => {
  return new ThreadType({
    messages: faker.helpers.multiple(
      () =>
        new MessageType({
          from: {
            identityKey: faker.datatype.boolean() ? identity.identityKey.toHex() : PublicKey.random().toHex(),
          },
          blocks: faker.helpers.multiple(
            () => ({
              timestamp: new Date().toISOString(),
              text: faker.lorem.sentences(3),
            }),
            { count: { min: 1, max: 2 } },
          ),
        }),
      { count: { min: 2, max: 3 } },
    ),
  });
};
