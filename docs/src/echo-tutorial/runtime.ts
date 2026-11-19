//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';

import { openSpace } from './app/App.tsx';
import { seed } from './seed.ts';

export type Peer = {
  readonly name: string;
  readonly hue: string;
  readonly client: Client;
  readonly space: Space;
};

const NAMES = [
  { name: 'Alice', hue: 'cyan' },
  { name: 'Bob', hue: 'amber' },
] as const;

/**
 * Starts the docs' devices, each an in-memory client on one in-memory network
 * that opens a space of its own. Only the first device's space is seeded, so
 * the second shows what joining brings in.
 */
export const startPeers = async (count: 1 | 2): Promise<Peer[]> => {
  const builder = new TestBuilder();
  const peers = await Promise.all(
    NAMES.slice(0, count).map(async ({ name, hue }) => {
      const { client, space } = await openSpace(
        builder.createLocalClientServices(),
      );
      return { name, hue, client, space };
    }),
  );
  seed(peers[0].space.db);
  return peers;
};
