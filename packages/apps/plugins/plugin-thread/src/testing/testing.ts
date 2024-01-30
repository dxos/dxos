//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { sub } from 'date-fns/sub';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';

faker.seed(1);

export const createThread = () => {
  const now = new Date();

  return new ThreadType({
    messages: [
      new MessageType({
        from: {
          identityKey: PublicKey.random().toHex(),
        },
        blocks: [
          {
            timestamp: sub(now, { days: 1, minutes: 115 }).toISOString(),
            text: 'Hello!',
          },
          {
            text: 'I want to research open source projects for secure multi-peer p2p networking.',
          },
          {
            text: 'List 5 project that might be useful.',
          },
        ],
      }),
      new MessageType({
        from: {
          identityKey: PublicKey.random().toHex(),
        },
        blocks: [
          {
            timestamp: sub(now, { minutes: 42 }).toISOString(),
            text: "OK I'll work on that",
          },
        ],
      }),
      new MessageType({
        from: {
          identityKey: PublicKey.random().toHex(),
        },
        blocks: [
          {
            timestamp: sub(now, { minutes: 8 }).toISOString(),
            text: 'Here are some open source projects.',
          },
          {
            timestamp: sub(now, { minutes: 8 }).toISOString(),
            data: JSON.stringify({
              projects: [
                {
                  name: 'Project 1',
                },
                {
                  name: 'Project 2',
                },
                {
                  name: 'Project 3',
                },
              ],
            }),
          },
        ],
      }),
    ],
  });
};
