//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message, createLoopback, request, serve } from './index';

describe('request/serve', () => {
  test('correlates a reply to its request by id', async ({ expect }) => {
    const [client, server] = createLoopback();
    serve(server, (message) => {
      if (message._tag === 'page-actions.list') {
        return Message.make('page-actions.list-ack', { id: message.id, ok: true, actions: [] });
      }
    });

    const reply = await request(client, Message.make('page-actions.list', { id: 'req-1' }));
    expect(reply._tag).toBe('page-actions.list-ack');
    expect(reply.id).toBe('req-1');
  });

  test('rejects on timeout when no reply arrives', async ({ expect }) => {
    const [client] = createLoopback();
    await expect(
      request(client, Message.make('page-actions.list', { id: 'req-x' }), { timeoutMs: 20 }),
    ).rejects.toThrow();
  });
});
