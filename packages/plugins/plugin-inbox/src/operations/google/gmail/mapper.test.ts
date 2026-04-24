//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Entity } from '@dxos/echo';
import { Message } from '@dxos/types';

import { type GoogleMail } from '../../../apis';
import { InboxResolver } from '../../../services';
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

  it.effect(
    'snippet and subject decode HTML entities from Gmail text',
    Effect.fnUntraced(function* ({ expect }) {
      const template = makeGmailMessage();
      const result = yield* mapMessage({
        ...template,
        snippet: 'It&#39;s a &#x27;test&#x27; &amp; &quot;quoted&quot;',
        payload: {
          ...template.payload,
          headers: [
            { name: 'From', value: 'Alice <alice@unknown.com>' },
            { name: 'Subject', value: 'O&#39;Reilly &amp; co.' },
            { name: 'To', value: 'bob@example.com' },
          ],
          body: template.payload.body,
        },
      });
      expect(result).toBeDefined();
      const properties = result!.properties;
      if (properties === undefined) {
        throw new Error('expected message properties');
      }
      expect(properties.snippet).toBe("It's a 'test' & \"quoted\"");
      expect(properties.subject).toBe("O'Reilly & co.");
    }, Effect.provide(InboxResolver.Mock())),
  );
});
