//
// Copyright 2026 DXOS.org
//

import { describe, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { Person } from '@dxos/types';

import { JmapMail } from '../../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../../constants';
import { decodeBody, mapEmail } from '../mapper';

const makeJmapEmail = (overrides?: Partial<JmapMail.Email>): JmapMail.Email => ({
  id: 'email-001',
  threadId: 'thread-001',
  mailboxIds: { 'mb-inbox': true },
  keywords: { $seen: true },
  from: [{ name: 'Alice', email: 'alice@unknown.com' }],
  to: [{ name: null, email: 'bob@example.com' }],
  cc: [{ name: 'Carol', email: 'carol@example.com' }],
  subject: 'Test Subject',
  receivedAt: '2026-01-15T10:00:00.000Z',
  preview: 'Hello World preview',
  messageId: ['<msg-001@unknown.com>'],
  inReplyTo: ['<parent-001@unknown.com>'],
  references: ['<ref-1@x.com>', '<ref-2@x.com>'],
  bodyValues: { body: { value: 'Hello World' } },
  textBody: [{ partId: 'body', type: 'text/plain' }],
  ...overrides,
});

describe('mapEmail', () => {
  it.effect(
    'maps a JMAP email to a Message with structured fields and the JMAP foreign key',
    Effect.fnUntraced(function* ({ expect }) {
      const result = yield* mapEmail(makeJmapEmail());
      if (!result) {
        throw new Error('expected a mapped message');
      }
      const message = result.message;

      expect(message.created).toBe('2026-01-15T10:00:00.000Z');
      expect(message.sender.email).toBe('alice@unknown.com');
      expect(message.sender.name).toBe('Alice');

      const properties = message.properties;
      if (properties === undefined) {
        throw new Error('expected message properties');
      }
      expect(properties.subject).toBe('Test Subject');
      expect(properties.snippet).toBe('Hello World preview');
      expect(properties.messageId).toBe('<msg-001@unknown.com>');
      expect(properties.inReplyTo).toBe('<parent-001@unknown.com>');
      expect(properties.references).toBe('<ref-1@x.com> <ref-2@x.com>');
      expect(properties.to).toBe('bob@example.com');
      expect(properties.cc).toBe('Carol <carol@example.com>');

      const block = message.blocks[0];
      if (block?._tag !== 'text') {
        throw new Error('expected a text block');
      }
      expect(block.text).toContain('Hello World');

      const foreignId = Obj.getMeta(message).keys.find((key) => key.source === JMAP_MESSAGE_SOURCE)?.id;
      expect(foreignId).toBe('email-001');

      expect(result.mailboxIds).toEqual(['mb-inbox']);
      // Active keywords are surfaced verbatim; the provider maps them onto canonical system tags.
      expect(result.keywords).toEqual(['$seen']);
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'omits sender.contact entirely when no contact resolves',
    Effect.fnUntraced(function* ({ expect }) {
      const result = yield* mapEmail(makeJmapEmail());
      if (!result) {
        throw new Error('expected a mapped message');
      }

      // An explicit `contact: undefined` round-trips to `null` (protobuf Struct) and fails Message
      // schema validation on queue load; the key must be absent, not undefined.
      expect('contact' in result.message.sender).toBe(false);
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'returns null when the email has no sender or no body',
    Effect.fnUntraced(function* ({ expect }) {
      const noSender = yield* mapEmail(makeJmapEmail({ from: null }));
      expect(noSender).toBeNull();

      const noBody = yield* mapEmail(makeJmapEmail({ bodyValues: undefined, textBody: undefined }));
      expect(noBody).toBeNull();
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'resolves the sender contact when the resolver finds a Person',
    Effect.fnUntraced(
      function* ({ expect }) {
        const result = yield* mapEmail(makeJmapEmail());
        if (!result) {
          throw new Error('expected a mapped message');
        }
        expect('contact' in result.message.sender).toBe(true);
      },
      Effect.provide(
        InboxResolver.Mock({
          people: [Obj.make(Person.Person, { emails: [{ value: 'alice@unknown.com' }] })],
        }),
      ),
    ),
  );
});

describe('decodeBody attachments', () => {
  test('collects attachment metadata from Email.attachments', ({ expect }) => {
    const email = makeJmapEmail({
      attachments: [
        { blobId: 'blob-1', name: 'photo.png', type: 'image/png', size: 1234 },
        { partId: 'body-2', type: 'text/plain' }, // a body part with no blobId can't be downloaded.
      ],
    });
    const decoded = decodeBody(email);
    expect(decoded?.attachments).toEqual([{ blobId: 'blob-1', name: 'photo.png', mimeType: 'image/png', size: 1234 }]);
  });

  test('is empty when the email has no attachments', ({ expect }) => {
    const decoded = decodeBody(makeJmapEmail());
    expect(decoded?.attachments).toEqual([]);
  });

  test('extracts a Content-ID for inline attachments, stripping enclosing angle brackets if present', ({ expect }) => {
    const email = makeJmapEmail({
      attachments: [
        { blobId: 'blob-1', name: 'signature.png', type: 'image/png', size: 999, cid: '<ii_mrcqn4871>' },
        { blobId: 'blob-2', name: 'bare-cid.png', type: 'image/png', size: 111, cid: 'bare-id' },
      ],
    });
    const decoded = decodeBody(email);
    expect(decoded?.attachments).toEqual([
      { blobId: 'blob-1', name: 'signature.png', mimeType: 'image/png', size: 999, contentId: 'ii_mrcqn4871' },
      { blobId: 'blob-2', name: 'bare-cid.png', mimeType: 'image/png', size: 111, contentId: 'bare-id' },
    ]);
  });
});
