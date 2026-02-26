//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { buildDraftMessageProps } from './util';

describe('buildDraftMessageProps', () => {
  test('compose mode returns empty to and provided subject/body', ({ expect }) => {
    const props = buildDraftMessageProps({ mode: 'compose', subject: 'Hi', body: 'Hello' });
    expect(props.properties).toBeDefined();
    expect(props.properties?.to).toBe('');
    expect(props.properties?.subject).toBe('Hi');
    expect(props.blocks[0]).toMatchObject({ _tag: 'text', text: 'Hello' });
  });

  test('reply mode sets to sender, Re: subject, quoted body, and threading headers', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Original body' }],
      properties: {
        subject: 'Topic',
        threadId: 'thread-123',
        messageId: '<msg@example.com>',
        references: '<parent@example.com>',
      },
    });
    const props = buildDraftMessageProps({ mode: 'reply', replyToMessage: replyTo });
    expect(props.properties?.to).toBe('alice@example.com');
    expect(props.properties?.subject).toBe('Re: Topic');
    expect(props.properties?.threadId).toBe('thread-123');
    expect(props.properties?.inReplyTo).toBe('<msg@example.com>');
    expect(props.properties?.references).toContain('<msg@example.com>');
    const replyBody = props.blocks[0] && props.blocks[0]._tag === 'text' ? props.blocks[0].text : '';
    expect(replyBody).toContain('Original body');
    expect(replyBody).toContain('Alice');
  });

  test('reply-all sets cc from original to/cc excluding sender', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Body' }],
      properties: { subject: 'Topic', to: 'bob@example.com', cc: 'alice@example.com, carol@example.com' },
    });
    const props = buildDraftMessageProps({ mode: 'reply-all', replyToMessage: replyTo });
    expect(props.properties?.to).toBe('alice@example.com');
    expect(props.properties?.cc).toContain('bob@example.com');
    expect(props.properties?.cc).toContain('carol@example.com');
    // Sender must not appear in cc.
    const ccAddresses = (props.properties?.cc ?? '').split(',').map((s: string) => s.trim());
    expect(ccAddresses).not.toContain('alice@example.com');
  });

  test('forward mode sets Fwd: subject and quoted body', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Original' }],
      properties: { subject: 'Topic' },
    });
    const props = buildDraftMessageProps({ mode: 'forward', replyToMessage: replyTo });
    expect(props.properties?.to).toBe('');
    expect(props.properties?.subject).toBe('Fwd: Topic');
    const forwardBody = props.blocks[0] && props.blocks[0]._tag === 'text' ? props.blocks[0].text : '';
    expect(forwardBody).toContain('Original');
  });
});
