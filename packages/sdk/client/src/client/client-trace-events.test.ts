//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { buf } from '@dxos/protocols/buf';
import { Invitation_AuthMethod } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type EventAttributes, TRACE_PROCESSOR } from '@dxos/tracing';

import { TestBuilder, performInvitation } from '../testing/index.ts';
import { Client } from './client.ts';

type Recorded = { name: string; attributes: EventAttributes };

const recordClientEvents = () => {
  const recorded: Recorded[] = [];
  const processor = {
    emit: (name: string, attributes: EventAttributes) => {
      if (name.startsWith('client.')) {
        recorded.push({ name, attributes });
      }
    },
  };
  TRACE_PROCESSOR.remoteEvents.registerProcessor(processor);
  onTestFinished(() => TRACE_PROCESSOR.remoteEvents.unregisterProcessor(processor));
  return recorded;
};

describe('client trace events', () => {
  test('reports a space being created, shared, and joined from both sides', { timeout: 60_000 }, async () => {
    const testBuilder = new TestBuilder();
    const openPeer = async (displayName: string) => {
      const client = new Client({ services: testBuilder.createLocalClientServices() });
      onTestFinished(() => client.destroy());
      await client.initialize();
      await client.halo.createIdentity(buf.create(ProfileDocumentSchema, { displayName }));
      return client;
    };
    const host = await openPeer('host');
    const guest = await openPeer('guest');
    const events = recordClientEvents();

    const space = await host.spaces.create();
    await space.waitUntilReady();
    const settings = await host.spaces.create({}, { origin: 'system' });
    await Promise.all(
      performInvitation({ host: space, guest: guest.spaces, options: { authMethod: Invitation_AuthMethod.NONE } }),
    );

    const shared = { kind: 'space', spaceId: space.id, authMethod: 'none', multiUse: false };
    await expect
      .poll(() => events.map(({ name }) => name).sort())
      .toEqual([
        'client.invitation.accept',
        'client.invitation.admit',
        'client.invitation.create',
        'client.space.create',
        'client.space.create',
      ]);
    expect(events).toEqual(
      expect.arrayContaining([
        { name: 'client.space.create', attributes: { spaceId: space.id, origin: 'unknown' } },
        { name: 'client.space.create', attributes: { spaceId: settings.id, origin: 'system' } },
        { name: 'client.invitation.create', attributes: shared },
        { name: 'client.invitation.admit', attributes: shared },
        { name: 'client.invitation.accept', attributes: shared },
      ]),
    );
  });
});
