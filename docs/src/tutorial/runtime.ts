//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { listed } from '../demos/runtime.ts';
import { openContacts } from './client.ts';
import { seed } from './records.ts';
import { types } from './schema.ts';

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
 * Starts the app's peers in the page, each an in-memory client: the first opens the space and seeds it, and the
 * second, when asked for, joins it by invitation.
 */
export const startPeers = async (count: 1 | 2): Promise<Peer[]> => {
  const builder = new TestBuilder();
  const host = await openContacts(builder.createLocalClientServices());
  seed(host.space.db);
  const peers: Peer[] = [{ ...NAMES[0], ...host }];

  if (count === 2) {
    const client = new Client({ types, services: builder.createLocalClientServices() });
    await client.initialize();
    await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: NAMES[1].name }));
    await Promise.all(performInvitation({ host: host.space, guest: client.spaces }));
    const space = await listed(client, host.space.id);
    await space.waitUntilReady();
    peers.push({ ...NAMES[1], client, space });
  }

  return peers;
};
