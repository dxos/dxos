//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { ClientTraceEvents } from '@dxos/client-protocol';
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
      if ((Object.values(ClientTraceEvents) as string[]).includes(name)) {
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
        ClientTraceEvents.invitationAccept,
        ClientTraceEvents.invitationAdmit,
        ClientTraceEvents.invitationCreate,
        ClientTraceEvents.spaceCreate,
        ClientTraceEvents.spaceCreate,
      ]);
    expect(events).toEqual(
      expect.arrayContaining([
        { name: ClientTraceEvents.spaceCreate, attributes: { spaceId: space.id, origin: 'unknown' } },
        { name: ClientTraceEvents.spaceCreate, attributes: { spaceId: settings.id, origin: 'system' } },
        { name: ClientTraceEvents.invitationCreate, attributes: shared },
        { name: ClientTraceEvents.invitationAdmit, attributes: shared },
        { name: ClientTraceEvents.invitationAccept, attributes: shared },
      ]),
    );
  });
});
