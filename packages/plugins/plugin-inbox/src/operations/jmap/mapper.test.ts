//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Person } from '@dxos/types';

import { Jmap } from '../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../constants';
import { InboxResolver } from '../../services';
import { mapEmail } from './mapper';

const makeJmapEmail = (overrides?: Partial<Jmap.Email>): Jmap.Email => ({
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
