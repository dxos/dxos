//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { RemoteEvents } from '@dxos/tracing';

import { EVENTS, listen } from './space-events.ts';

type Captured = { name: string; properties?: Record<string, unknown> };

const setup = () => {
  const events = new RemoteEvents();
  const captured: Captured[] = [];
  const stop = listen(events, (name, properties) => captured.push({ name, properties }));
  return { events, captured, stop };
};

describe('space events', () => {
  test('reports every space created, with its origin', ({ expect }) => {
    const { events, captured } = setup();

    events.emit('client.space.create', { spaceId: 'space-1', origin: 'user' });
    events.emit('client.space.create', { spaceId: 'settings', origin: 'system' });

    expect(captured).toEqual([
      { name: EVENTS.spaceCreate, properties: { spaceId: 'space-1', origin: 'user' } },
      { name: EVENTS.spaceCreate, properties: { spaceId: 'settings', origin: 'system' } },
    ]);
  });

  test('reports space and device invitations under their own names', ({ expect }) => {
    const { events, captured } = setup();
    const space = { kind: 'space', spaceId: 'space-1', authMethod: 'shared_secret', multiUse: false };
    const device = { kind: 'device', authMethod: 'shared_secret', multiUse: false };

    events.emit('client.invitation.create', space);
    events.emit('client.invitation.admit', space);
    events.emit('client.invitation.accept', space);
    events.emit('client.invitation.create', device);
    events.emit('client.invitation.admit', device);
    events.emit('client.invitation.accept', device);

    expect(captured.map(({ name }) => name)).toEqual([
      EVENTS.spaceShare,
      EVENTS.spaceAdmit,
      EVENTS.spaceJoin,
      EVENTS.deviceInvite,
      EVENTS.deviceAdmit,
      EVENTS.deviceJoin,
    ]);
    expect(captured[0].properties).toEqual({ spaceId: 'space-1', authMethod: 'shared_secret', multiUse: false });
  });

  test('ignores other events and stops when cleaned up', ({ expect }) => {
    const { events, captured, stop } = setup();

    events.emit('echo.object.add', { spaceId: 'space-1' });
    stop();
    events.emit('client.space.create', { spaceId: 'space-1', origin: 'user' });

    expect(captured).toEqual([]);
  });
});
