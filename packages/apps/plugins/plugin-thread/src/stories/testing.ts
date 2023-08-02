//
// Copyright 2023 DXOS.org
//

import sub from 'date-fns/sub';

import { Thread as ThreadType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';

export const createThread = () => {
  const now = new Date();

  return new ThreadType({
    blocks: [
      new ThreadType.Block({
        identityKey: PublicKey.random().toHex(),
        messages: [
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
      new ThreadType.Block({
        identityKey: PublicKey.random().toHex(),
        messages: [
          {
            timestamp: sub(now, { minutes: 42 }).toISOString(),
            text: "OK I'll work on that",
          },
        ],
      }),
      new ThreadType.Block({
        identityKey: PublicKey.random().toHex(),
        messages: [
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
