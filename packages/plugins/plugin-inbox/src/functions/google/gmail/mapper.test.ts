//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Entity } from '@dxos/echo';
import { Message } from '@dxos/types';

import { type GoogleMail } from '../../apis';
import * as InboxResolver from '../../inbox-resolver';

import { mapMessage } from './mapper';

const makeGmailMessage = (overrides?: Partial<GoogleMail.Message>): GoogleMail.Message => ({
  id: 'msg-001',
  threadId: 'thread-001',
  labelIds: ['INBOX'],
  snippet: 'Test email snippet',
  internalDate: String(Date.now()),
  payload: {
    headers: [
      { name: 'From', value: 'Alice <alice@unknown.com>' },
      { name: 'Subject', value: 'Test Subject' },
      { name: 'To', value: 'bob@example.com' },
    ],
    body: {
      size: 11,
      data: Buffer.from('Hello World').toString('base64'),
    },
  },
  ...overrides,
});

describe('mapMessage', () => {
  it.effect(
    'serialized sender should not have contact key when no contact is resolved',
    Effect.fnUntraced(function* ({ expect }) {
      const result = yield* mapMessage(makeGmailMessage());
      expect(result).toBeDefined();

      const json = Entity.toJSON(result!) as any;

      // When no contact is resolved, the contact key should be absent from the serialized sender.
      // Having an explicit `contact: undefined` causes protobuf (google.protobuf.Struct)
      // to encode it as `null`, which then fails Schema.decodeUnknown on queue load.
      expect('contact' in json.sender).toBe(false);
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'null sender.contact fails Message schema validation (reproduces queue load ParseError)',
    Effect.fnUntraced(function* ({ expect }) {
      const result = yield* mapMessage(makeGmailMessage());
      expect(result).toBeDefined();

      const json = Entity.toJSON(result!) as any;

      // Simulate protobuf round-trip: undefined values in google.protobuf.Struct become null.
      if (json.sender.contact === undefined) {
        json.sender.contact = null;
      }

      // Strip internal ECHO keys so we can validate against the raw schema.
      const { '@type': _, '@meta': __, ...rawData } = json;

      // This reproduces the ParseError that QueueImpl hits during refresh:
      //   Schema.decodeUnknown rejects null for optional Ref<Person> (expects undefined).
      const decoded = Schema.decodeUnknownEither(Message.Message)(rawData);
      expect(decoded._tag).toBe('Left');
    }, Effect.provide(InboxResolver.Mock())),
  );
});
