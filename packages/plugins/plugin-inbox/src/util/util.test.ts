//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { createDraftMessage, getMessageBodyText, getMessageProps, messageMatchesQuery } from './util';

describe('createDraftMessage', () => {
  test('compose mode returns empty to and provided subject/body', ({ expect }) => {
    const props = createDraftMessage({ mode: 'compose', subject: 'Hi', body: 'Hello' });
    expect(props.properties).toBeDefined();
    expect(props.properties?.to).toBe('');
    expect(props.properties?.subject).toBe('Hi');
    expect(props.blocks[0]).toMatchObject({ _tag: 'text', text: 'Hello' });
  });

  test('reply mode sets to sender, Re: subject, threading headers, and an empty body', ({ expect }) => {
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
    const props = createDraftMessage({ mode: 'reply', message: replyTo });
    expect(props.properties?.to).toBe('alice@example.com');
    expect(props.properties?.subject).toBe('Re: Topic');
    expect(props.properties?.threadId).toBe('thread-123');
    expect(props.properties?.inReplyTo).toBe('<msg@example.com>');
    expect(props.properties?.references).toContain('<msg@example.com>');
    // The original body is intentionally not quoted (see `createDraftMessage`).
    const replyBody = props.blocks[0] && props.blocks[0]._tag === 'text' ? props.blocks[0].text : '';
    expect(replyBody).toBe('');
  });

  test('reply mode uses a provided body verbatim (original not quoted)', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Original body' }],
      properties: { subject: 'Topic' },
    });
    const props = createDraftMessage({ mode: 'reply', message: replyTo, body: 'Generated reply.' });
    const replyBody = props.blocks[0] && props.blocks[0]._tag === 'text' ? props.blocks[0].text : '';
    expect(replyBody).toBe('Generated reply.');
  });

  test('reply-all sets cc from original to/cc excluding sender', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Body' }],
      properties: { subject: 'Topic', to: 'bob@example.com', cc: 'alice@example.com, carol@example.com' },
    });
    const props = createDraftMessage({ mode: 'reply-all', message: replyTo });
    expect(props.properties?.to).toBe('alice@example.com');
    expect(props.properties?.cc).toContain('bob@example.com');
    expect(props.properties?.cc).toContain('carol@example.com');
    // Sender must not appear in cc.
    const ccAddresses = (props.properties?.cc ?? '').split(',').map((s: string) => s.trim());
    expect(ccAddresses).not.toContain('alice@example.com');
  });

  test('forward mode sets Fwd: subject and an empty body', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Original' }],
      properties: { subject: 'Topic' },
    });
    const props = createDraftMessage({ mode: 'forward', message: replyTo });
    expect(props.properties?.to).toBe('');
    expect(props.properties?.subject).toBe('Fwd: Topic');
    const forwardBody = props.blocks[0] && props.blocks[0]._tag === 'text' ? props.blocks[0].text : '';
    expect(forwardBody).toBe('');
  });

  test('reply mode copies the source message top-level threadId (the thread-grouping key)', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      threadId: 'gmail-thread-456',
      blocks: [{ _tag: 'text' as const, text: 'Original body' }],
      properties: { subject: 'Topic', threadId: 'gmail-thread-456' },
    });
    const props = createDraftMessage({ mode: 'reply', message: replyTo });
    expect(props.threadId).toBe('gmail-thread-456');
  });

  test('reply mode leaves threadId unset when the source message has none', ({ expect }) => {
    const replyTo = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Original body' }],
      properties: { subject: 'Topic' },
    });
    const props = createDraftMessage({ mode: 'reply', message: replyTo });
    expect(props.threadId).toBeUndefined();
  });

  test('compose mode sets no threadId', ({ expect }) => {
    const props = createDraftMessage({ mode: 'compose', subject: 'Hi', body: 'Hello' });
    expect(props.threadId).toBeUndefined();
  });
});

