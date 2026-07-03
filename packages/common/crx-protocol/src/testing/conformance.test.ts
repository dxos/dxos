//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message, request, serve } from '../index';
import { createMockPeer } from './index';

describe('MockComposer', () => {
  test('extension -> Composer list request is answered', async ({ expect }) => {
    const { extension, composer } = createMockPeer();
    composer.handle((message) =>
      message._tag === 'page-actions.list'
        ? Message.make('page-actions.list-ack', { id: message.id, ok: true, actions: [] })
        : undefined,
    );

    const reply = await request(extension, Message.make('page-actions.list', { id: 'r1' }));
    expect(reply).toMatchObject({ _tag: 'page-actions.list-ack', id: 'r1', ok: true });
  });

  test('Composer -> extension ready is observed', async ({ expect }) => {
    const { extension, composer } = createMockPeer();
    const received: string[] = [];
    serve(extension, (message) => {
      received.push(message._tag);
      return undefined;
    });
    composer.channel.send(Message.make('page-actions.ready', { id: 'ready-1' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).toContain('page-actions.ready');
  });
});
