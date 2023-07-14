//
// Copyright 2023 DXOS.org
//

import { Thread as ThreadType } from '@braneframe/types';
import { PublicKey } from '@dxos/keys';

export const createThread = () => {
  return new ThreadType({
    blocks: [
      new ThreadType.Block({
        messages: [
          {
            identityKey: PublicKey.random().toHex(),
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
            text: "OK I'll work on that",
          },
        ],
      }),
      new ThreadType.Block({
        messages: [
          {
            identityKey: PublicKey.random().toHex(),
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
