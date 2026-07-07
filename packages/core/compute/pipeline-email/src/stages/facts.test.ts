//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { EMAIL_EXTRACTION_RULES, messageSource, messageToDocument } from './facts';

describe('messageToDocument', () => {
  test('maps a Message onto an ExtractDocument', ({ expect }) => {
    const message = Message.make({
      created: '2001-05-14T10:00:00.000Z',
      sender: { email: 'alice@enron.com' },
      blocks: [{ _tag: 'text', text: 'Please send the Q2 report by Friday.' }],
      properties: { messageId: '<m-1@enron.com>', subject: 'Q2 report' },
    });

    const doc = messageToDocument(message);
    expect(doc.text).toBe('Please send the Q2 report by Friday.');
    expect(doc.source).toBe('<m-1@enron.com>');
    expect(doc.author).toBe('alice@enron.com');
    expect(doc.date).toBe('2001-05-14T10:00:00.000Z');
  });

  test('messageSource falls back to sender+created when no messageId', ({ expect }) => {
    const message = Message.make({
      created: '2001-05-14T10:00:00.000Z',
      sender: { email: 'bob@enron.com' },
      blocks: [{ _tag: 'text', text: 'hi' }],
    });
    expect(messageSource(message)).toBe('bob@enron.com:2001-05-14T10:00:00.000Z');
  });

  test('email rules extend the base rules with email-specific guidance', ({ expect }) => {
    expect(EMAIL_EXTRACTION_RULES.length).toBeGreaterThan(0);
    expect(EMAIL_EXTRACTION_RULES.some((rule) => /commitment|deadline|action/i.test(rule))).toBe(true);
  });
});
