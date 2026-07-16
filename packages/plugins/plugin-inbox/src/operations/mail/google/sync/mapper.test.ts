//
// Copyright 2025 DXOS.org
//

import { describe, it, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Entity, Type } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { Message } from '@dxos/types';

import { GoogleMail } from '../../../../apis';
import { Mailbox } from '../../../../types';
import { decodeBody, mapMessage } from '../mapper';

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

      const json = Entity.toJSON(result!.message) as any;

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

      const json = Entity.toJSON(result!.message) as any;

      // Simulate protobuf round-trip: undefined values in google.protobuf.Struct become null.
      if (json.sender.contact === undefined) {
        json.sender.contact = null;
      }

      // Strip internal ECHO keys so we can validate against the raw schema.
      const { '@type': _, '@meta': __, ...rawData } = json;

      // This reproduces the ParseError that QueueImpl hits during refresh:
      //   Schema.decodeUnknown rejects null for optional Ref<Person> (expects undefined).
      const decoded = Schema.decodeUnknownEither(Type.getSchema(Message.Message))(rawData);
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
      const properties = result!.message.properties;
      if (properties === undefined) {
        throw new Error('expected message properties');
      }
      expect(properties.snippet).toBe("It's a 'test' & \"quoted\"");
      expect(properties.subject).toBe("O'Reilly & co.");
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'synthesizes a markdown block from HTML when the message has no plaintext part',
    Effect.fnUntraced(function* ({ expect }) {
      const template = makeGmailMessage();
      const result = yield* mapMessage({
        ...template,
        payload: {
          ...template.payload,
          body: { size: 0 },
          parts: [
            {
              mimeType: 'text/html',
              body: { size: 32, data: Buffer.from('<p>Hello <strong>world</strong></p>').toString('base64') },
            },
          ],
        },
      });
      expect(result).toBeDefined();

      const textBlocks = result!.message.blocks.filter(
        (block): block is Extract<typeof block, { _tag: 'text' }> => block._tag === 'text',
      );
      const byType = (mimeType: string) => textBlocks.find((block) => block.mimeType === mimeType);

      // The raw html is kept and a markdown body is synthesized; no plaintext part was provided.
      expect(byType('text/html')?.text).toBe('<p>Hello <strong>world</strong></p>');
      expect(byType('text/plain')).toBeUndefined();
      expect(byType('text/markdown')?.text).toBe('Hello **world**');
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'treats a whitespace-only plaintext part as absent and synthesizes markdown from the HTML',
    Effect.fnUntraced(function* ({ expect }) {
      const template = makeGmailMessage();
      const result = yield* mapMessage({
        ...template,
        payload: {
          ...template.payload,
          body: { size: 0 },
          parts: [
            { mimeType: 'text/plain', body: { size: 3, data: Buffer.from('   ').toString('base64') } },
            {
              mimeType: 'text/html',
              body: { size: 18, data: Buffer.from('<p>Real body</p>').toString('base64') },
            },
          ],
        },
      });
      expect(result).toBeDefined();

      const textBlocks = result!.message.blocks.filter(
        (block): block is Extract<typeof block, { _tag: 'text' }> => block._tag === 'text',
      );
      // The blank plaintext part is dropped, not stored, and a markdown body is synthesized instead.
      expect(textBlocks.some((block) => block.mimeType === 'text/plain')).toBe(false);
      expect(textBlocks.find((block) => block.mimeType === 'text/markdown')?.text).toBe('Real body');
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'does not synthesize a markdown block when a plaintext part is present',
    Effect.fnUntraced(function* ({ expect }) {
      const template = makeGmailMessage();
      const result = yield* mapMessage({
        ...template,
        payload: {
          ...template.payload,
          body: { size: 0 },
          parts: [
            { mimeType: 'text/plain', body: { size: 11, data: Buffer.from('Hello world').toString('base64') } },
            {
              mimeType: 'text/html',
              body: { size: 16, data: Buffer.from('<p>Hello world</p>').toString('base64') },
            },
          ],
        },
      });
      expect(result).toBeDefined();

      const textBlocks = result!.message.blocks.filter(
        (block): block is Extract<typeof block, { _tag: 'text' }> => block._tag === 'text',
      );
      expect(textBlocks.some((block) => block.mimeType === 'text/markdown')).toBe(false);
      expect(textBlocks.some((block) => block.mimeType === 'text/plain')).toBe(true);
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'flags a no-reply sender and a List-Unsubscribe header so the message is not replyable',
    Effect.fnUntraced(function* ({ expect }) {
      const template = makeGmailMessage();
      const result = yield* mapMessage({
        ...template,
        payload: {
          ...template.payload,
          headers: [
            { name: 'From', value: 'Acme Billing <no-reply@acme.com>' },
            { name: 'Subject', value: 'Your invoice' },
            { name: 'List-Unsubscribe', value: '<https://acme.com/unsub?id=1>, <mailto:unsub@acme.com>' },
          ],
        },
      });
      expect(result).toBeDefined();
      const properties = result!.message.properties!;
      expect(properties.noReply).toBe(true);
      expect(properties.listUnsubscribe).toBe('<https://acme.com/unsub?id=1>, <mailto:unsub@acme.com>');
      expect(Mailbox.isReplyable(result!.message)).toBe(false);
    }, Effect.provide(InboxResolver.Mock())),
  );

  it.effect(
    'leaves a normal person-to-person message replyable (no bulk signals)',
    Effect.fnUntraced(function* ({ expect }) {
      const result = yield* mapMessage(makeGmailMessage());
      expect(result).toBeDefined();
      const properties = result!.message.properties!;
      expect(properties.noReply).toBeUndefined();
      expect(properties.listUnsubscribe).toBeUndefined();
      expect(Mailbox.isReplyable(result!.message)).toBe(true);
    }, Effect.provide(InboxResolver.Mock())),
  );
});

describe('decodeBody attachments', () => {
  test('collects a top-level attachment part', ({ expect }) => {
    const message = makeGmailMessage({
      payload: {
        headers: [{ name: 'From', value: 'Alice <alice@unknown.com>' }],
        parts: [
          { mimeType: 'text/plain', body: { size: 11, data: Buffer.from('Hello World').toString('base64') } },
          {
            mimeType: 'image/png',
            filename: 'photo.png',
            body: { size: 1234, attachmentId: 'att-1' },
          },
        ],
      },
    });
    const decoded = decodeBody(message);
    expect(decoded?.attachments).toEqual([
      { filename: 'photo.png', attachmentId: 'att-1', mimeType: 'image/png', size: 1234 },
    ]);
  });

  test('recurses into nested multipart parts to find attachments', ({ expect }) => {
    const message = makeGmailMessage({
      payload: {
        headers: [{ name: 'From', value: 'Alice <alice@unknown.com>' }],
        parts: [
          { mimeType: 'text/plain', body: { size: 11, data: Buffer.from('Hello World').toString('base64') } },
          {
            mimeType: 'multipart/mixed',
            body: { size: 0 },
            parts: [
              {
                mimeType: 'application/pdf',
                filename: 'invoice.pdf',
                body: { size: 5678, attachmentId: 'att-2' },
              },
            ],
          },
        ],
      },
    });
    const decoded = decodeBody(message);
    expect(decoded?.attachments).toEqual([
      { filename: 'invoice.pdf', attachmentId: 'att-2', mimeType: 'application/pdf', size: 5678 },
    ]);
  });

  test('extracts and strips the Content-ID header for inline attachments', ({ expect }) => {
    const message = makeGmailMessage({
      payload: {
        headers: [{ name: 'From', value: 'Alice <alice@unknown.com>' }],
        parts: [
          { mimeType: 'text/plain', body: { size: 11, data: Buffer.from('Hello World').toString('base64') } },
          {
            mimeType: 'image/png',
            filename: 'signature.png',
            headers: [{ name: 'Content-ID', value: '<ii_mrcqn4871>' }],
            body: { size: 999, attachmentId: 'att-sig' },
          },
        ],
      },
    });
    const decoded = decodeBody(message);
    expect(decoded?.attachments).toEqual([
      {
        filename: 'signature.png',
        attachmentId: 'att-sig',
        mimeType: 'image/png',
        size: 999,
        contentId: 'ii_mrcqn4871',
      },
    ]);
  });

  test('ignores parts with no filename or attachmentId', ({ expect }) => {
    const message = makeGmailMessage({
      payload: {
        headers: [{ name: 'From', value: 'Alice <alice@unknown.com>' }],
        parts: [{ mimeType: 'text/plain', body: { size: 11, data: Buffer.from('Hello World').toString('base64') } }],
      },
    });
    const decoded = decodeBody(message);
    expect(decoded?.attachments).toEqual([]);
  });
});

describe('decodeBody nested multipart bodies', () => {
  test('finds text/html nested under a multipart/related wrapper (inline image), not just top-level parts', ({
    expect,
  }) => {
    // A reply with an inline signature image: Gmail wraps `multipart/alternative` (plain + html) and
    // the inline image inside a `multipart/related` container — the html/plain parts are one level
    // deeper than `payload.parts`, not at the top level.
    const message = makeGmailMessage({
      payload: {
        headers: [{ name: 'From', value: 'Alice <alice@unknown.com>' }],
        parts: [
          {
            mimeType: 'multipart/related',
            body: { size: 0 },
            parts: [
              {
                mimeType: 'multipart/alternative',
                body: { size: 0 },
                parts: [
                  { mimeType: 'text/plain', body: { size: 5, data: Buffer.from('Hello').toString('base64') } },
                  {
                    mimeType: 'text/html',
                    body: { size: 16, data: Buffer.from('<p>Hello</p>').toString('base64') },
                  },
                ],
              },
              {
                mimeType: 'image/png',
                filename: 'signature.png',
                body: { size: 999, attachmentId: 'att-sig' },
              },
            ],
          },
        ],
      },
    });
    const decoded = decodeBody(message);
    expect(decoded?.plain).toBe('Hello');
    expect(decoded?.html).toBe('<p>Hello</p>');
    expect(decoded?.attachments).toEqual([
      { filename: 'signature.png', attachmentId: 'att-sig', mimeType: 'image/png', size: 999 },
    ]);
  });

  test('drops (and logs) a message whose body cannot be found anywhere in the part tree', ({ expect }) => {
    const message = makeGmailMessage({
      payload: {
        headers: [{ name: 'From', value: 'Alice <alice@unknown.com>' }],
        parts: [
          {
            mimeType: 'application/pdf',
            filename: 'invoice.pdf',
            body: { size: 100, attachmentId: 'att-only' },
          },
        ],
      },
    });
    expect(decodeBody(message)).toBeNull();
  });
});

describe('GoogleMail.Message schema', () => {
  test('decodes a real response missing labelIds (not every message has one)', ({ expect }) => {
    const raw: unknown = {
      id: 'msg-001',
      threadId: 'thread-001',
      // `labelIds` intentionally omitted — the Gmail API does not always include it.
      snippet: 'Test email snippet',
      internalDate: String(Date.now()),
      payload: {
        headers: [{ name: 'From', value: 'Alice <alice@unknown.com>' }],
        body: { size: 11, data: Buffer.from('Hello World').toString('base64') },
      },
    };
    const decoded = Schema.decodeUnknownEither(GoogleMail.Message)(raw);
    expect(decoded._tag).toBe('Right');
    expect(decoded._tag === 'Right' && decoded.right.labelIds).toBeUndefined();
  });
});