describe('getMessageProps', () => {
  test('uses the first text block when blocks are present', ({ expect }) => {
    const message = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Bob', email: 'bob@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Hello world' }],
      properties: { subject: 'Hi' },
    });
    const props = getMessageProps(message);
    expect(props.text).toBe('Hello world');
    expect(props.snippet).toBe('Hello world');
  });

  test('tolerates a partially-hydrated message with no blocks (does not throw)', ({ expect }) => {
    // A message surfaced transiently by the full-text search query can arrive before its `blocks`
    // are hydrated; getMessageProps must not throw. The cast simulates that out-of-schema runtime
    // shape (a real ECHO object briefly missing `blocks`), which the type system cannot express.
    const partial = {
      id: 'msg-1',
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Alice', email: 'alice@example.com' },
      properties: { subject: 'Topic' },
    } as unknown as Message.Message;
    const props = getMessageProps(partial);
    expect(props.subject).toBe('Topic');
    expect(props.text).toBe('');
    // `getMessageBodyText` returns '' (not undefined) when there is no plain/markdown text; both are
    // falsy, so the tile's `{snippet && ...}` gating behaves identically.
    expect(props.snippet).toBe('');
  });

  test('excludes the html block from text/snippet when a plain block is also present', ({ expect }) => {
    const message = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Bob', email: 'bob@example.com' },
      blocks: [
        { _tag: 'text' as const, text: '<html><body>xmlns charset</body></html>', mimeType: 'text/html' },
        { _tag: 'text' as const, text: 'Plain body text', mimeType: 'text/plain' },
      ],
      properties: { subject: 'Hi' },
    });
    const props = getMessageProps(message);
    expect(props.text).toBe('Plain body text');
    expect(props.snippet).toBe('Plain body text');
  });
});

describe('getMessageBodyText', () => {
  test('prefers a text/markdown block over text/plain', ({ expect }) => {
    const message = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Bob', email: 'bob@example.com' },
      blocks: [
        { _tag: 'text' as const, text: 'Plain version', mimeType: 'text/plain' },
        { _tag: 'text' as const, text: 'Markdown version', mimeType: 'text/markdown' },
      ],
      properties: { subject: 'Hi' },
    });
    expect(getMessageBodyText(message)).toBe('Markdown version');
  });

  test('excludes a text/html block, falling back to text/plain', ({ expect }) => {
    const message = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Bob', email: 'bob@example.com' },
      blocks: [
        { _tag: 'text' as const, text: '<span>htmlonlyterm</span>', mimeType: 'text/html' },
        { _tag: 'text' as const, text: 'Plain body', mimeType: 'text/plain' },
      ],
      properties: { subject: 'Hi' },
    });
    expect(getMessageBodyText(message)).toBe('Plain body');
  });

  test('returns empty string when the message has only an html block', ({ expect }) => {
    const message = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Bob', email: 'bob@example.com' },
      blocks: [{ _tag: 'text' as const, text: '<span>htmlonlyterm</span>', mimeType: 'text/html' }],
      properties: { subject: 'Hi' },
    });
    expect(getMessageBodyText(message)).toBe('');
  });

  test('returns empty string when there are no blocks', ({ expect }) => {
    const message = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Bob', email: 'bob@example.com' },
      blocks: [],
      properties: { subject: 'Hi' },
    });
    expect(getMessageBodyText(message)).toBe('');
  });
});

describe('messageMatchesQuery', () => {
  const message = Obj.make(Message.Message, {
    created: '2025-01-01T00:00:00.000Z',
    sender: { name: 'Bob', email: 'bob@example.com' },
    blocks: [
      { _tag: 'text' as const, text: '<span>htmlonlyterm</span>', mimeType: 'text/html' },
      { _tag: 'text' as const, text: 'Please review the attached invoice', mimeType: 'text/markdown' },
    ],
    properties: { subject: 'Quarterly report' },
  });

  test('matches a term present in the plain/markdown body', ({ expect }) => {
    expect(messageMatchesQuery(message, 'invoice')).toBe(true);
  });

  test('matches a term present only in the subject', ({ expect }) => {
    expect(messageMatchesQuery(message, 'quarterly')).toBe(true);
  });

  test('does not match a term that appears only in an html block', ({ expect }) => {
    expect(messageMatchesQuery(message, 'htmlonlyterm')).toBe(false);
  });

  test('matches the sender (from) name or email', ({ expect }) => {
    expect(messageMatchesQuery(message, 'bob')).toBe(true);
    expect(messageMatchesQuery(message, 'bob@example.com')).toBe(true);
  });

  test('matches the recipients (to/cc)', ({ expect }) => {
    const addressed = Obj.make(Message.Message, {
      created: '2025-01-01T00:00:00.000Z',
      sender: { name: 'Bob', email: 'bob@example.com' },
      blocks: [{ _tag: 'text' as const, text: 'Body', mimeType: 'text/markdown' }],
      properties: { subject: 'Hi', to: 'alice@example.com', cc: 'carol@example.com' },
    });
    expect(messageMatchesQuery(addressed, 'alice')).toBe(true);
    expect(messageMatchesQuery(addressed, 'carol@example.com')).toBe(true);
    expect(messageMatchesQuery(addressed, 'nobody')).toBe(false);
  });

  test('an empty query always matches', ({ expect }) => {
    expect(messageMatchesQuery(message, '')).toBe(true);
    expect(messageMatchesQuery(message, '   ')).toBe(true);
  });
});
