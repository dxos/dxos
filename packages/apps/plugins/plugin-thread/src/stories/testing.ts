//
// Copyright 2023 DXOS.org
//

import sub from 'date-fns/sub';

import { Thread as ThreadType } from '@braneframe/types';
import { PublicKey } from '@dxos/keys';

export const createThread = () => {
  const now = new Date();

  return new ThreadType({
    blocks: [
      new ThreadType.Block({
        messages: [
          {
            identityKey: PublicKey.random().toHex(),
            timestamp: sub(now, { minutes: 92 }).toISOString(),
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
        messages: [
          {
            identityKey: PublicKey.random().toHex(),
            timestamp: sub(now, { minutes: 40 }).toISOString(),
            text: "OK I'll work on that",
          },
        ],
      }),
      new ThreadType.Block({
        messages: [
          {
            identityKey: PublicKey.random().toHex(),
            timestamp: sub(now, { minutes: 10 }).toISOString(),
            text: "OK I'll work on that",
          },
          {
            text: 'Here are some open source projects.',
          },
        ],
      }),
    ],
  });
};
