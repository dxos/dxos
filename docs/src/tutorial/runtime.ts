//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { openSpace } from './client.ts';
import { types } from './schema.ts';
import { seed } from './seed.ts';

export type Peer = {
  readonly name: string;
  readonly hue: string;
  readonly client: Client;
  /** The app's space; a second peer has none until it accepts an invitation. */
  readonly space?: Space;
};

const NAMES = [
  { name: 'Alice', hue: 'cyan' },
  { name: 'Bob', hue: 'amber' },
] as const;

/**
 * Starts the app's peers in the page, each an in-memory client on one
 * in-memory network: the first opens the space and seeds it, and the second,
 * when asked for, starts with an identity and no space.
 */
export const startPeers = async (count: 1 | 2): Promise<Peer[]> => {
  const builder = new TestBuilder();
  const host = await openSpace(builder.createLocalClientServices());
  seed(host.space.db);
  const peers: Peer[] = [{ ...NAMES[0], ...host }];

  if (count === 2) {
    const client = new Client({
      types,
      services: builder.createLocalClientServices(),
    });
    await client.initialize();
    await client.halo.createIdentity(
      create(ProfileDocumentSchema, { displayName: NAMES[1].name }),
    );
    peers.push({ ...NAMES[1], client });
  }

  return peers;
};
